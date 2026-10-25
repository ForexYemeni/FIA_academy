'use client'

/**
 * ============================================================================
 * 👑✨ FiaFabHub — مركز الأدوات العائم الفاخر (v10.5)
 * ============================================================================
 * بدلاً من 4 أزرار عائمة متناثرة أسفل الشاشة (الوضع الليلي + الدردشة +
 * الدعم السريع + إعلانات الإدارة) — زر مركزي واحد أنيق، وعند الضغط عليه
 * تنبثق منه أيقونات دائرية فاخرة بحركة متدرجة:
 *   الدعم السريع ← الدردشة ← إعلانات الإدارة ← تواصل معنا ← الوضع الليلي
 * • لا يمس أي منطق مصادقة أو إشعارات — طبقة عرض مستقلة تماماً
 * • التواصل مع الأدوات الأخرى عبر أحداث نافذة مخصصة (fia-fab:*)
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LifeBuoy, MessageCircle, Mail, Moon, Sun, Plus, BellRing, Library,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'

const THEME_KEY = 'fia-theme'

function applyTheme(mode: 'dark' | 'light', animate: boolean) {
  const root = document.documentElement
  if (animate) {
    root.classList.add('theme-transitioning')
    window.setTimeout(() => root.classList.remove('theme-transitioning'), 500)
  }
  if (mode === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

// قراءة خفيفة لإعدادات الموقع — لمعرفة إن وُجدت إعلانات إدارة + قراءة آخر إعلان
function useFabSettings() {
  const [settings, setSettings] = useState<any>(null)
  useEffect(() => {
    let alive = true
    fetch('/api/site-settings')
      .then((r) => r.json())
      .then((d) => { if (alive) setSettings(d || {}) })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  return settings
}

interface FabItem {
  id: string
  label: string
  icon: any
  grad: string
  ring: string
  show: boolean
  badge?: boolean
  action: () => void
}

export function FiaFabHub() {
  const router = useRouter()
  const user = useAuth((s) => s.user)
  const settings = useFabSettings()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'dark' | 'light' | null>(null)
  const [announceNew, setAnnounceNew] = useState(false)
  // 👑 v10.6 — هل نحن داخل التطبيق الأصلي؟ (جسر FiaApp = APK v2.9.0+)
  // تظهر أداة «مكتبتي» فقط حينها — الدروس المحفوظة دون إنترنت
  const [nativeBridge, setNativeBridge] = useState(false)
  useEffect(() => {
    try { setNativeBridge(!!(window as any).FiaApp?.openLibrary) } catch {}
  }, [])

  // مزامنة الوضع الليلي مع سكربت التهيئة
  useEffect(() => {
    try {
      const t = (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark'
      setMode(t)
    } catch { setMode('dark') }
  }, [])

  // هل هناك إعلان إدارة جديد لم يُقرأ؟ (نفس مفتاح القراءة الذي تستخدمه البطاقة)
  useEffect(() => {
    try {
      const raw = settings?.admin_announcements
      if (!raw) { setAnnounceNew(false); return }
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
      const list = Array.isArray(arr) ? arr.filter((a: any) => a && a.active !== false && String(a.text || '').trim()) : []
      const latest = list[0]
      if (!latest) { setAnnounceNew(false); return }
      setAnnounceNew(localStorage.getItem('fia-royal-msg-read') !== String(latest.id))
    } catch { setAnnounceNew(false) }
  }, [settings])

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = (prev === 'light' ? 'dark' : 'light') as 'dark' | 'light'
      try { localStorage.setItem(THEME_KEY, next) } catch {}
      applyTheme(next, true)
      return next
    })
  }, [])

  const dispatch = useCallback((name: string) => {
    window.dispatchEvent(new CustomEvent(name))
  }, [])

  const items = useMemo<FabItem[]>(() => {
    return [
      {
        id: 'support', label: 'الدعم السريع', icon: LifeBuoy,
        grad: 'from-emerald-500 to-teal-600', ring: 'shadow-[0_0_22px_-4px_rgba(16,185,129,0.55)]',
        show: true, action: () => dispatch('fia-fab:support'),
      },
      {
        id: 'chat', label: 'الدردشة', icon: MessageCircle,
        grad: 'from-sky-500 to-blue-600', ring: 'shadow-[0_0_22px_-4px_rgba(14,165,233,0.55)]',
        show: !!user, action: () => dispatch('fia-fab:chat'),
      },
      {
        id: 'announce', label: 'إعلانات الإدارة', icon: BellRing,
        grad: 'from-gold to-amber-500', ring: 'shadow-[0_0_22px_-4px_rgba(212,175,55,0.6)]',
        show: true, badge: announceNew, action: () => dispatch('fia-fab:announce'),
      },
      {
        id: 'contact', label: 'تواصل معنا', icon: Mail,
        grad: 'from-purple-500 to-fuchsia-600', ring: 'shadow-[0_0_22px_-4px_rgba(168,85,247,0.55)]',
        show: true, action: () => router.push('/contact'),
      },
      {
        // 👑 v10.6 — مكتبتي: الدروس المحفوظة دون إنترنت (داخل التطبيق الأصلي فقط — APK v2.9.0+)
        id: 'library', label: 'مكتبتي دون إنترنت', icon: Library,
        grad: 'from-amber-500 to-orange-600', ring: 'shadow-[0_0_22px_-4px_rgba(245,158,11,0.55)]',
        show: !!nativeBridge, action: () => {
          try { (window as any).FiaApp?.openLibrary() } catch {}
        },
      },
      {
        id: 'theme', label: mode === 'light' ? 'الوضع الليلي' : 'الوضع النهاري', icon: mode === 'light' ? Moon : Sun,
        grad: 'from-navy via-navy-light to-navy', ring: 'ring-2 ring-gold/40',
        show: true, action: toggleTheme,
      },
    ].filter((i) => i.show)
  }, [user, mode, announceNew, dispatch, router, toggleTheme, nativeBridge])

  // Escape يغلق المركز
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const isDark = mode !== 'light'

  return (
    <>
      {/* ستارة خافتة تُغلق بالنقر */}
      {open && (
        <div
          className="fixed inset-0 z-[58] bg-navy/25 backdrop-blur-[2px] transition-opacity"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* الأيقونات الدائرية المنبثقة — عمود قوسي فوق الزر المركزي */}
      <div className="fixed bottom-[88px] left-6 z-[59] flex flex-col-reverse items-center gap-2.5" dir="rtl">
        {items.map((item, idx) => {
          const Icon = item.icon
          const active = open
          return (
            <div key={item.id} className="relative flex items-center gap-2.5" style={{ flexDirection: 'row' }}>
              {/* بطاقة الاسم — تظهر بجانب الأيقونة عند الفتح */}
              <span
                className={`whitespace-nowrap rounded-full border border-gold/35 bg-white/95 px-3 py-1 text-[11px] font-extrabold text-navy shadow-lg transition-all duration-300 ${
                  active ? 'opacity-100 translate-x-0' : 'pointer-events-none opacity-0 translate-x-2'
                }`}
                style={{ transitionDelay: `${active ? 60 + idx * 45 : 0}ms` }}
              >
                {item.label}
              </span>
              <button
                onClick={() => { setOpen(false); item.action() }}
                aria-label={item.label}
                title={item.label}
                className={`relative w-11 h-11 rounded-full bg-gradient-to-br ${item.grad} ${item.ring} text-white shadow-xl flex items-center justify-center border border-white/25 transition-all duration-300 ${
                  active ? 'opacity-100 scale-100 translate-y-0' : 'pointer-events-none opacity-0 scale-[0.4] translate-y-3'
                } hover:scale-110 active:scale-95`}
                style={{ transitionDelay: `${active ? idx * 45 : 0}ms` }}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
                {item.badge && active && (
                  <span className="absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* الزر المركزي الوحيد */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'إغلاق مركز الأدوات' : 'فتح مركز الأدوات'}
        aria-expanded={open}
        className="fixed bottom-6 left-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-[0_10px_34px_-6px_rgba(11,22,53,0.55),0_0_28px_-6px_rgba(212,175,55,0.5)] flex items-center justify-center ring-2 ring-gold/40 hover:ring-gold/70 transition-all duration-300 hover:scale-105 active:scale-95"
      >
        {/* هالة نابضة أنيقة */}
        <span aria-hidden className="absolute inset-0 rounded-full bg-gold/10 animate-pulse" style={{ animationDuration: '3.5s' }} />
        <Plus
          className={`relative w-6 h-6 transition-transform duration-300 ${open ? 'rotate-[135deg]' : ''}`}
          strokeWidth={2.4}
        />
        {/* شارة إعلان غير مقروء على المركز نفسه */}
        {announceNew && !open && (
          <span className="absolute -top-0.5 -left-0.5 flex">
            <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-60 animate-ping" />
            <span className="relative w-3.5 h-3.5 rounded-full bg-gradient-to-br from-gold to-amber-500 border-2 border-white shadow-sm" />
          </span>
        )}
        {/* نقطة الوضع الحالي — تظهر فقط في الوضع النهاري */}
        {!isDark && !open && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-300 border-2 border-white shadow-sm" aria-hidden />
        )}
      </button>
    </>
  )
}

export default FiaFabHub

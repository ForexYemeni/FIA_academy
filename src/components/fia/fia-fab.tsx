'use client'

/**
 * ============================================================================
 * 👑✨ FiaFabHub — مركز الأدوات العائم الفاخر (v10.18)
 * ============================================================================
 * زر مركزي واحد (+) يسار الشاشة، وعند الضغط عليه تنبثق لوحة شبكية زجاجية
 * فاخرة فوق الزر مباشرة — كل الأدوات داخلها صفوفاً مرتّبة:
 *   الدعم السريع ← الدردشة ← إعلانات الإدارة ← مشاركة التطبيق ← تواصل معنا ← الوضع
 * 🚫 v10.18 — إصلاحات جذرية:
 *   1) «إعلانات الإدارة» كانت تظهر حتى مع إطفاء الزاوية: تبعية settings
 *      كانت مفقودة من useMemo — أُصلحت، والأيقونة تختفي فوراً عند الإطفاء.
 *   2) أيقونات منبثقة عمودية كانت تتداخل مع محتوى الصفحات — صارت لوحة
 *      واحدة محكمة (شبكة 2×N بشارّة ذهبية) لا تلمس شيئاً خلفها أبداً.
 *   3) جلب الإعدادات أصبح مشتركاً مُخزّناً (useSiteSettings) بدل طلب مستقل
 *      لكل تركيب — طلب واحد لكل الصفحات كل 60 ثانية (أداء أوضح).
 *   4) النقر على «إعلانات الإدارة» بلا إعلانات يُظهر رسالة راقية بدل الصمت.
 * • لا يمس أي منطق مصادقة أو إشعارات — طبقة عرض مستقلة تماماً
 * • التواصل مع الأدوات الأخرى عبر أحداث نافذة مخصصة (fia-fab:*)
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LifeBuoy, MessageCircle, Mail, Moon, Sun, Plus, BellRing, Share2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
import { useSiteSettings, readFiaAnnouncements } from '@/components/fia/lux-experience'
import { toast } from 'sonner'

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

interface FabItem {
  id: string
  label: string
  icon: any
  grad: string
  show: boolean
  badge?: boolean
  action: () => void
}

export function FiaFabHub() {
  const router = useRouter()
  const user = useAuth((s) => s.user)
  // 👑 v10.18 — إعدادات مشتركة مُخزّنة (طلب واحد لكل التطبيق) + تحديث حي
  const settings = useSiteSettings()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'dark' | 'light' | null>(null)
  const [announceNew, setAnnounceNew] = useState(false)
  // 👑 v10.17 — رصد الثنائية الأصلية: داخل التطبيق (APK) يوجد زر مشاركة أصلي،
  // فتُخفى مشاركة المركز العائم لتبقى أيقونة مشاركة واحدة فقط (إصلاح التكرار).
  const [isNativeApp, setIsNativeApp] = useState(false)
  useEffect(() => {
    try { setIsNativeApp(!!(window as any)?.FIANativeBridge) } catch {}
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
      const list = readFiaAnnouncements(settings)
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
    // 👑 v10.18 — الزاوية الإدارية مطفأة → أداتها تختفي من المركز فوراً
    // (تبعية settings داخل الـ useMemo الآن صحيحة)
    const cornerOn = settings?.admin_corner_enabled !== false
    const hasAnnouncements = cornerOn && readFiaAnnouncements(settings).length > 0
    return [
      {
        id: 'support', label: 'الدعم السريع', icon: LifeBuoy,
        grad: 'from-emerald-500 to-teal-600',
        show: true, action: () => dispatch('fia-fab:support'),
      },
      {
        id: 'chat', label: 'الدردشة', icon: MessageCircle,
        grad: 'from-sky-500 to-blue-600',
        show: !!user, action: () => dispatch('fia-fab:chat'),
      },
      {
        id: 'announce', label: 'إعلانات الإدارة', icon: BellRing,
        grad: 'from-gold to-amber-500',
        show: cornerOn, badge: announceNew,
        action: () => {
          // 👑 v10.18 — لا انفجار TDZ ولا صمت: رسالة راقية إن لم توجد إعلانات
          if (!hasAnnouncements) {
            toast('لا توجد إعلانات جديدة حالياً', { description: 'ستظهر إعلانات الإدارة هنا فور صدورها' })
            return
          }
          dispatch('fia-fab:announce')
        },
      },
      {
        id: 'share', label: 'مشاركة التطبيق', icon: Share2,
        grad: 'from-violet-500 to-purple-600',
        show: !isNativeApp,
        action: () => {
          try {
            const bridge = (window as any)?.FIANativeBridge
            if (bridge && typeof bridge.shareApp === 'function') { bridge.shareApp(); return }
          } catch {}
          const shareData = {
            title: 'أكاديمية المستقبل الدولية',
            text: '👑 حمّل تطبيق أكاديمية المستقبل الدولية — تعلّم بأسلوب احترافي',
            url: 'https://fiaacademy.vercel.app/download',
          }
          if (typeof navigator !== 'undefined' && (navigator as any).share) {
            (navigator as any).share(shareData).catch(() => {})
          } else {
            try { navigator.clipboard?.writeText(shareData.url) } catch {}
            toast.success('🔗 تم نسخ رابط التطبيق — شاركه بفخر!')
          }
        },
      },
      {
        id: 'contact', label: 'تواصل معنا', icon: Mail,
        grad: 'from-purple-500 to-fuchsia-600',
        show: true, action: () => router.push('/contact'),
      },
      {
        id: 'theme', label: mode === 'light' ? 'الوضع الليلي' : 'الوضع النهاري', icon: mode === 'light' ? Moon : Sun,
        grad: 'from-navy via-navy-light to-navy',
        show: true, action: toggleTheme,
      },
    ].filter((i) => i.show)
  }, [user, mode, announceNew, settings, isNativeApp, dispatch, router, toggleTheme])

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
          className="fixed inset-0 z-[58] bg-navy/30 backdrop-blur-[2px] transition-opacity"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* 👑 v10.18 — لوحة الأدوات الفاخرة: شبكة زجاجية محكمة فوق الزر مباشرة
          — كل الأدوات «داخل» مركز + حرفياً وبلا أي تداخل مع الصفحات */}
      <div
        className={`fixed bottom-[92px] left-4 sm:left-6 z-[59] w-[min(320px,calc(100vw-2rem))] origin-bottom-left rounded-3xl border border-gold/35 bg-gradient-to-b from-[#0d2452]/97 via-[#0A1F44]/97 to-[#071838]/97 shadow-[0_24px_70px_-18px_rgba(0,0,0,0.75),0_0_40px_-12px_rgba(212,175,55,0.4)] backdrop-blur-xl transition-all duration-300 ${
          open ? 'opacity-100 scale-100 translate-y-0' : 'pointer-events-none opacity-0 scale-90 translate-y-3'
        }`}
        dir="rtl"
        role="menu"
        aria-hidden={!open}
      >
        {/* ترويسة راقية رفيعة */}
        <div className="relative px-4 pt-3.5 pb-2.5 overflow-hidden rounded-t-3xl">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 15% 50%, #D4AF37 1.2px, transparent 1.2px)', backgroundSize: '18px 18px',
          }} />
          <div className="relative flex items-center gap-2">
            <span className="w-1.5 h-1.5 rotate-45 bg-gold shadow-[0_0_8px_rgba(212,175,55,0.7)]" />
            <span className="text-[11px] font-black tracking-[0.14em] text-gold/90">مركز الأدوات السريع</span>
            <span className="h-px flex-1 bg-gradient-to-l from-gold/30 via-gold/10 to-transparent" />
          </div>
        </div>

        {/* الشبكة الملكية — 2 أعمدة × صفوف */}
        <div className="grid grid-cols-2 gap-2 px-3 pb-3.5">
          {items.map((item, idx) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => { setOpen(false); item.action() }}
                role="menuitem"
                aria-label={item.label}
                title={item.label}
                className={`group relative flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 text-right transition-all duration-300 hover:border-gold/45 hover:bg-gold/[0.09] active:scale-[0.96] ${
                  open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
                style={{ transitionDelay: `${open ? 40 + idx * 35 : 0}ms` }}
              >
                <span className={`relative flex w-10 h-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.grad} shadow-md ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="w-[18px] h-[18px] text-white" strokeWidth={2.2} />
                  {item.badge && (
                    <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-red-500 border-2 border-[#0A1F44] animate-pulse" />
                  )}
                </span>
                <span className="flex-1 min-w-0 text-[12px] font-extrabold leading-snug text-white/90 group-hover:text-gold transition-colors">
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* الزر المركزي الوحيد */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'إغلاق مركز الأدوات' : 'فتح مركز الأدوات'}
        aria-expanded={open}
        className="fixed bottom-6 left-4 sm:left-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-[0_10px_34px_-6px_rgba(11,22,53,0.55),0_0_28px_-6px_rgba(212,175,55,0.5)] flex items-center justify-center ring-2 ring-gold/40 hover:ring-gold/70 transition-all duration-300 hover:scale-105 active:scale-95"
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

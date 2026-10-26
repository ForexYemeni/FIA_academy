'use client'

/**
 * ============================================================================
 * 👑✨ FiaFabHub — مركز الأدوات العائم الدائري الفاخر (v10.19)
 * ============================================================================
 * زر مركزي واحد (+) يسار الشاشة، وعند الضغط عليه **تنبثق الأدوات دائرياً**
 * حول الزر على قوس فاخر — كل أداة دائرة زجاجية مستقلة تحمل تسميتها:
 *   الدعم السريع ← الدردشة ← مشاركة التطبيق ← تواصل معنا ← الوضع
 * 👑 v10.19 — إعادة تصميم جذرية بأمر المالك:
 *   1) اللوحة الشبكية السابقة «سيئة وغير مناسبة» — استُبدلت بقوس دائري
 *      حقيقي (Radial Fan) تفُتح عناصره بالتسلسل حول زر + كأنها ساعة فاخرة.
 *   2) أيقونة المشاركة تعود داخل المركز **دائماً** (حتى داخل التطبيق) —
 *      داخل APK تستدعي FIANativeBridge.shareApp (نظام المشاركة الأصلي)،
 *      وفي المتصفح navigator.share أو نسخ الرابط.
 *   3) «إعلانات الإدارة» حُذفت كلياً مع حذف زاوية الإدارة نفسها (v10.19).
 *   4) جلب الإعدادات مشترك مُخزّن (useSiteSettings) — طلب واحد لكل التطبيق.
 * • لا يمس أي منطق مصادقة أو إشعارات — طبقة عرض مستقلة تماماً
 * • التواصل مع الأدوات الأخرى عبر أحداث نافذة مخصصة (fia-fab:*)
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LifeBuoy, MessageCircle, Mail, Moon, Sun, Plus, Share2,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-store'
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
  action: () => void
}

/** نصف قطر القوس الدائري — يتقلص قليلاً على أصغر الشاشات */
const ARC_RADIUS = 'min(150px, 38vw)'

export function FiaFabHub() {
  const router = useRouter()
  const user = useAuth((s) => s.user)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'dark' | 'light' | null>(null)

  // مزامنة الوضع الليلي مع سكربت التهيئة
  useEffect(() => {
    try {
      const t = (localStorage.getItem(THEME_KEY) as 'dark' | 'light') || 'dark'
      setMode(t)
    } catch { setMode('dark') }
  }, [])

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

  // 👑 v10.19 — المشاركة دائماً داخل المركز: جسر أصلي في APK وإلا المشاركة
  // الأصلية للمتصفح وإلا نسخ الرابط — لا تكرار مع أي زر آخر بعد الآن.
  const shareNow = useCallback(() => {
    try {
      const bridge = (window as any)?.FIANativeBridge
      if (bridge && typeof bridge.shareApp === 'function') { bridge.shareApp(); return }
    } catch {}
    const shareData = {
      title: 'أكاديمية المستقبل الدولية',
      text: '👑 حمّل تطبيق أكاديمية المستقبل الدولية — تعلّم بأسلوب احترافي',
      url: 'https://fiaacademy.vercel.app/download',
    }
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        (navigator as any).share(shareData).catch(() => {})
        return
      }
    } catch {}
    try { navigator.clipboard?.writeText(shareData.url) } catch {}
    toast.success('🔗 تم نسخ رابط التطبيق — شاركه بفخر!')
  }, [])

  const items = useMemo<FabItem[]>(() => {
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
        id: 'share', label: 'مشاركة التطبيق', icon: Share2,
        grad: 'from-violet-500 to-purple-600',
        show: true, action: shareNow,
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
  }, [user, mode, dispatch, router, toggleTheme, shareNow])

  // Escape يغلق المركز
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const isDark = mode !== 'light'
  const count = items.length

  // 👑 القوس الدائري: العناصر موزعة على ربع دائرة من «أعلى» (90°) إلى «اليمين» (0°)
  // — الزر في الزاوية السفلية-اليسرى فالقوس ينبسط فوقه ناحية اليمين بسلاسة.
  // زاوية العنصر i (من الأعلى إلى اليمين): θ_i = 90 - i * step، بحيث step = 90/(n-1)
  const angleFor = (i: number) => (count <= 1 ? 90 : 90 - (i * 90) / (count - 1))

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

      {/* 👑 v10.19 — الأدوات الدائرية المنبثقة حول الزر على قوس ربع دائرة:
          كل أداة دائرة زجاجية فاخرة بتدرجها الخاص + تسمية ذهبية تحتها،
          تنبثق بالتسلسل من مركز الزر إلى موضعها على القوس */}
      <div
        className="fixed bottom-6 left-4 sm:left-6 z-[59] w-0 h-0"
        dir="rtl"
        role="menu"
        aria-hidden={!open}
      >
        {items.map((item, idx) => {
          const Icon = item.icon
          const angle = angleFor(idx)
          const rad = (angle * Math.PI) / 180
          // الإحداثيات من مركز الزر (28px = نصف قطر زر 56px):
          // x يميناً موجب، y أعلى موجب (نستخدم translate سالباً للأعلى)
          const x = Math.cos(rad) // 0..1 (يمين)
          const y = Math.sin(rad) // 0..1 (أعلى)
          return (
            <div
              key={item.id}
              className="absolute"
              style={{
                bottom: 0,
                left: 0,
                transform: open
                  ? `translate(calc(28px + ${x} * ${ARC_RADIUS} - 50%), calc(-28px - ${y} * ${ARC_RADIUS} - 50%)) scale(1)`
                  : 'translate(calc(28px - 50%), calc(-28px - 50%)) scale(0.2)',
                opacity: open ? 1 : 0,
                pointerEvents: open ? 'auto' : 'none',
                transition: `transform 420ms cubic-bezier(.2,1.35,.4,1) ${open ? 30 + idx * 55 : 0}ms, opacity 260ms ease ${open ? 30 + idx * 55 : 0}ms`,
              }}
            >
              <button
                onClick={() => { setOpen(false); item.action() }}
                role="menuitem"
                aria-label={item.label}
                title={item.label}
                className="group relative flex flex-col items-center gap-1.5 outline-none"
              >
                <span
                  className={`relative flex w-[52px] h-[52px] items-center justify-center rounded-full bg-gradient-to-br ${item.grad} shadow-[0_10px_26px_-8px_rgba(0,0,0,0.55)] ring-2 ring-gold/45 group-hover:ring-gold group-active:scale-90 transition-all duration-200`}
                >
                  {/* لمعة زجاجية علوية */}
                  <span aria-hidden className="absolute inset-[3px] rounded-full bg-gradient-to-b from-white/25 to-transparent opacity-70" />
                  <Icon className="relative w-[22px] h-[22px] text-white drop-shadow-sm" strokeWidth={2.3} />
                </span>
                <span className="whitespace-nowrap rounded-full border border-gold/40 bg-[#0A1F44]/92 px-2 py-[3px] text-[9.5px] font-black leading-none text-gold shadow-md backdrop-blur-md">
                  {item.label}
                </span>
              </button>
            </div>
          )
        })}
      </div>

      {/* الزر المركزي الوحيد — يلتف (+) إلى (×) عند الفتح */}
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
        {/* نقطة الوضع الحالي — تظهر فقط في الوضع النهاري */}
        {!isDark && !open && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-300 border-2 border-white shadow-sm" aria-hidden />
        )}
      </button>
    </>
  )
}

export default FiaFabHub

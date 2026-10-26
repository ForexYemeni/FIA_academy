'use client'

/**
 * ============================================================================
 * 👑✨ FiaFabHub — مركز الأدوات العائم الدائري الفاخر (v10.21)
 * ============================================================================
 * زر مركزي واحد (+) يسار الشاشة، وعند الضغط عليه **تنبثق الأدوات دائرياً**
 * حول الزر على قوس فاخر — كل أداة دائرة زجاجية مستقلة تحمل تسميتها:
 *   الدعم السريع ← الدردشة ← تواصل معنا ← الوضع
 * 👑 v10.21 — بأمر المالك:
 *   1) حُذفت أيقونة «مشاركة التطبيق» من مروحة الأدوات نهائياً — لم تعد تنبثق
 *      فوق زر +. المشاركة صارت **داخل زر + نفسه**: ضغطة مطولة 550ms = مشاركة.
 *   2) سلسلة المشاركة: جسر APK الأصلي ← navigator.share ← ورقة اجتماعية فاخرة
 *      (واتساب/تليجرام/فيسبوك/إكس/SMS/نسخ) — مواقع التواصل تظهر دائماً ولا
 *      يبقى النسخ الصامت للرابط وحده كما كان يحدث في APK القديمة.
 *   3) تلميح لمرة واحدة يعلّم المستخدم الضغطة المطولة (يُخزّن محلياً).
 * 👑 v10.19 — إعادة تصميم جذرية بأمر المالك:
 *   1) اللوحة الشبكية السابقة «سيئة وغير مناسبة» — استُبدلت بقوس دائري
 *      حقيقي (Radial Fan) تفُتح عناصره بالتسلسل حول زر + كأنها ساعة فاخرة.
 *   2) أيقونة المشاركة كانت تُعاد داخل المركز (حتى v10.20) — انظر v10.21 أعلاه.
 *   3) «إعلانات الإدارة» حُذفت كلياً مع حذف زاوية الإدارة نفسها (v10.19).
 *   4) جلب الإعدادات مشترك مُخزّن (useSiteSettings) — طلب واحد لكل التطبيق.
 * • لا يمس أي منطق مصادقة أو إشعارات — طبقة عرض مستقلة تماماً
 * • التواصل مع الأدوات الأخرى عبر أحداث نافذة مخصصة (fia-fab:*)
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  LifeBuoy, MessageCircle, Mail, Moon, Sun, Plus, Share2, X as XIcon,
  Send, Facebook, Twitter, Link2, MessageSquareText,
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

// 👑 v10.21 — بيانات المشاركة الرسمية الموحّدة (نص + رابط التحميل المعتمد)
const SHARE_URL = 'https://fiaacademy.vercel.app/download'
const SHARE_TEXT = '👑 حمّل تطبيق أكاديمية المستقبل الدولية — تعلّم بأسلوب احترافي'
const SHARE_HINT_KEY = 'fia-fab-share-hint'

/**
 * 👑 v10.21 — ورقة المشاركة الاجتماعية الفاخرة (Social Share Sheet)
 * ============================================================================
 * المشكلة التي أمر المالك بحلّها نهائياً: المشاركة داخل + كانت «تنسخ الرابط
 * فقط ولا تظهر مواقع التواصل». بعد الحذف الحرفي لأيقونة المشاركة من المروحة
 * أعلاه، صارت المشاركة تعيش **داخل زر + نفسه** (ضغطة مطولة)، وسلسلتها:
 *   1) الجسر الأصلي FIANativeBridge.shareApp (APK 2.9.10+) — لوحة أندرويد الكاملة
 *   2) navigator.share — المشاركة الأصلية في المتصفحات المحمولة
 *   3) هذه الورقة الفاخرة — واتساب/تليجرام/فيسبوك/إكس/SMS/نسخ — **مواقع التواصل
 *      تظهر دائماً** بدل النسخ الصامت. الروابط الخارجية يفتحها APK عبر
 *      handleUrl إلى التطبيقات نفسها (wa.me وt.me وsms: مدعومة أصلياً).
 * ============================================================================
 */
function SocialShareSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard?.writeText(SHARE_URL)
      toast.success('🔗 تم نسخ رابط التطبيق — شاركه بفخر!')
      onClose()
    } catch {
      toast.error('تعذر النسخ تلقائياً — انسخ الرابط: ' + SHARE_URL)
    }
  }, [onClose])

  if (!open) return null

  const targets = [
    { id: 'whatsapp', label: 'واتساب', icon: MessageCircle, grad: 'from-[#25D366] to-[#0E7A5A]', href: `https://wa.me/?text=${encodeURIComponent(`${SHARE_TEXT}\n${SHARE_URL}`)}` },
    { id: 'telegram', label: 'تليجرام', icon: Send, grad: 'from-[#37AEE2] to-[#1B7DAB]', href: `https://t.me/share/url?url=${encodeURIComponent(SHARE_URL)}&text=${encodeURIComponent(SHARE_TEXT)}` },
    { id: 'facebook', label: 'فيسبوك', icon: Facebook, grad: 'from-[#4A8CF0] to-[#0E5FCB]', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}` },
    { id: 'x', label: 'إكس — تويتر', icon: Twitter, grad: 'from-neutral-600 to-neutral-900', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}` },
    { id: 'sms', label: 'رسالة SMS', icon: MessageSquareText, grad: 'from-emerald-500 to-teal-600', href: `sms:?body=${encodeURIComponent(`${SHARE_TEXT}\n${SHARE_URL}`)}` },
  ]

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="مشاركة التطبيق"
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-md mx-2 sm:mx-0 rounded-t-3xl sm:rounded-3xl overflow-hidden border-2 border-gold/40 bg-gradient-to-b from-[#0C2452] via-[#0A1F44] to-[#051429] shadow-[0_-8px_60px_-10px_rgba(0,0,0,0.7)] animate-in slide-in-from-bottom-8 fade-in duration-300"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.25rem)' }}
      >
        {/* مقبض علوي أنيق */}
        <div className="flex justify-center pt-3">
          <span className="h-1.5 w-14 rounded-full bg-gold/40" aria-hidden />
        </div>
        {/* الرأس الملكي */}
        <div className="flex items-center gap-3 px-5 pt-3 pb-4 border-b border-gold/15">
          <span className="flex w-11 h-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg ring-2 ring-gold/40">
            <Share2 className="w-5 h-5 text-white" strokeWidth={2.3} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-black leading-tight text-gold">مشاركة تطبيق الأكاديمية</h3>
            <p className="mt-0.5 text-[11px] leading-snug text-white/55">اختر مواقع التواصل لترسل التطبيق لزملائك فوراً</p>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق ورقة المشاركة"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        {/* شبكة مواقع التواصل — دائرية فاخرة بألوان الهويات */}
        <div className="grid grid-cols-3 gap-x-2 gap-y-4 px-5 py-5">
          {targets.map((t) => {
            const Icon = t.icon
            return (
              <a
                key={t.id}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center gap-2 outline-none"
                aria-label={`مشاركة عبر ${t.label}`}
                title={t.label}
              >
                <span className={`relative flex h-[56px] w-[56px] items-center justify-center rounded-full bg-gradient-to-br ${t.grad} shadow-[0_8px_22px_-8px_rgba(0,0,0,0.6)] ring-2 ring-gold/25 transition-all duration-200 group-hover:ring-gold/70 group-active:scale-90`}>
                  <span aria-hidden className="absolute inset-[3px] rounded-full bg-gradient-to-b from-white/25 to-transparent opacity-60" />
                  <Icon className="relative h-6 w-6 text-white drop-shadow" strokeWidth={2.2} />
                </span>
                <span className="text-[11px] font-bold text-white/80 transition-colors group-hover:text-gold">{t.label}</span>
              </a>
            )
          })}
          {/* نسخ الرابط — الخيار الأخير ليس الوحيد بعد الآن */}
          <button onClick={copyLink} className="group flex flex-col items-center gap-2 outline-none" aria-label="نسخ رابط التطبيق" title="نسخ الرابط">
            <span className="relative flex h-[56px] w-[56px] items-center justify-center rounded-full bg-gradient-to-br from-navy-light to-navy shadow-[0_8px_22px_-8px_rgba(0,0,0,0.6)] ring-2 ring-gold/45 transition-all duration-200 group-hover:ring-gold group-active:scale-90">
              <span aria-hidden className="absolute inset-[3px] rounded-full bg-gradient-to-b from-white/20 to-transparent opacity-60" />
              <Link2 className="relative h-6 w-6 text-gold drop-shadow" strokeWidth={2.2} />
            </span>
            <span className="text-[11px] font-bold text-gold/90">نسخ الرابط</span>
          </button>
        </div>
      </div>
    </div>
  )
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

  // 👑 v10.21 — المشاركة تعيش داخل زر + نفسه (ضغطة مطولة) وتُظهر مواقع التواصل
  // دائماً: جسر APK الأصلي ← مشاركة المتصفح ← الورقة الاجتماعية الفاخرة.
  // أُزيل النسخ الصامت للأبد — لن تحصل المشاركة على «رابط منسوخ فقط» مجدداً.
  const [shareOpen, setShareOpen] = useState(false)
  const [hint, setHint] = useState(false)

  const dismissHint = useCallback(() => {
    setHint(false)
    try { localStorage.setItem(SHARE_HINT_KEY, '1') } catch {}
  }, [])

  const shareNow = useCallback(() => {
    try {
      const bridge = (window as any)?.FIANativeBridge
      if (bridge && typeof bridge.shareApp === 'function') { bridge.shareApp(); return }
    } catch {}
    const shareData = { title: 'أكاديمية المستقبل الدولية', text: SHARE_TEXT, url: SHARE_URL }
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        (navigator as any).share(shareData).catch(() => {})
        return
      }
    } catch {}
    setShareOpen(true)
  }, [])

  // 👑 الضغطة المطولة على زر + (550ms) = مشاركة فورية باهتزاز تأكيدي
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  const startPress = useCallback(() => {
    longPressFired.current = false
    dismissHint()
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true
      try { navigator.vibrate?.(40) } catch {}
      shareNow()
    }, 550)
  }, [dismissHint, shareNow])

  const cancelPress = useCallback(() => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null }
  }, [])

  const handlePlusClick = useCallback(() => {
    if (longPressFired.current) { longPressFired.current = false; return }
    setOpen((o) => !o)
  }, [])

  // تلميح لمرة واحدة: «اضغط مطولاً على + لمشاركة التطبيق»
  useEffect(() => {
    try { if (localStorage.getItem(SHARE_HINT_KEY)) return } catch {}
    const t1 = window.setTimeout(() => setHint(true), 2500)
    const t2 = window.setTimeout(() => {
      setHint(false)
      try { localStorage.setItem(SHARE_HINT_KEY, '1') } catch {}
    }, 12000)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
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

  // Escape يغلق ورقة المشاركة ثم المركز
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setShareOpen((s) => { if (s) return false; setOpen(false); return false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

      {/* 👑 v10.21 — تلميح لمرة واحدة: المشاركة صارت داخل زر + بالضغط المطول */}
      {hint && !open && !shareOpen && (
        <button
          onClick={dismissHint}
          dir="rtl"
          aria-label="إخفاء التلميح"
          className="fixed bottom-[96px] left-4 z-[60] max-w-[250px] rounded-2xl border border-gold/50 bg-[#0A1F44]/95 px-3.5 py-2.5 text-right shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-500"
        >
          <span className="flex items-start gap-2">
            <Share2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            <span className="text-[11.5px] font-bold leading-snug text-gold/95">
              اضغط مطولاً على زر <span className="text-white">+</span> لمشاركة التطبيق عبر مواقع التواصل
            </span>
          </span>
        </button>
      )}

      {/* الزر المركزي الوحيد — يلتف (+) إلى (×) عند الفتح — وضغط مطول = مشاركة فورية */}
      <button
        onClick={handlePlusClick}
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
        aria-label={open ? 'إغلاق مركز الأدوات' : 'فتح مركز الأدوات — واضغط مطولاً لمشاركة التطبيق'}
        aria-expanded={open}
        className="fixed bottom-6 left-4 sm:left-6 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-[0_10px_34px_-6px_rgba(11,22,53,0.55),0_0_28px_-6px_rgba(212,175,55,0.5)] flex items-center justify-center ring-2 ring-gold/40 hover:ring-gold/70 transition-all duration-300 hover:scale-105 active:scale-95 select-none touch-none"
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

      {/* 👑 v10.21 — ورقة المشاركة الاجتماعية الفاخرة: مواقع التواصل تظهر دائماً */}
      <SocialShareSheet open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  )
}

export default FiaFabHub

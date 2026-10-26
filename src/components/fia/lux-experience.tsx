'use client'

/**
 * ============================================================================
 * 👑 lux-experience — طبقة التجربة الملكية العالمية (v10.19)
 * ============================================================================
 * مكونات عرض بصرية خالصة — صفر تعديل على قاعدة البيانات أو منطق المصادقة:
 *   1) LuxSplash          — ستارة افتتاحية ملكية (الصفحة الرئيسية، مرة لكل جلسة)
 *   2) LuxOfferCountdown  — عدّاد تنازلي فاخر للعروض المحدودة
 *   3) LuxCommandPalette  — بحث شامل فاخر (Ctrl+K)
 *   4) LuxSupportButton   — زر دعم سريع عائم (الجهة اليسرى)
 *   5) LuxGlobalLayer     — تركيب كل ما سبق في مكان واحد داخل layout
 *   6) LuxPullToRefresh   — سحب للتحديث بحلقة ذهبية (تُركّب حيث يلزم فقط)
 *   7) LuxLessonCelebration — احتفال نهاية الدرس: ختم «أُنجز» + الدرس التالي
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Crown, Search, X, CornerDownLeft, ArrowUp, ArrowDown,
  LifeBuoy, Mail, Phone, Send, MessageCircle, BookOpen, Home,
  GraduationCap, ShieldCheck, Download, Users, Sparkles, Star,
  CheckCircle2, ChevronLeft, Loader2, RefreshCw,
} from 'lucide-react'
// 👑 القارئ الملكي للدروس النصية (مشترك مع مؤلّف الدروس في لوحة الإدارة)
import { LuxRoyalReader } from '@/components/fia/lux-text-lesson'
// 👑 v10.6 — مراقبة الأخطاء الحية + وضع الصيانة
import { installErrorWatcher } from '@/lib/error-report'

// ═══════════════════════ إعدادات الموقع — جلب مشترك ═══════════════════════

let __settingsCache: any = null
let __settingsPromise: Promise<any> | null = null
let __settingsAt = 0
const SETTINGS_TTL = 30_000 // 👑 v10.6.1 — ذاكرة قصيرة: أي تفعيل جديد ينعكس خلال 30 ثانية كحد أقصى

function fetchSiteSettings(force = false): Promise<any> {
  if (!force && __settingsCache && Date.now() - __settingsAt < SETTINGS_TTL) {
    return Promise.resolve(__settingsCache)
  }
  if (!__settingsPromise) {
    // 👑 v10.18 — التحديث القسري (بعد حفظ الإدارة) يحمل cache-bust كي لا
    // يعيده كاش حافة Vercel قديماً خلال ثواني s-maxage الستين
    __settingsPromise = fetch(`/api/site-settings${force ? `?_=${Date.now()}` : ''}`)
      .then((r) => r.json())
      .then((d) => { __settingsCache = d || {}; __settingsAt = Date.now(); __settingsPromise = null; return __settingsCache })
      .catch(() => { __settingsPromise = null; if (!__settingsCache) { __settingsCache = {}; __settingsAt = Date.now() }; return __settingsCache })
  }
  return __settingsPromise
}

// 👑 v10.6.1 — تنبيه موحّد: تُطلقه الإدارة بعد أي حفظ ناجح للإعدادات
// فيُحدَّث شريط العرض وبوابة الصيانة في كل الصفحات المفتوحة فوراً دون انتظار.
export function broadcastSettingsUpdated() {
  try { __settingsAt = 0; window.dispatchEvent(new CustomEvent('fia-settings-updated')) } catch {}
}

// 👑 v10.5 — مُعرَّضة عامة: يستخدمها مركز الأدوات العائم أيضاً
export function useSiteSettings() {
  const [settings, setSettings] = useState<any>(__settingsCache || null)
  useEffect(() => {
    let alive = true
    fetchSiteSettings().then((d) => { if (alive) setSettings(d) })
    // 👑 v10.18 — تحديث حي: حفظ الإعدادات في لوحة الإدارة ينعكس فوراً على
    // كل المكونات المفتوحة (مفتاح الزاوية، الإعلانات، الشريط، الصيانة…)
    const onUpdated = () => { fetchSiteSettings(true).then((d) => { if (alive) setSettings(d) }) }
    // وعند العودة للتطبيق: تحديث صامت إن تجاوزت البيانات مدة صلاحيتها
    const onFocus = () => {
      if (__settingsCache && Date.now() - __settingsAt > SETTINGS_TTL) {
        fetchSiteSettings(true).then((d) => { if (alive) setSettings(d) })
      }
    }
    try {
      window.addEventListener('fia-settings-updated', onUpdated)
      window.addEventListener('focus', onFocus)
    } catch {}
    return () => {
      alive = false
      try {
        window.removeEventListener('fia-settings-updated', onUpdated)
        window.removeEventListener('focus', onFocus)
      } catch {}
    }
  }, [])
  return settings
}

// ═══════════════════════ 1) الستارة الافتتاحية الملكية ═══════════════════════

const SPLASH_KEY = 'fia-splash-v10.3'

export function LuxSplash() {
  const pathname = usePathname()
  const [phase, setPhase] = useState<'hidden' | 'show' | 'open' | 'gone'>('hidden')

  useEffect(() => {
    if (pathname !== '/') return
    let seen = false
    try { seen = sessionStorage.getItem(SPLASH_KEY) === '1' } catch {}
    if (seen) return
    setPhase('show')
    try { sessionStorage.setItem(SPLASH_KEY, '1') } catch {}
    const t1 = setTimeout(() => setPhase('open'), 1900)
    const t2 = setTimeout(() => setPhase('gone'), 2900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [pathname])

  if (phase === 'hidden' || phase === 'gone') return null

  return (
    <div
      className={`fixed inset-0 z-[9990] ${phase === 'open' ? 'fia-splash-open' : ''}`}
      onClick={() => setPhase('open')}
      aria-hidden="true"
    >
      {/* نصفا الستارة الكحليان */}
      <div className="fia-curtain fia-curtain-r absolute inset-y-0 right-0 w-1/2 bg-navy" />
      <div className="fia-curtain fia-curtain-l absolute inset-y-0 left-0 w-1/2 bg-navy" />
      {/* لمعة النقش */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-25" style={{
        backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.2px, transparent 1.2px), radial-gradient(circle at 88% 50%, white 1px, transparent 1px)',
        backgroundSize: '26px 26px, 20px 20px',
      }} />
      {/* المحتوى المركزي */}
      <div className="fia-splash-core absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 pointer-events-none">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gold/25 blur-2xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-full border-2 border-gold/60 flex items-center justify-center bg-gradient-to-br from-navy-light to-navy shadow-[0_0_50px_rgba(212,175,55,0.35)]">
            <svg viewBox="0 0 48 48" className="w-12 h-12 fia-splash-draw">
              <path
                d="M6 34 L13 18 L20 30 L24 14 L28 30 L35 18 L42 34 Z"
                fill="none" stroke="#D4AF37" strokeWidth="2.4" strokeLinejoin="round"
              />
              <circle cx="24" cy="9" r="2.6" fill="none" stroke="#D4AF37" strokeWidth="2" />
            </svg>
          </div>
        </div>
        <div className="text-center">
          <div className="fia-splash-title text-3xl font-black tracking-tight bg-gradient-to-l from-white via-gold to-white bg-clip-text text-transparent">
            أكاديمية المستقبل الدولية
          </div>
          <div className="mt-1.5 text-gold/70 text-xs font-bold tracking-[0.5em] uppercase">F I A</div>
        </div>
        <div className="w-40 h-[3px] rounded-full bg-white/10 overflow-hidden">
          <div className="fia-splash-bar h-full bg-gradient-to-l from-gold via-amber-400 to-gold" />
        </div>
      </div>

      <style jsx global>{`
        .fia-splash-core { animation: splashCore .9s cubic-bezier(.2,.8,.2,1) both; }
        @keyframes splashCore { from { opacity: 0; transform: scale(.86); } to { opacity: 1; transform: scale(1); } }
        .fia-splash-draw { stroke-dasharray: 160; stroke-dashoffset: 160; animation: splashDraw 1.25s .15s ease forwards; }
        @keyframes splashDraw { to { stroke-dashoffset: 0; } }
        .fia-splash-title { opacity: 0; animation: splashTitle .8s .55s ease both; }
        @keyframes splashTitle { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .fia-splash-bar { width: 0; animation: splashBar 1.7s .2s ease-in-out forwards; }
        @keyframes splashBar { to { width: 100%; } }
        .fia-splash-open .fia-curtain-r { transform: translateX(100%); }
        .fia-splash-open .fia-curtain-l { transform: translateX(-100%); }
        .fia-curtain { transition: transform 1s cubic-bezier(.7,0,.3,1); }
        .fia-splash-open .fia-splash-core { opacity: 0; transform: scale(1.12); transition: all .6s ease; }
      `}</style>
    </div>
  )
}

// ═══════════════════════ 2) العدّاد التنازلي الملكي ═══════════════════════

function useCountdown(endsAt?: string) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return useMemo(() => {
    if (!endsAt || now === null) return null
    const end = new Date(endsAt).getTime()
    if (isNaN(end) || end <= now) return { expired: true as const }
    const diff = end - now
    return {
      expired: false as const,
      d: Math.floor(diff / 86400000),
      h: Math.floor((diff % 86400000) / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
    }
  }, [endsAt, now])
}

export function LuxOfferCountdown({ endsAt, dark = false, title }: { endsAt?: string; dark?: boolean; title?: string }) {
  const cd = useCountdown(endsAt)
  if (!cd || cd.expired) return null
  const cells = [
    { v: cd.d, l: 'يوم' }, { v: cd.h, l: 'ساعة' },
    { v: cd.m, l: 'دقيقة' }, { v: cd.s, l: 'ثانية' },
  ]
  return (
    <div className={`relative inline-flex flex-col gap-2 rounded-2xl p-3.5 border shadow-lg overflow-hidden ${
      dark ? 'bg-navy/60 border-gold/40 backdrop-blur-md' : 'bg-gradient-to-br from-navy/[0.04] via-white to-gold/[0.08] border-gold/40'
    }`}>
      <div className="absolute top-0 right-0 left-0 h-0.5 bg-gradient-to-l from-gold via-amber-400 to-gold" />
      {title && (
        <div className={`text-[10px] font-black tracking-wide flex items-center gap-1 ${dark ? 'text-gold' : 'text-navy/70'}`}>
          <Sparkles className="w-3 h-3 text-gold" /> {title}
        </div>
      )}
      <div className="flex items-center gap-1.5" dir="ltr">
        {cells.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`flex flex-col items-center rounded-xl px-2.5 py-1.5 min-w-[52px] border ${
              dark ? 'bg-white/10 border-gold/30' : 'bg-navy border-gold/30'
            }`}>
              <span className="text-lg font-black text-gold tabular-nums leading-none">
                {String(c.v).padStart(2, '0')}
              </span>
              <span className="text-[8px] font-bold text-gold/60 mt-1">{c.l}</span>
            </div>
            {i < cells.length - 1 && <span className="text-gold font-black text-sm -mt-3">:</span>}
          </div>
        ))}
      </div>
    </div>
  )
}


// ═══════════════════════ 4) البحث الشامل الملكي (Ctrl+K) ═══════════════════════

interface PaletteItem {
  id: string
  label: string
  hint?: string
  icon: any
  href: string
}

const STATIC_PAGES: PaletteItem[] = [
  { id: 'p-home', label: 'الصفحة الرئيسية', hint: 'القاعة الكبرى', icon: Home, href: '/' },
  { id: 'p-courses', label: 'الدورات', hint: 'تصفح كل الدورات', icon: BookOpen, href: '/#courses' },
  { id: 'p-start', label: 'كيف تبدأ', hint: 'أدلة مصوّرة خطوة بخطوة', icon: GraduationCap, href: '/start' },
  { id: 'p-trainers', label: 'المدربون', hint: 'نخبة المدربين', icon: Users, href: '/#trainers' },
  { id: 'p-verify', label: 'التحقق من شهادة', hint: 'فحص رقم شهادة', icon: ShieldCheck, href: '/verify' },
  { id: 'p-download', label: 'تحميل التطبيق', hint: 'نسخة أندرويد الرسمية', icon: Download, href: '/download' },
  { id: 'p-contact', label: 'تواصل معنا', hint: 'قنوات الدعم', icon: MessageCircle, href: '/contact' },
]

export function LuxCommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [courses, setCourses] = useState<any[]>([])
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    setQ('')
    setActive(0)
    setTimeout(() => inputRef.current?.focus(), 60)
    if (courses.length === 0) {
      fetch('/api/courses').then((r) => r.json()).then((d) => setCourses(Array.isArray(d) ? d : [])).catch(() => {})
    }
  }, [open, courses.length])

  const results = useMemo<PaletteItem[]>(() => {
    const query = q.trim().toLowerCase()
    const pageItems = STATIC_PAGES.filter((p) => !query || p.label.toLowerCase().includes(query) || (p.hint || '').toLowerCase().includes(query))
    const courseItems: PaletteItem[] = (query ? courses : courses.slice(0, 5))
      .filter((c: any) => !query || String(c.title || '').toLowerCase().includes(query))
      .slice(0, 8)
      .map((c: any) => ({
        id: `c-${c.id}`,
        label: c.title,
        hint: c.level ? `دورة • ${c.level}` : 'دورة تدريبية',
        icon: BookOpen,
        href: c.slug ? `/courses/${c.slug}` : `/#courses`,
      }))
    return [...courseItems, ...pageItems].slice(0, 13)
  }, [q, courses])

  useEffect(() => { setActive(0) }, [q])

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = useCallback((item: PaletteItem) => {
    setOpen(false)
    router.push(item.href)
  }, [router])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    if (e.key === 'Enter' && results[active]) { e.preventDefault(); choose(results[active]) }
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[9995]" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
          <div
            className="fia-palette relative mx-auto mt-[10vh] w-[92%] max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-gold/40 bg-white"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* الترويسة */}
            <div className="relative flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-navy via-navy-light to-navy border-b-2 border-gold/40">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
                <Crown className="w-4 h-4 text-navy" strokeWidth={2.4} />
              </div>
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/60" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="ابحث عن دورة أو صفحة… (Ctrl+K)"
                  className="w-full h-10 rounded-xl bg-navy/40 border border-gold/30 text-white placeholder:text-white/40 pr-10 pl-3 text-sm font-bold focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
                />
              </div>
              <button onClick={() => setOpen(false)} className="text-gold/70 hover:text-gold">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* النتائج */}
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="text-center py-10 text-sm text-muted-foreground font-bold">
                  لا نتائج مطابقة — جرّب كلمة أخرى
                </div>
              ) : (
                results.map((item, idx) => {
                  const Icon = item.icon
                  const isActive = idx === active
                  return (
                    <button
                      key={item.id}
                      data-idx={idx}
                      onClick={() => choose(item)}
                      onMouseEnter={() => setActive(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-right transition-all ${
                        isActive ? 'bg-gradient-to-l from-gold/15 to-transparent border border-gold/40 shadow-sm' : 'border border-transparent hover:bg-gold/5'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-gradient-to-br from-navy to-navy-light text-gold' : 'bg-muted text-navy/70'}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-extrabold text-navy truncate">{item.label}</span>
                        {item.hint && <span className="block text-[10px] text-muted-foreground">{item.hint}</span>}
                      </span>
                      {isActive && <CornerDownLeft className="w-4 h-4 text-gold flex-shrink-0" />}
                    </button>
                  )
                })
              )}
            </div>
            {/* تذييل الاختصارات */}
            <div className="flex items-center gap-3 px-4 py-2 bg-muted/40 border-t border-gold/20 text-[10px] font-bold text-muted-foreground" dir="ltr">
              <span className="flex items-center gap-1"><span className="fia-kbd">↑↓</span> تنقل</span>
              <span className="flex items-center gap-1"><span className="fia-kbd">Enter</span> فتح</span>
              <span className="flex items-center gap-1"><span className="fia-kbd">Esc</span> إغلاق</span>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`
        .fia-palette { animation: paletteIn .28s cubic-bezier(.2,.9,.3,1.15) both; }
        @keyframes paletteIn { from { opacity: 0; transform: translateY(-14px) scale(.97); } to { opacity: 1; transform: none; } }
        .fia-kbd {
          display: inline-block; padding: 1px 6px; border-radius: 6px;
          background: linear-gradient(180deg,#1b2c55,#0A1F44); color: #D4AF37;
          border: 1px solid rgba(212,175,55,.4); font-family: monospace; font-size: 10px;
        }
      `}</style>
    </>
  )
}

// ═══════════════════════ 5) زر الدعم السريع العائم ═══════════════════════

export function LuxSupportButton() {
  const settings = useSiteSettings()
  const [open, setOpen] = useState(false)

  // 👑 v10.5 — الفتح من مركز الأدوات العائم (FiaFabHub) — بلا زر عائم مستقل
  useEffect(() => {
    const onFabOpen = () => setOpen(true)
    window.addEventListener('fia-fab:support', onFabOpen)
    return () => window.removeEventListener('fia-fab:support', onFabOpen)
  }, [])

  const channels = useMemo(() => {
    const list: { id: string; label: string; sub: string; icon: any; href: string; grad: string }[] = []
    const wa = String(settings?.social_whatsapp || '').trim()
    if (settings?.social_whatsapp_enabled !== false && wa) {
      const num = wa.replace(/[^\d]/g, '')
      if (num) list.push({ id: 'wa', label: 'واتساب', sub: 'رد سريع خلال ساعات العمل', icon: MessageCircle, href: `https://wa.me/${num}`, grad: 'from-emerald-500 to-teal-600' })
    }
    const tg = String(settings?.social_telegram || '').trim()
    if (settings?.social_telegram_enabled !== false && tg) {
      const handle = tg.replace('@', '').replace('https://t.me/', '')
      if (handle) list.push({ id: 'tg', label: 'تيليجرام', sub: 'تواصل مباشر عبر تيليجرام', icon: Send, href: `https://t.me/${handle}`, grad: 'from-sky-500 to-blue-600' })
    }
    const phone = String(settings?.phone || '').trim()
    if (phone) list.push({ id: 'tel', label: 'اتصال هاتفي', sub: phone, icon: Phone, href: `tel:${phone.replace(/\s/g, '')}`, grad: 'from-gold to-amber-500' })
    const email = String(settings?.email || '').trim()
    if (email) list.push({ id: 'mail', label: 'البريد الإلكتروني', sub: email, icon: Mail, href: `mailto:${email}`, grad: 'from-purple-500 to-fuchsia-600' })
    // قنوات دائمة تُعرض دائماً
    list.push({ id: 'contact', label: 'صفحة التواصل', sub: 'نموذج مراسلة كامل', icon: Mail, href: '/contact', grad: 'from-navy to-navy-light' })
    list.push({ id: 'start', label: 'دليل البدء', sub: 'كل الخطوات مصوّرة', icon: BookOpen, href: '/start', grad: 'from-emerald-500 to-teal-600' })
    return list
  }, [settings])

  return (
    <>
      {/* 🛡️ إصلاح جذري: الطبقة كانت z-[66] فوق اللوحة z-[65] فتبتلع كل النقرات
          على القنوات (واتساب/تيليجرام/الهاتف/البريد/صفحة التواصل/دليل البدء)
          وتكتفي بإغلاق النافذة — الآن تحتها مباشرة فتعمل كل الروابط */}
      {open && <div className="fixed inset-0 z-[63]" onClick={() => setOpen(false)} />}
      {/* اللوحة */}
      <div className={`fixed bottom-[92px] left-5 z-[65] w-[300px] rounded-2xl overflow-hidden shadow-2xl border border-gold/40 bg-white transition-all duration-300 origin-bottom-left ${
        open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-3 pointer-events-none'
      }`} dir="rtl">
        <div className="relative bg-gradient-to-r from-navy via-navy-light to-navy px-4 py-3.5 text-white">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 15% 50%, #D4AF37 1.2px, transparent 1.2px)', backgroundSize: '18px 18px',
          }} />
          <div className="relative flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
              <LifeBuoy className="w-5 h-5 text-navy" />
            </div>
            <div>
              <div className="text-xs font-black">الدعم السريع</div>
              <div className="text-[10px] text-gold/80">نحن معك خطوة بخطوة</div>
            </div>
            <button onClick={() => setOpen(false)} className="mr-auto text-gold/70 hover:text-gold"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-2 space-y-1 max-h-[46vh] overflow-y-auto">
          {channels.map((ch) => {
            const Icon = ch.icon
            return (
              <a
                key={ch.id}
                href={ch.href}
                target={ch.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gold/10 border border-transparent hover:border-gold/25 transition-all group"
              >
                <span className={`w-9 h-9 rounded-xl bg-gradient-to-br ${ch.grad} flex items-center justify-center shadow-sm flex-shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-extrabold text-navy">{ch.label}</span>
                  <span className="block text-[10px] text-muted-foreground truncate" dir="auto">{ch.sub}</span>
                </span>
                <ChevronLeft className="w-4 h-4 text-gold/50 group-hover:text-gold group-hover:-translate-x-0.5 transition-all flex-shrink-0" />
              </a>
            )
          })}
        </div>
      </div>
      {/* 👑 v10.5 — الزر العائم المستقل أُزيل: الدعم يُفتح من مركز الأدوات (FiaFabHub) */}
    </>
  )
}

// ═══════════════════════ 6) الطبقة العالمية — تُركّب مرة واحدة ═══════════════════════

export function LuxGlobalLayer() {
  // 👑 v10.6.1 — جسر التحديث الناعم: السحب للتحديث في التطبيق يستدعي هذه الدالة
  // فتُحدَّث بيانات الصفحة الحالية في مكانها (يبقى المستخدم في نفس التبويب
  // ولا يُعاد إلى لوحة التحكم)، وإن لم يوجد معالج لهذه الصفحة أُعيد تحميل
  // الصفحة نفسها كما هي (نفس الرابط) — لا عودة لأي مكان آخر أبداً.
  useEffect(() => {
    ;(window as any).__FIA_softRefresh = () => {
      const w = window as any
      try {
        if (typeof w.__FIA_refreshActiveView === 'function') {
          w.__FIA_refreshActiveView()
          window.dispatchEvent(new CustomEvent('fia-soft-refresh'))
          try { w.__FIA_showToast?.('تم تحديث الصفحة ✓') } catch {}
          return 'soft'
        }
      } catch {}
      location.reload()
      return 'hard'
    }
    return () => { try { delete (window as any).__FIA_softRefresh } catch {} }
  }, [])

  return (
    <>
      <LuxSplash />
      <LuxCommandPalette />
      <LuxSupportButton />
      <LuxMaintenanceGuard />
      <LuxErrorWatcherMount />
    </>
  )
}

// ═══════════════ 8) بوابة وضع الصيانة (v10.6.1) ═══════════════
// مفاتيح الإعدادات: maintenance_active + maintenance_message
// 🛡️ القاعدة الحديدية: حساب الإدارة (والمدربون) يتجاوز البوابة دائماً —
// فحص الدور يجري من جديد في كل مرة تُكشف فيها الصيانة، بلا ذاكرة خالدة
// قد تُحبس الإدارة خارج موقعها. أي فشل في الجلب = لا صيانة.
let __whoamiValue: any = null
let __whoamiAt = 0
const WHOAMI_TTL = 30_000

async function whoamiCached(): Promise<any> {
  if (__whoamiValue && Date.now() - __whoamiAt < WHOAMI_TTL) return __whoamiValue
  try {
    const r = await fetch('/api/auth/whoami')
    const d = await r.json()
    __whoamiValue = d || { authenticated: false }
    __whoamiAt = Date.now()
  } catch {
    // فشل الشبكة لا يُخزَّن إطلاقاً — الفحص القادم فوري ومن جديد
    __whoamiValue = null
    __whoamiAt = 0
    return { authenticated: false }
  }
  return __whoamiValue
}

function LuxMaintenanceGuard() {
  const [active, setActive] = useState(false)
  const [message, setMessage] = useState('')
  const [hidden, setHidden] = useState(false)
  const [staff, setStaff] = useState(false) // شارة الطاقم: الصيانة مفعّلة وأنت تتصفح فوقها

  useEffect(() => {
    let alive = true
    let iv: any = null
    const check = async () => {
      try {
        const s = await fetchSiteSettings()
        if (!alive) return
        const on = s?.maintenance_active === true || s?.maintenance_active === 'true'
        if (!on) { setActive(false); setStaff(false); return }
        setMessage(String(s?.maintenance_message || '').slice(0, 400))
        const me = await whoamiCached()
        if (!alive) return
        const role = String(me?.role || '')
        if (role === 'admin' || role === 'trainer') {
          // 🛡️ الطاقم فوق البوابة دائماً — شارة أنيقة تؤكد أن الصيانة تعمل وأنه يراها من الداخل
          setStaff(true)
          setActive(false)
        } else {
          setStaff(false)
          setActive(true)
        }
      } catch {}
    }
    check()
    // انعكاس فوري: مسح خفيف كل 60ث + فور عودة التركيز + حدث الحفظ من لوحة الإدارة
    iv = setInterval(check, 60_000)
    const onVis = () => { if (typeof document !== 'undefined' && document.visibilityState === 'visible') check() }
    const onSettingsUpdated = () => { __whoamiAt = 0; check() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onVis)
    window.addEventListener('fia-settings-updated', onSettingsUpdated as EventListener)
    return () => {
      alive = false
      if (iv) clearInterval(iv)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onVis)
      window.removeEventListener('fia-settings-updated', onSettingsUpdated as EventListener)
    }
  }, [])

  return (
    <>
      {/* شارة الطاقم — تظهر للإدارة والمدربين فقط أثناء عمل الصيانة */}
      {staff && !active && (
        <div className="fixed bottom-4 left-4 z-[9990] flex items-center gap-2 rounded-2xl border border-amber-400/50 bg-navy/95 backdrop-blur-md shadow-2xl px-4 py-2.5 max-w-[280px]">
          <span className="relative flex w-2.5 h-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-br from-amber-200 via-gold to-amber-600" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-black text-gold leading-tight">وضع الصيانة مفعّل الآن</div>
            <div className="text-[10px] text-white/60 leading-tight mt-0.5">الزوار يرون صفحة «نطور الأكاديمية» — وأنت تتصفح بصلاحية الطاقم</div>
          </div>
        </div>
      )}
      {active && !hidden && (
      <div dir="rtl" className="fixed inset-0 z-[9995] overflow-hidden" style={{ background: 'radial-gradient(1200px 700px at 50% -10%, #16233f 0%, #0b1226 55%, #070d1c 100%)' }}>
        {/* نقش ذهبي + هالات */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 14% 30%, #D4AF37 1.1px, transparent 1.1px), radial-gradient(circle at 84% 70%, #D4AF37 0.9px, transparent 0.9px)', backgroundSize: '34px 34px, 42px 42px' }} />
        <div className="absolute -top-32 right-1/4 w-[420px] h-[420px] rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 left-1/5 w-[460px] h-[460px] rounded-full bg-gold/[0.07] blur-3xl pointer-events-none" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-gold/20 blur-2xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl border-2 border-gold/60 bg-gradient-to-br from-[#16233f] to-[#0b1226] shadow-[0_0_60px_rgba(212,175,55,0.25)] flex items-center justify-center">
              <svg viewBox="0 0 48 48" className="w-12 h-12">
                <path d="M6 34 L13 18 L20 30 L24 14 L28 30 L35 18 L42 34 Z" fill="none" stroke="#D4AF37" strokeWidth="2.4" strokeLinejoin="round" />
                <circle cx="24" cy="9" r="2.6" fill="none" stroke="#D4AF37" strokeWidth="2" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-l from-white via-gold to-white bg-clip-text text-transparent">نطور الأكاديمية الآن</h1>
          <p className="text-white/75 max-w-md leading-8 text-sm sm:text-base">
            {message || 'ننهي لمسة فاخرة في أرجاء الأكاديمية — عد بعد قليل وستجدها أجمل وأسرع. شكراً لصبرك الجميل 💛'}
          </p>
          <div className="flex items-center gap-2 text-gold/90 text-xs font-bold">
            <span className="inline-block w-2 h-2 rounded-full bg-gold animate-pulse" />
            أعمال الصيانة تجري بأمر إدارة أكاديمية المستقبل الدولية
          </div>
          {/* للطاقم: زر دخول متجاوز يظهر بعد 3 نقرات على الشعار */}
          <button
            onClick={() => {
              tapsRef.current += 1
              if (tapsRef.current >= 3) setHidden(true)
            }}
            className="mt-2 text-[10px] text-white/25 hover:text-white/50 transition-colors"
            aria-label="."
          >
            أكاديمية المستقبل الدولية
          </button>
        </div>
      </div>
      )}
    </>
  )
}
const tapsRef: { current: number } = { current: 0 }

// ═══════════════ 8.5) شريط العرض داخل الحسابات (v10.6.1) ═══════════════
// نفس شريط الرئيسية الفاخر (كحلي × ذهبي بعدّاد تنازلي) — لكنه يظهر في لوحات
// الحسابات (متدرب/مدرب/إدارة) بمجرد تفعيله من إعدادات الموقع، وينطفئ تلقائياً
// عند انتهاء المهلة أو إطفاء المفتاح. يُحدَّث فوراً عند حفظ الإعدادات.
export function LuxOfferBar() {
  const [settings, setSettings] = useState<any>(__settingsCache || null)
  useEffect(() => {
    let alive = true
    fetchSiteSettings().then((d) => { if (alive) setSettings(d) })
    const onUpdated = () => { fetchSiteSettings(true).then((d) => { if (alive) setSettings(d) }) }
    window.addEventListener('fia-settings-updated', onUpdated as EventListener)
    return () => { alive = false; window.removeEventListener('fia-settings-updated', onUpdated as EventListener) }
  }, [])

  const on = !!settings && (settings.offer_active === true || settings.offer_active === 'true') && !!settings.offer_title
  if (!on) return null
  if (settings.offer_ends_at) {
    const end = new Date(settings.offer_ends_at).getTime()
    if (Number.isFinite(end) && end <= Date.now()) return null
  }

  return (
    <section dir="rtl" className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-navy via-navy-light to-navy border border-gold/40 shadow-lg shadow-navy/20 mb-5">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 16% 40%, #D4AF37 1.2px, transparent 1.2px), radial-gradient(circle at 82% 60%, #D4AF37 1px, transparent 1px)',
        backgroundSize: '30px 30px, 38px 38px',
      }} />
      <div className="absolute -top-16 left-1/3 w-64 h-64 bg-gold/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative px-4 lg:px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-center sm:text-right">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-lg flex-shrink-0">
            <Star className="w-5 h-5 text-navy" />
          </span>
          <div>
            <div className="text-gold font-black text-sm sm:text-base leading-tight">{settings.offer_title}</div>
            {settings.offer_text && (
              <div className="text-white/70 text-[11px] sm:text-xs mt-0.5">{settings.offer_text}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <LuxOfferCountdown dark endsAt={settings.offer_ends_at ? new Date(settings.offer_ends_at).toISOString() : undefined} />
          {settings.offer_link && (
            <Link
              href={settings.offer_link}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-l from-gold to-amber-400 text-navy text-xs font-black shadow-lg hover:shadow-gold/30 hover:-translate-y-0.5 active:scale-95 transition-all whitespace-nowrap"
            >
              اغتنم العرض الآن
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

// ═══════════════ 9) مراقب الأخطاء الحي — رَكب صامت (v10.6) ═══════════════
function LuxErrorWatcherMount() {
  useEffect(() => { installErrorWatcher() }, [])
  return null
}

// ═══════════════════════ 7) السحب للتحديث بحلقة ذهبية ═══════════════════════

export function LuxPullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void> | void; children: React.ReactNode }) {
  // 👑 v10.6 — داخل التطبيق الأصلي السحب للتحديث أصبح أصلياً (SwipeRefreshLayout
  // في APK v2.9.0) — نُعطّل نظير الويب هنا لمنع ازدواجية التحديث على نفس اللمسة
  const [inNative] = useState(() => {
    try { return typeof window !== 'undefined' && !!(window as any).FiaApp } catch { return false }
  })
  const wrapRef = useRef<HTMLDivElement>(null)
  const [pull, setPull] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const startY = useRef<number | null>(null)
  const pulling = useRef(false)
  const THRESHOLD = 78

  // أقرب حاوية تمرير فعلية (قد تكون أسلاف العنصر لا العنصر نفسه)
  const getScrollTop = (): number => {
    let p: HTMLElement | null = wrapRef.current?.parentElement || null
    while (p) {
      const oy = getComputedStyle(p).overflowY
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 2) return p.scrollTop
      p = p.parentElement
    }
    try { return window.scrollY || 0 } catch { return 0 }
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (inNative || spinning) return
    // 🚫 v10.18 — القائمة الجانبية (أو أي نافذة Radix) مفتوحة → لا سحب للتحديث أبداً
    // (قفل تمرير الجسم يخدع فحص أعلى الصفحة فيُطلق التحديث أثناء التمرير)
    try {
      if (document.body?.hasAttribute('data-scroll-locked')) { pulling.current = false; return }
    } catch {}
    if (getScrollTop() > 2) return
    startY.current = e.touches[0].clientY
    pulling.current = true
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (inNative || !pulling.current || startY.current === null || spinning) return
    const dy = e.touches[0].clientY - startY.current
    if (dy <= 0) { setPull(0); return }
    // مقاومة ناعمة — كلما زاد السحب قلّت الاستجابة
    setPull(Math.min(THRESHOLD + 24, dy * 0.45))
  }

  const onTouchEnd = async () => {
    pulling.current = false
    startY.current = null
    if (pull >= THRESHOLD) {
      setSpinning(true)
      setPull(THRESHOLD)
      try { await onRefresh() } catch {}
      // أدنى مدة دوران حتى تُرى الحلقة
      await new Promise((r) => setTimeout(r, 650))
      setSpinning(false)
      setPull(0)
    } else {
      setPull(0)
    }
  }

  const pct = Math.min(1, pull / THRESHOLD)

  return (
    <div
      ref={wrapRef}
      className="fia-ptr relative"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* مؤشر الحلقة الذهبية */}
      <div
        className="absolute top-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-opacity"
        style={{ opacity: pull > 4 || spinning ? 1 : 0 }}
      >
        <div
          className="w-10 h-10 rounded-full bg-white shadow-lg border border-gold/40 flex items-center justify-center"
          style={{ transform: `translateY(${spinning ? 2 : Math.min(pull, THRESHOLD) * 0.42}px)`, transition: spinning ? 'transform .3s' : 'none' }}
        >
          {spinning ? (
            <Loader2 className="w-5 h-5 text-gold animate-spin" />
          ) : (
            <RefreshCw
              className="w-5 h-5 text-gold transition-transform"
              style={{ transform: `rotate(${pct * 270}deg)`, opacity: 0.45 + pct * 0.55 }}
            />
          )}
        </div>
      </div>
      {children}
      <style jsx global>{`
        .fia-ptr { overscroll-behavior-y: contain; }
      `}</style>
    </div>
  )
}

// ═══════════════════════ 8) احتفال نهاية الدرس ═══════════════════════

export function LuxLessonCelebration({
  open, lessonTitle, nextTitle, onNext, onClose,
}: {
  open: boolean
  lessonTitle?: string
  nextTitle?: string
  onNext?: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, 2600) // 👑 v10.11 — سريعة وملكية: 2.6 ثانية بدل 7
    return () => clearTimeout(t)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[9996] flex items-center justify-center p-4" onClick={onClose} dir="rtl">
      <div className="absolute inset-0 bg-navy/55 backdrop-blur-[3px] fia-cele-backdrop" />
      {/* قصاصات ذهبية */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="fia-confetti absolute top-[-12px] rounded-sm"
            style={{
              right: `${(i * 7.3 + 4) % 96}%`,
              background: i % 3 === 0 ? '#D4AF37' : i % 3 === 1 ? '#F1D675' : '#0A1F44',
              width: i % 2 ? '7px' : '5px',
              height: i % 2 ? '11px' : '9px',
              animationDelay: `${(i % 7) * 0.22}s`,
              animationDuration: `${2.2 + (i % 4) * 0.45}s`,
            }}
          />
        ))}
      </div>
      {/* البطاقة */}
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border-2 border-gold/50 bg-white fia-cele-card" onClick={(e) => e.stopPropagation()}>
        {/* الرأس الكحلي */}
        <div className="relative bg-gradient-to-br from-navy via-navy-light to-navy px-6 pt-7 pb-12 text-center">
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 12% 50%, #D4AF37 1.4px, transparent 1.4px)', backgroundSize: '20px 20px',
          }} />
          <div className="relative inline-block">
            <div className="absolute inset-0 rounded-full bg-gold/30 blur-2xl animate-pulse" />
            {/* الختم الذهبي */}
            <div className="fia-stamp relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gold via-amber-400 to-gold flex items-center justify-center shadow-[0_0_45px_rgba(212,175,55,0.55)] border-4 border-white/40">
              <svg viewBox="0 0 52 52" className="absolute inset-0 w-full h-full">
                <circle cx="26" cy="26" r="23" fill="none" stroke="#0A1F44" strokeWidth="1.4" strokeDasharray="3 4" opacity="0.55" />
              </svg>
              <CheckCircle2 className="w-11 h-11 text-navy" strokeWidth={2.6} />
            </div>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-navy text-gold text-[11px] font-black rounded-full px-3.5 py-1 border border-gold/50 shadow-lg whitespace-nowrap">
              أُنجز ✓
            </span>
          </div>
          <button onClick={onClose} className="absolute top-3 left-3 text-gold/70 hover:text-gold"><X className="w-5 h-5" /></button>
        </div>
        {/* الجسم */}
        <div className="relative px-6 pb-6 -mt-6">
          <div className="rounded-2xl border border-gold/30 bg-gradient-to-b from-white to-gold/[0.06] p-4 text-center shadow-md">
            <div className="text-[10px] font-black text-gold/80 uppercase tracking-widest mb-1">أحسنت — درس مكتمل</div>
            {lessonTitle && <div className="text-base font-black text-navy leading-snug mb-3">{lessonTitle}</div>}
            {nextTitle ? (
              <>
                <div className="text-[11px] text-muted-foreground font-bold mb-1.5">الدرس التالي في رحلتك:</div>
                <button
                  onClick={() => { onNext?.(); onClose() }}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-gold to-amber-500 hover:from-amber-500 hover:to-gold text-navy text-sm font-black flex items-center justify-center gap-2 shadow-lg active:scale-[0.97] transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="truncate max-w-[220px]">{nextTitle}</span>
                  <ArrowUp className="w-4 h-4 rotate-90" />
                </button>
              </>
            ) : (
              <div className="text-[12px] font-bold text-navy bg-emerald-500/10 border border-emerald-500/25 rounded-xl px-3 py-2.5 text-emerald-700">
                أكملت دروس هذا المسار — توّج جهودك بالاختبار واطلب شهادتك! 👑
              </div>
            )}
            <button onClick={onClose} className="mt-3 text-[11px] font-bold text-muted-foreground hover:text-navy transition-colors">
              متابعة القراءة
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .fia-cele-backdrop { animation: celeBd .35s ease both; }
        @keyframes celeBd { from { opacity: 0; } to { opacity: 1; } }
        .fia-cele-card { animation: celeCard .55s cubic-bezier(.2,.9,.3,1.25) both; }
        @keyframes celeCard { from { opacity: 0; transform: translateY(30px) scale(.9); } to { opacity: 1; transform: none; } }
        .fia-stamp { animation: celeStamp .7s cubic-bezier(.2,1.4,.4,1) .15s both; }
        @keyframes celeStamp {
          0% { transform: scale(2.1) rotate(-14deg); opacity: 0; }
          60% { transform: scale(.94) rotate(3deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); }
        }
        .fia-confetti { animation: celeFall linear both; }
        @keyframes celeFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          12% { opacity: 1; }
          100% { transform: translateY(105vh) rotate(540deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

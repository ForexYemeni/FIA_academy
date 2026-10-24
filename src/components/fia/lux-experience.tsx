'use client'

/**
 * ============================================================================
 * 👑 lux-experience — طبقة التجربة الملكية العالمية (v10.3)
 * ============================================================================
 * مكونات عرض بصرية خالصة — صفر تعديل على قاعدة البيانات أو منطق المصادقة:
 *   1) LuxSplash          — ستارة افتتاحية ملكية (الصفحة الرئيسية، مرة لكل جلسة)
 *   2) LuxOfferCountdown  — عدّاد تنازلي فاخر للعروض المحدودة
 *   3) LuxRoyalMessage    — إعلانات الإدارة المختومة بأنواعها: إعلان/تنبيه/تحذير
 *   4) LuxCommandPalette  — بحث شامل فاخر (Ctrl+K)
 *   5) LuxSupportButton   — زر دعم سريع عائم (الجهة اليسرى)
 *   6) LuxGlobalLayer     — تركيب كل ما سبق في مكان واحد داخل layout
 *   7) LuxPullToRefresh   — سحب للتحديث بحلقة ذهبية (تُركّب حيث يلزم فقط)
 *   8) LuxLessonCelebration — احتفال نهاية الدرس: ختم «أُنجز» + الدرس التالي
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Crown, Search, X, CornerDownLeft, ArrowUp, ArrowDown,
  LifeBuoy, Mail, Phone, Send, MessageCircle, BookOpen, Home,
  GraduationCap, ShieldCheck, Download, Users, Sparkles,
  CheckCircle2, ChevronLeft, Loader2, RefreshCw,
  Megaphone, BellRing, AlertTriangle, CalendarDays,
} from 'lucide-react'
// 👑 v10.3 — القارئ الملكي لإعادة قراءة الدروس المحفوظة دون إنترنت (عرض فقط)
import { LuxRoyalReader } from '@/components/fia/lux-text-lesson'

// ═══════════════════════ إعدادات الموقع — جلب مشترك ═══════════════════════

let __settingsCache: any = null
let __settingsPromise: Promise<any> | null = null

function fetchSiteSettings(): Promise<any> {
  if (__settingsCache) return Promise.resolve(__settingsCache)
  if (!__settingsPromise) {
    __settingsPromise = fetch('/api/site-settings')
      .then((r) => r.json())
      .then((d) => { __settingsCache = d || {}; return __settingsCache })
      .catch(() => { __settingsCache = {}; return __settingsCache })
  }
  return __settingsPromise
}

function useSiteSettings() {
  const [settings, setSettings] = useState<any>(__settingsCache || null)
  useEffect(() => {
    let alive = true
    fetchSiteSettings().then((d) => { if (alive) setSettings(d) })
    return () => { alive = false }
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

// ═══════════════════════ 3) إعلانات الإدارة المختومة ═══════════════════════
// 👑 v10.4 — ثلاثة أنواع رسمية لكل إعلان (إعلان / تنبيه / تحذير) ولكل نوع شمعته
// ولونه وأيقونته، والتاريخ مطلوب ومُعروض بشكل بارز في كل بطاقة. تعمل من مفاتيح
// الإعدادات الإضافية بلا أي ترحيل قاعدة بيانات، مع دعم كامل للرسالة القديمة.

export const FIA_ANNOUNCE_TYPES: Record<string, { label: string; icon: any; seal: string; badge: string; soft: string }> = {
  announce: {
    label: 'إعلان', icon: Megaphone,
    seal: 'from-red-800 via-red-600 to-red-800',
    badge: 'bg-gold/15 text-[#8a6d1f] border-gold/45',
    soft: 'from-gold/[0.10] via-transparent to-gold/[0.04]',
  },
  notice: {
    label: 'تنبيه', icon: BellRing,
    seal: 'from-amber-700 via-amber-500 to-amber-700',
    badge: 'bg-amber-500/15 text-amber-700 border-amber-500/45',
    soft: 'from-amber-500/[0.10] via-transparent to-amber-500/[0.04]',
  },
  warning: {
    label: 'تحذير', icon: AlertTriangle,
    seal: 'from-red-950 via-red-800 to-red-950',
    badge: 'bg-red-500/15 text-red-700 border-red-500/45',
    soft: 'from-red-500/[0.10] via-transparent to-red-500/[0.04]',
  },
}

export function fiaAnnounceType(t?: string) {
  return FIA_ANNOUNCE_TYPES[t || 'announce'] || FIA_ANNOUNCE_TYPES.announce
}

// تنسيق التاريخ إلى عربي أنيق — والنص الحر يُعاد كما هو
export function fiaFormatArabicDate(iso?: string): string {
  const s = String(iso || '').trim()
  if (!s) return ''
  try {
    const d = new Date(s)
    if (isNaN(d.getTime())) return s
    return d.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch { return s }
}

// قراءة الإعلانات النشطة من الإعدادات — الأحدث أولاً — مع دعم الرسالة القديمة
export function readFiaAnnouncements(settings: any): any[] {
  let list: any[] = []
  try {
    const raw = settings?.admin_announcements
    if (raw) {
      const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(arr)) {
        list = arr.filter((a: any) => a && a.active !== false && String(a.text || '').trim())
      }
    }
  } catch {}
  if (list.length === 0) {
    const msg = String(settings?.royal_message || '').trim()
    if (msg) {
      list = [{
        id: `legacy:${msg.slice(0, 80)}`,
        type: 'announce',
        text: msg,
        date: String(settings?.royal_message_date || '').trim(),
        signature: String(settings?.royal_message_signature || '').trim() || 'إدارة أكاديمية المستقبل الدولية',
        active: true,
      }]
    }
  }
  return list
}

export function LuxRoyalMessage() {
  const pathname = usePathname()
  const settings = useSiteSettings()
  const [open, setOpen] = useState(false)
  const [pulsing, setPulsing] = useState(false)
  const list = useMemo(() => readFiaAnnouncements(settings), [settings])
  const latest = list[0] || null
  const meta = latest ? fiaAnnounceType(latest.type) : null

  // نبض الشمع فقط إذا آخر إعلان جديد (لم يُقرأ بعد)
  useEffect(() => {
    if (!latest || pathname !== '/') { setPulsing(false); return }
    let read = false
    try { read = localStorage.getItem('fia-royal-msg-read') === String(latest.id) } catch {}
    setPulsing(!read)
  }, [latest?.id, pathname])

  if (!latest || pathname !== '/' || !meta) return null

  const openLetter = () => {
    setOpen(true)
    setPulsing(false)
    try { localStorage.setItem('fia-royal-msg-read', String(latest.id)) } catch {}
  }
  const LatestIcon = meta.icon

  return (
    <>
      {/* شمع الإعلان العائم — قمة عمود الأدوات في الزاوية اليسرى */}
      <button
        onClick={openLetter}
        title="إعلانات إدارة الأكاديمية"
        aria-label="إعلانات إدارة الأكاديمية"
        className={`fixed bottom-[176px] left-6 z-[60] w-12 h-12 rounded-full bg-gradient-to-br ${meta.seal} shadow-xl border-2 border-gold/60 flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
          pulsing ? 'fia-seal-pulse' : ''
        }`}
      >
        <LatestIcon className="w-5 h-5 text-gold" strokeWidth={2.2} />
        {pulsing && <span className="absolute inset-0 rounded-full border-2 border-gold animate-ping opacity-40" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-[9992] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-navy/70 backdrop-blur-sm" />
          <div
            className="fia-letter relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl shadow-2xl border-2 border-gold/50 bg-gradient-to-b from-[#fdf8ec] to-[#f7efd9]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ترويسة البطاقة */}
            <div className="relative bg-gradient-to-r from-navy via-navy-light to-navy px-5 py-4 text-white">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at 15% 50%, #D4AF37 1.2px, transparent 1.2px)',
                backgroundSize: '18px 18px',
              }} />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
                  <LatestIcon className="w-5 h-5 text-navy" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-sm flex items-center gap-2">
                    من إدارة الأكاديمية
                    <span className={`text-[10px] font-black rounded-full px-2.5 py-0.5 border ${meta.badge} bg-navy/40 !text-gold`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="text-[10px] text-gold/80">أكاديمية المستقبل الدولية</div>
                </div>
                <button onClick={() => setOpen(false)} className="text-gold/70 hover:text-gold" aria-label="إغلاق">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {/* جسد الإعلان الأحدث — ورق فاخر */}
            <div className="relative px-6 py-6">
              <div className="absolute inset-0 opacity-[0.35] pointer-events-none" style={{
                backgroundImage: 'linear-gradient(#00000008 1px, transparent 1px)',
                backgroundSize: '100% 28px',
              }} />
              {/* التاريخ — مطلوب ويُعرض دائماً بشكل بارز */}
              {String(latest.date || '').trim() && (
                <div className="relative mb-4 inline-flex items-center gap-2 rounded-full bg-navy text-gold text-[11px] font-black px-3.5 py-1.5 border border-gold/45 shadow-md">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {fiaFormatArabicDate(latest.date)}
                </div>
              )}
              <p className="relative text-[15px] leading-8 text-[#2a2113] whitespace-pre-wrap font-semibold" dir="rtl">
                {latest.text}
              </p>
              {/* التوقيع والختم */}
              <div className="relative mt-6 flex items-end justify-between">
                <div className="text-xs text-[#6b5a33] font-bold">{latest.signature || 'إدارة أكاديمية المستقبل الدولية'}</div>
                <div className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${meta.seal} border-2 border-black/10 flex items-center justify-center shadow-lg rotate-[-8deg]`}>
                  <LatestIcon className="w-6 h-6 text-gold/90" />
                  <span className="absolute inset-1.5 rounded-full border border-gold/40" />
                </div>
              </div>
            </div>
            {/* بقية الإعلانات السارية */}
            {list.length > 1 && (
              <div className="relative border-t border-gold/30 bg-white/50 px-5 py-4">
                <div className="text-[10px] font-black text-[#8a6d1f] uppercase tracking-widest mb-2.5">إعلانات سابقة ما تزال سارية</div>
                <div className="space-y-2">
                  {list.slice(1, 6).map((a: any) => {
                    const m = fiaAnnounceType(a.type)
                    const Icon = m.icon
                    return (
                      <div key={String(a.id)} className={`relative rounded-xl border border-gold/25 bg-gradient-to-l ${m.soft} px-3 py-2.5`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 rounded-md bg-navy text-gold flex items-center justify-center flex-shrink-0">
                            <Icon className="w-3 h-3" />
                          </span>
                          <span className={`text-[9px] font-black rounded-full px-2 py-0.5 border ${m.badge}`}>{m.label}</span>
                          {String(a.date || '').trim() && (
                            <span className="text-[9px] font-bold text-[#6b5a33] flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {fiaFormatArabicDate(a.date)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] leading-5 text-[#3d3122]" dir="rtl">{a.text}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .fia-seal-pulse { animation: sealPulse 2.2s ease-in-out infinite; }
        @keyframes sealPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.5), 0 10px 30px -8px rgba(0,0,0,0.5); }
          50% { box-shadow: 0 0 0 12px rgba(212,175,55,0), 0 10px 30px -8px rgba(0,0,0,0.5); }
        }
        .fia-letter { animation: letterIn .45s cubic-bezier(.2,.9,.3,1.2) both; }
        @keyframes letterIn { from { opacity: 0; transform: translateY(26px) scale(.94); } to { opacity: 1; transform: none; } }
      `}</style>
    </>
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
      {open && <div className="fixed inset-0 z-[66]" onClick={() => setOpen(false)} />}
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
      {/* الزر العائم — قاعدة عمود الأدوات في الزاوية اليسرى */}
      <button
        onClick={() => setOpen((o) => !o)}
        title="الدعم السريع"
        aria-label="الدعم السريع"
        className="fixed bottom-6 left-5 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-navy via-navy-light to-navy text-gold shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 ring-2 ring-gold/30"
      >
        <span className="absolute inset-0 rounded-full" />
        {open ? <X className="w-6 h-6" /> : <LifeBuoy className="w-6 h-6" />}
        {!open && <span className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 border-2 border-white shadow-sm" />}
      </button>
    </>
  )
}

// ═══════════════════════ 6) الطبقة العالمية — تُركّب مرة واحدة ═══════════════════════

export function LuxGlobalLayer() {
  return (
    <>
      <LuxSplash />
      <LuxRoyalMessage />
      <LuxCommandPalette />
      <LuxSupportButton />
    </>
  )
}

// ═══════════════════════ 7) السحب للتحديث بحلقة ذهبية ═══════════════════════

export function LuxPullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void> | void; children: React.ReactNode }) {
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
    if (spinning) return
    if (getScrollTop() > 2) return
    startY.current = e.touches[0].clientY
    pulling.current = true
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current || startY.current === null || spinning) return
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

// ═══════════════════════ 9) المكتبة الملكية للقراءة دون إنترنت ═══════════════════════
// 👑 v10.3 — تُحفظ الدروس النصية المكتملة محلياً (localStorage) لتُقرأ لاحقاً حتى
// دون اتصال — تعمل داخل الموقع وفي تطبيق أندرويد (WebView) على السواء. عرض فقط.

const OFFLINE_KEY = 'fia-offline-text-lessons'

export function saveOfflineTextLesson(lesson: any) {
  try {
    if (!lesson?.id || lesson.lesson_type !== 'text' || !lesson.content?.trim()) return
    let arr: any[] = []
    try { arr = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]') } catch {}
    arr = arr.filter((l) => l.id !== lesson.id)
    arr.unshift({ id: lesson.id, title: lesson.title || 'درس', courseId: lesson.course_id || '', content: lesson.content, savedAt: Date.now() })
    if (arr.length > 30) arr = arr.slice(0, 30)
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(arr))
  } catch {}
}

export function LuxOfflineLibrary() {
  const [items, setItems] = useState<any[]>([])
  const [reading, setReading] = useState<any | null>(null)

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]')) } catch {}
  }, [])

  const remove = (id: string) => {
    try {
      const next = items.filter((l) => l.id !== id)
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(next))
      setItems(next)
    } catch {}
  }

  return (
    <div>
      {items.length === 0 ? (
        <div className="text-center py-6">
          <div className="relative inline-block mb-2.5">
            <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-lg border border-gold/30">
              <Download className="w-5 h-5 text-gold" />
            </div>
          </div>
          <p className="text-xs font-bold text-navy">مكتبتك فارغة بعد</p>
          <p className="text-[11px] text-muted-foreground mt-1">أكمل أي درس نصي ليُحفظ هنا تلقائياً — واقرأه لاحقاً حتى دون إنترنت</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground mb-1">{items.length} درساً محفوظاً — متاح للقراءة دون اتصال</p>
          {items.map((l) => (
            <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gold/25 bg-gradient-to-l from-white to-gold/[0.05] hover:border-gold/50 transition-colors">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy to-navy-light text-gold flex items-center justify-center flex-shrink-0 shadow-sm">
                <BookOpen className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-extrabold text-navy truncate">{l.title}</div>
                <div className="text-[9px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  متاح دون إنترنت
                </div>
              </div>
              <button
                onClick={() => setReading(l)}
                className="h-8 px-3 rounded-lg bg-gradient-to-r from-navy to-navy-light text-gold text-[10px] font-black flex items-center gap-1 shadow-sm active:scale-95 transition-all flex-shrink-0"
              >
                اقرأ
              </button>
              <button
                onClick={() => remove(l.id)}
                title="إزالة من المكتبة"
                className="w-8 h-8 rounded-lg border border-gold/25 text-gold/60 hover:text-red-500 hover:border-red-300 flex items-center justify-center flex-shrink-0 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* نافذة القراءة دون إنترنت — بنفس القارئ الملكي بلا منطق إكمال */}
      {reading && (
        <div className="fixed inset-0 z-[9991] flex items-center justify-center p-4" onClick={() => setReading(null)} dir="rtl">
          <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-b from-[#fdf8ec] to-white border-2 border-gold/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-navy via-navy-light to-navy text-white border-b-2 border-gold/40">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md flex-shrink-0">
                <BookOpen className="w-4 h-4 text-navy" />
              </span>
              <span className="text-xs font-black truncate flex-1">{reading.title}</span>
              <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 rounded-full px-2 py-0.5 flex-shrink-0">دون إنترنت</span>
              <button onClick={() => setReading(null)} className="text-gold/70 hover:text-gold flex-shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4">
              <LuxRoyalReader content={reading.content} />
            </div>
          </div>
        </div>
      )}
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
    const t = setTimeout(onClose, 7000)
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

'use client'

// ═══════════════════════════════════════════════════════════════════
// 👑 lux-text-lesson — وحدة الدرس النصي الملكية
// ملف مشترك واحد يخدم طرفين:
//   1) LuxRoyalReader   — قارئ الدروس النصي الفاخر (وجهة المتدرب)
//   2) LuxTextComposer  — مؤلف الدروس النصية الفاخر (وجهة المدرب/الإدارة)
// كلاهما يشاركان نفس المحلّل (formatLuxContent) فتطابق المعاينة في
// لوحة الإدارة ما يراه المتدرب حرفياً — بدون أي اختلاف.
//
// ⚡ منطق الإكمال التلقائي (onComplete) محفوظ حرفياً كما في النسخة
//   الأصلية — انظر التوثيق داخل LuxRoyalReader أدناه.
//
// صيغة التنسيق المدعومة (بلا أي مكتبات خارجية):
//   ## عنوان   ← عنوان قسم (مع ### عنوان أصغر)
//   سطر قصير ينتهي بنقطتين :  ← يُكتشف كعنوان تلقائياً
//   **نص**    ← غامق كحلي فاخر
//   ==نص==    ← تمييز ذهبي ملكي
//   > اقتباس  ← بطاقة اقتباس كحلية (أو سطر واحد محاط بـ«...»)
//   1. عنصر   ← قائمة مرقمة بدوائر كحلية ذهبية
//   - عنصر    ← قائمة نقطية بنقاط ذهبية متوهجة
//   ---       ← فاصل زخرفي ملكي
// ═══════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  FileText, Sparkles, Copy, CheckCircle2, Clock, ChevronDown,
  Maximize2, Minimize2, ListTree, Crown, Type,
  ListOrdered, List, Quote, Bold, Highlighter, Minus,
  Wand2, Keyboard, Eye, Pencil, AlignRight, X,
} from 'lucide-react'

// ───────────────────────────── أدوات قياس ─────────────────────────────

export function wordCount(text: string): number {
  const t = (text || '').trim()
  if (!t) return 0
  return t.split(/\s+/).filter(Boolean).length
}

export function estimateReadingMinutes(text: string): number {
  // متوسط سرعة القراءة العربية الهادئة ≈ 180 كلمة/دقيقة
  const w = wordCount(text)
  if (w === 0) return 0
  return Math.max(1, Math.round(w / 180))
}

// صياغة عربية سليمة لعدد الدقائق
export function readingLabel(min: number): string {
  if (min <= 0) return 'أقل من دقيقة'
  if (min === 1) return 'دقيقة قراءة واحدة'
  if (min === 2) return 'دقيقتا قراءة'
  if (min >= 3 && min <= 10) return `${min} دقائق قراءة`
  return `${min} دقيقة قراءة`
}

// ───────────────────────── كشف العناوين ───────────────────────────────

// 👑 نفس المسند يُستخدم في extractHeadings وفي formatLuxContent حتى
// يتطابق الفهرس مع العناوين المعروضة حرفياً وبنفس الترتيب.
export function isHeadingBlock(trimmed: string): boolean {
  if (/^#{2,3}\s+/.test(trimmed)) return true
  return trimmed.length < 80 && (trimmed.endsWith(':') || trimmed.endsWith('：')) && !trimmed.includes('\n')
}

function headingTitle(trimmed: string): string {
  let t = trimmed.replace(/^#{2,3}\s+/, '')
  t = t.replace(/\s*[:：]\s*$/, '')
  return t
}

export interface HeadingItem {
  id: string
  title: string
}

export function extractHeadings(text: string): HeadingItem[] {
  const out: HeadingItem[] = []
  const blocks = (text || '').split('\n\n')
  for (const raw of blocks) {
    const trimmed = raw.trim()
    if (!trimmed || !isHeadingBlock(trimmed)) continue
    out.push({ id: `sec-${out.length}`, title: headingTitle(trimmed) })
  }
  return out
}

// ─────────────────────── التنسيق داخل السطر ───────────────────────────

// **غامق** و ==تمييز== — تحويل نصي آمن بلا HTML
function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const re = /(\*\*([^*\n]+)\*\*)|(==([^=\n]+)==)/g
  const parts: React.ReactNode[] = []
  let last = 0
  let i = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[2] !== undefined) {
      parts.push(
        <strong
          key={`${keyBase}-b${i++}`}
          className="text-navy font-extrabold bg-gradient-to-l from-gold/15 to-transparent bg-[length:100%_38%] bg-no-repeat bg-bottom rounded-sm px-0.5"
        >
          {m[2]}
        </strong>
      )
    } else if (m[4] !== undefined) {
      parts.push(
        <mark
          key={`${keyBase}-h${i++}`}
          className="bg-gradient-to-l from-gold/30 to-gold/15 text-navy font-bold rounded-md px-1.5 py-0.5 border border-gold/40 shadow-[0_1px_4px_rgba(212,175,55,0.25)]"
        >
          {m[4]}
        </mark>
      )
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// ───────────────────────── المُنسِّق الرئيسي ───────────────────────────

interface FormatOptions {
  // إضافة حرف استهلالي ذهبي ضخم لأول فقرة عادية (جمالية القارئ الملكي)
  dropCap?: boolean
}

export function formatLuxContent(text: string, opts: FormatOptions = {}): React.ReactNode[] {
  const blocks = (text || '').split('\n\n')
  const nodes: React.ReactNode[] = []
  let headingIdx = 0
  let firstParagraphDone = !opts.dropCap

  blocks.forEach((raw, pi) => {
    const trimmed = raw.trim()
    if (!trimmed) return

    // 1) فاصل زخرفي ملكي
    if (/^(-{3,}|\*{3,}|~{3,})$/.test(trimmed)) {
      nodes.push(
        <div key={`d${pi}`} className="flex items-center gap-3 my-8 px-2" dir="ltr" aria-hidden="true">
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gold/60 to-gold/40" />
          <div className="w-2.5 h-2.5 rotate-45 bg-gradient-to-br from-gold to-amber-500 shadow-[0_0_10px_rgba(212,175,55,0.55)]" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/60 to-gold/40" />
        </div>
      )
      return
    }

    const lines = trimmed.split('\n')

    // 2) اقتباس ملكي — أسطر متتالية تبدأ بـ > أو سطر واحد محاط بـ« »
    const allQuote = lines.length > 0 && lines.every(l => l.trim().startsWith('>'))
    const singleWrapped = lines.length === 1 && trimmed.startsWith('«') && trimmed.endsWith('»') && trimmed.length > 2
    if (allQuote || singleWrapped) {
      const body = singleWrapped
        ? trimmed.slice(1, -1)
        : lines.map(l => l.trim().replace(/^>\s?/, '')).join('\n')
      nodes.push(
        <blockquote
          key={`q${pi}`}
          dir="rtl"
          className="relative my-7 mx-1 rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy text-white px-6 py-5 shadow-xl border border-gold/40 overflow-hidden"
        >
          <div className="absolute inset-0 opacity-15 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 15% 40%, #D4AF37 1.2px, transparent 1.2px), radial-gradient(circle at 85% 70%, white 1px, transparent 1px)',
            backgroundSize: '22px 22px, 16px 16px',
          }} />
          <div className="absolute -top-6 -left-6 w-20 h-20 bg-gold/20 rounded-full blur-2xl pointer-events-none" />
          <span className="absolute top-1 right-3 text-5xl leading-none text-gold/40 font-serif select-none" aria-hidden="true">«</span>
          <p className="relative text-white/95 text-[0.98em] leading-[2] text-right whitespace-pre-line">
            {renderInline(body, `q${pi}`)}
          </p>
          <div className="relative mt-3 h-0.5 w-20 rounded-full bg-gradient-to-l from-gold/80 to-gold/20" />
        </blockquote>
      )
      return
    }

    // 3) عناوين الأقسام — ## أو سطر قصير ينتهي بنقطتين
    if (isHeadingBlock(trimmed)) {
      const isDeep = /^###\s+/.test(trimmed)
      const id = `sec-${headingIdx++}`
      nodes.push(
        <h3
          key={`h${pi}`}
          id={id}
          dir="rtl"
          className={`scroll-mt-4 relative mt-8 mb-4 pr-5 font-extrabold text-navy ${isDeep ? 'text-[1.08em]' : 'text-[1.22em]'}`}
        >
          <span
            className={`absolute right-0 top-1.5 bottom-1.5 w-[3.5px] rounded-full bg-gradient-to-b from-gold via-amber-400 to-gold/50 shadow-[0_0_6px_rgba(212,175,55,0.45)]`}
            aria-hidden="true"
          />
          {renderInline(headingTitle(trimmed), `h${pi}`)}
        </h3>
      )
      return
    }

    // 4) قائمة مرقمة ملكية — دوائر كحلية بأرقام ذهبية
    if (lines.length > 1 && lines.every(l => /^\d+[\.\)]\s/.test(l.trim()))) {
      nodes.push(
        <ol key={`ol${pi}`} dir="rtl" className="space-y-3.5 my-6 list-none pr-1">
          {lines.map((line, li) => {
            const num = line.trim().match(/^(\d+)/)?.[1] || (li + 1)
            const body = line.trim().replace(/^\d+[\.\)]\s*/, '')
            return (
              <li key={li} className="flex flex-row-reverse items-start gap-3.5">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-navy via-navy-light to-navy text-gold text-xs font-extrabold flex items-center justify-center shadow-md border border-gold/40 ring-2 ring-gold/15 mt-0.5">
                  {num}
                </span>
                <span className="text-right break-words leading-[2.05] text-foreground/90 flex-1 pt-1">
                  {renderInline(body, `ol${pi}-${li}`)}
                </span>
              </li>
            )
          })}
        </ol>
      )
      return
    }

    // 5) قائمة نقطية ذهبية متوهجة
    if (lines.length > 1 && lines.every(l => /^[-•▪]\s/.test(l.trim()))) {
      nodes.push(
        <ul key={`ul${pi}`} dir="rtl" className="space-y-3 my-6 list-none pr-1">
          {lines.map((line, li) => {
            const body = line.trim().replace(/^[-•▪]\s*/, '')
            return (
              <li key={li} className="flex flex-row-reverse items-start gap-3">
                <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-gradient-to-br from-gold to-amber-500 mt-3 shadow-[0_0_8px_rgba(212,175,55,0.65)]" aria-hidden="true" />
                <span className="text-right break-words leading-[2.05] text-foreground/90 flex-1">
                  {renderInline(body, `ul${pi}-${li}`)}
                </span>
              </li>
            )
          })}
        </ul>
      )
      return
    }

    // 6) فقرة عادية فاخرة — مع حرف استهلالي ذهبي لأول فقرة
    const isFirstPara = !firstParagraphDone
    if (isFirstPara) firstParagraphDone = true
    nodes.push(
      <p
        key={`p${pi}`}
        dir="rtl"
        className={
          isFirstPara
            ? 'lux-dropcap text-right break-words text-foreground/92 leading-[2.15] mb-5'
            : 'text-right break-words text-foreground/90 leading-[2.15] mb-5'
        }
      >
        {trimmed.split('\n').map((line, li) => (
          <span key={li} className="block">
            {renderInline(line, `p${pi}-${li}`)}
          </span>
        ))}
      </p>
    )
  })

  return nodes
}

// ═══════════════════════ القارئ الملكي ═══════════════════════════════
// 👑 LuxRoyalReader — تجربة قراءة فاخرة كاملة للدرس النصي:
//    شريط تقدم قراءة ذهبي حي + فهرس عناوين تفاعلي + حرف استهلالي +
//    تحكم بحجم الخط (محفوظ محلياً) + وضع التوسيع + إحصاءات قراءة.
//
// ⚡ onComplete — منطق الإكمال التلقائي (منقول حرفياً من النسخة الأصلية
//   ويجب ألا يُخالف — تتبّع تقدم المتدرب يعتمد عليه):
//   1. محتوى قصير لا يحتاج تمريراً: يُطلق بعد 3 ثوانٍ من العرض.
//   2. محتوى طويل: يُطلق عند بلوغ أسفل التمرير بهامش 30px.
//   3. شبكة أمان: يُطلق إجبارياً بعد 12 ثانية.
//   كل ذلك يُطلق مرة واحدة فقط لكل جلسة درس.
export function LuxRoyalReader({ content, onComplete }: { content?: string; onComplete?: () => void }) {
  const [copied, setCopied] = useState(false)
  const [fontPx, setFontPx] = useState(16)
  const [expanded, setExpanded] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const [progress, setProgress] = useState(0)

  const firedRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const shortDwellTimerRef = useRef<any>(null)
  const safetyNetTimerRef = useRef<any>(null)

  // حجم الخط الملكي — محفوظ في المتصفح لكل متدرب
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fia-reader-font')
      if (saved) {
        const n = parseInt(saved, 10)
        if (n >= 14 && n <= 21) setFontPx(n)
      }
    } catch { /* تجاهل */ }
  }, [])

  const changeFont = (delta: number) => {
    setFontPx(prev => {
      const next = Math.min(21, Math.max(14, prev + delta))
      try { localStorage.setItem('fia-reader-font', String(next)) } catch { /* تجاهل */ }
      return next
    })
  }

  // ⚡ إطلاق الإكمال مرة واحدة بالضبط مع تنظيف كل المؤقتات
  const fireNow = () => {
    if (firedRef.current) return
    if (!onComplete) return
    firedRef.current = true
    if (shortDwellTimerRef.current) { clearTimeout(shortDwellTimerRef.current); shortDwellTimerRef.current = null }
    if (safetyNetTimerRef.current) { clearTimeout(safetyNetTimerRef.current); safetyNetTimerRef.current = null }
    onComplete()
  }

  // ⚡ إعادة الضبط + المؤقتات عند تغيّر المحتوى (حرفياً كالأصل)
  useEffect(() => {
    firedRef.current = false
    setProgress(0)
    if (!onComplete || !content) return

    safetyNetTimerRef.current = setTimeout(() => {
      fireNow()
    }, 12000)

    const measureTimer = setTimeout(() => {
      const el = scrollContainerRef.current
      if (!el) return
      const hasScrollbar = el.scrollHeight > el.clientHeight + 2
      if (!hasScrollbar) {
        setProgress(1)
        shortDwellTimerRef.current = setTimeout(() => {
          fireNow()
        }, 3000)
      }
      // إن وُجد تمرير فمعالج onScroll في JSX أدناه يطلق الإكمال عند الأسفل
    }, 600)

    return () => {
      if (measureTimer) clearTimeout(measureTimer)
      if (shortDwellTimerRef.current) { clearTimeout(shortDwellTimerRef.current); shortDwellTimerRef.current = null }
      if (safetyNetTimerRef.current) { clearTimeout(safetyNetTimerRef.current); safetyNetTimerRef.current = null }
    }
  }, [content, onComplete])

  // الفهرس والإحصاءات — محسوبة مرة واحدة لكل محتوى
  const headings = useMemo(() => (content ? extractHeadings(content) : []), [content])
  const minutes = useMemo(() => (content ? estimateReadingMinutes(content) : 0), [content])
  const rendered = useMemo(
    () => (content ? formatLuxContent(content, { dropCap: true }) : []),
    [content]
  )

  // قفزة سلسة إلى قسم من الفهرس
  const jumpTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!content) {
    // 👑 حالة الفراغ الملكية — نفس روح الأصل
    return (
      <div className="relative text-center py-12 bg-gradient-to-br from-white to-gold/5 border border-gold/30 rounded-xl overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-70" />
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />
        <div className="relative inline-block mb-3">
          <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-md border border-gold/30">
            <FileText className="w-8 h-8 text-gold" />
          </div>
        </div>
        <p className="relative text-muted-foreground">لا يوجد محتوى نصي لهذا الدرس</p>
      </div>
    )
  }

  return (
    <div dir="rtl" className="relative bg-gradient-to-br from-white via-white to-gold/[0.06] border border-gold/30 rounded-2xl shadow-lg overflow-hidden">
      {/* ═══ شريط تقدم القراءة الذهبي الحي ═══ */}
      <div className="absolute top-0 right-0 left-0 h-1 z-20 bg-gold/15" aria-hidden="true">
        <div
          className="h-full bg-gradient-to-l from-gold via-amber-400 to-gold-light shadow-[0_0_8px_rgba(212,175,55,0.7)] transition-[width] duration-150 ease-out"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      {/* توهج سحري علوي */}
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-gold/15 rounded-full blur-2xl pointer-events-none" />

      {/* ═══ رأس القارئ الملكي ═══ */}
      <div className="relative flex flex-wrap items-center gap-2 px-4 md:px-6 py-3 bg-gradient-to-r from-navy via-navy-light to-navy text-white">
        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md flex-shrink-0">
          <Crown className="w-4.5 h-4.5 text-navy" strokeWidth={2.2} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] md:text-sm font-bold flex items-center gap-1.5 leading-tight">
            محتوى الدرس
            <Sparkles className="w-3.5 h-3.5 text-gold/80" />
          </span>
          <span className="text-[10px] md:text-[11px] text-gold/75 flex items-center gap-1.5 leading-tight mt-0.5">
            <Clock className="w-3 h-3" />
            {readingLabel(minutes)}
          </span>
        </div>
        <div className="flex-1" />

        {/* تحكم حجم الخط */}
        <div className="flex items-center gap-0.5 bg-[#050C1F]/55 border border-gold/25 rounded-lg px-0.5 py-0.5" dir="ltr">
          <button
            onClick={() => changeFont(-1)}
            disabled={fontPx <= 14}
            className="w-7 h-7 rounded-md text-gold/85 hover:text-gold hover:bg-gold/15 flex items-center justify-center text-[11px] font-black transition-all active:scale-90 disabled:opacity-30"
            title="تصغير الخط"
          >
            أ-
          </button>
          <span className="w-6 text-center text-[10px] text-gold/60 font-bold tabular-nums">{fontPx}</span>
          <button
            onClick={() => changeFont(1)}
            disabled={fontPx >= 21}
            className="w-7 h-7 rounded-md text-gold/85 hover:text-gold hover:bg-gold/15 flex items-center justify-center text-[13px] font-black transition-all active:scale-90 disabled:opacity-30"
            title="تكبير الخط"
          >
            أ+
          </button>
        </div>

        {/* توسيع / تقليص مساحة القراءة */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-8 h-8 rounded-lg text-gold/85 hover:text-gold hover:bg-gold/15 border border-gold/25 flex items-center justify-center transition-all active:scale-95"
          title={expanded ? 'تقليص مساحة القراءة' : 'وضع القراءة الموسّعة'}
        >
          {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* نسخ المحتوى */}
        <button
          onClick={() => {
            navigator.clipboard.writeText(content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="text-[10px] md:text-xs text-gold/85 hover:text-gold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-gold/10 border border-gold/30 transition-all active:scale-95"
          title="نسخ المحتوى"
        >
          {copied ? <><CheckCircle2 className="w-3 h-3" /> تم النسخ</> : <><Copy className="w-3 h-3" /> نسخ</>}
        </button>
      </div>

      {/* ═══ فهرس الدرس التفاعلي ═══ */}
      {headings.length >= 2 && (
        <div className="relative mx-4 md:mx-6 mt-4 rounded-xl border border-gold/35 bg-gradient-to-br from-gold/[0.07] to-gold/[0.03] overflow-hidden">
          <button
            onClick={() => setTocOpen(o => !o)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold text-navy hover:bg-gold/10 transition-colors"
          >
            <ListTree className="w-4 h-4 text-gold" />
            فهرس الدرس
            <span className="text-[10px] bg-gradient-to-br from-navy to-navy-light text-gold rounded-full px-2 py-0.5 font-bold border border-gold/30">
              {headings.length} أقسام
            </span>
            <ChevronDown className={`w-4 h-4 mr-auto text-gold transition-transform duration-300 ${tocOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`grid transition-all duration-300 ease-in-out ${tocOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
            <div className="overflow-hidden">
              <ol className="px-3 pb-3 space-y-1">
                {headings.map((h, i) => (
                  <li key={h.id}>
                    <button
                      onClick={() => jumpTo(h.id)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-right text-xs text-foreground/80 hover:text-navy hover:bg-gold/15 group transition-all"
                    >
                      <span className="flex-shrink-0 w-5 h-5 rounded-md bg-gold/15 border border-gold/40 text-[10px] font-black text-navy flex items-center justify-center group-hover:bg-gold/30 transition-colors">
                        {i + 1}
                      </span>
                      <span className="flex-1 font-semibold truncate">{h.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* ═══ متن القراءة — ورق ملكي بنقاط ذهبية باهتة ═══ */}
      <div
        ref={scrollContainerRef}
        onScroll={(e) => {
          // ⚡ إطلاق الإكمال عند الاقتراب من الأسفل (هامش 30px — حرفياً كالأصل)
          if (firedRef.current || !onComplete) return
          const el = e.currentTarget
          const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
          const total = el.scrollHeight - el.clientHeight
          setProgress(total > 2 ? Math.min(1, Math.max(0, el.scrollTop / total)) : 1)
          if (distanceFromBottom <= 30) {
            fireNow()
          }
        }}
        className={`relative px-5 md:px-9 py-6 md:py-8 overflow-y-auto transition-[max-height] duration-500 ease-in-out lux-reader-scroll ${expanded ? 'max-h-[80vh]' : 'max-h-[60vh]'}`}
      >
        {/* نسيج ورقي ذهبي خافت */}
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          aria-hidden="true"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(212,175,55,0.045) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative max-w-[46rem] mx-auto" dir="rtl" style={{ fontSize: `${fontPx}px` }}>
          {rendered}

          {/* ═══ زخرفة ختام الدرس ═══ */}
          <div className="relative mt-12 mb-1 text-center" aria-hidden="true">
            <div className="flex items-center justify-center gap-3">
              <div className="w-16 h-px bg-gradient-to-l from-transparent to-gold/70" />
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy via-navy-light to-navy border border-gold/45 flex items-center justify-center shadow-md">
                <Sparkles className="w-4.5 h-4.5 text-gold" />
              </div>
              <div className="w-16 h-px bg-gradient-to-r from-transparent to-gold/70" />
            </div>
            <p className="mt-3 text-[0.68em] text-muted-foreground/80 font-semibold tracking-wide">
              انتهى محتوى الدرس — واصل التقدم نحو التميّز ✦
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* شريط تمرير ملكي ذهبي */
        .lux-reader-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .lux-reader-scroll::-webkit-scrollbar-track {
          background: rgba(212, 175, 55, 0.07);
          border-radius: 8px;
        }
        .lux-reader-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #d4af37, #b08d2a);
          border-radius: 8px;
        }
        .lux-reader-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #e5c158, #d4af37);
        }
        /* تحديد نص بذهبي ملكي */
        .lux-reader-scroll ::selection {
          background: rgba(212, 175, 55, 0.35);
          color: #0b1635;
        }
        /* الحرف الاستهلالي الذهبي — أول فقرة فقط */
        .lux-dropcap:first-letter {
          float: right;
          font-size: 2.7em;
          line-height: 0.9;
          font-weight: 800;
          color: #0b1635;
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.22), rgba(212, 175, 55, 0.08));
          border: 1.5px solid rgba(212, 175, 55, 0.55);
          border-radius: 12px;
          padding: 0.12em 0.3em;
          margin-left: 0.45em;
          margin-top: 0.15em;
          box-shadow: 0 2px 10px rgba(212, 175, 55, 0.25);
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════ المؤلف الملكي ═══════════════════════════════
// 👑 LuxTextComposer — محرر الدروس النصية الفاخر في لوحة الإدارة/المدرب:
//    شريط أدوات تنسيق (عنوان/قوائم/اقتباس/غامق/تمييز/فاصل) + تبويب
//    معاينة حية مطابق للقارئ الملكي + إحصاءات حية (كلمات/أحرف/وقت
//    قراءة) + قوالب جاهزة + تحرير بملء الشاشة + اختصار Ctrl+B.
export function LuxTextComposer({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [view, setView] = useState<'edit' | 'preview'>('edit')
  const [fullEdit, setFullEdit] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [mounted, setMounted] = useState(false)
  const taRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => { setMounted(true) }, [])

  const words = wordCount(value)
  const chars = (value || '').length
  const minutes = estimateReadingMinutes(value)

  // ─── أدوات تحرير النص عبر تحديد المؤشر ───
  const withTextarea = (fn: (ta: HTMLTextAreaElement) => void) => {
    const ta = taRef.current
    if (ta) fn(ta)
  }

  const restore = (s: number, e: number) => {
    setTimeout(() => {
      withTextarea(ta => { ta.focus(); ta.setSelectionRange(s, e) })
    }, 0)
  }

  // لفّ التحديد الحالي ببادئة ولاحقة (غامق / تمييز)
  const applyWrap = (before: string, after: string, fallback = 'نص') => {
    withTextarea(ta => {
      const s = ta.selectionStart
      const e = ta.selectionEnd
      const sel = value.slice(s, e)
      const body = sel || fallback
      const next = value.slice(0, s) + before + body + after + value.slice(e)
      onChange(next)
      restore(s + before.length, s + before.length + body.length)
    })
  }

  // إدراج نص عند المؤشر (فاصل / قالب)
  const insertAt = (txt: string) => {
    withTextarea(ta => {
      const s = ta.selectionStart
      const e = ta.selectionEnd
      const next = value.slice(0, s) + txt + value.slice(e)
      onChange(next)
      restore(s + txt.length, s + txt.length)
    })
  }

  // تطبيق دالة على كل سطر من أسطر التحديد (عنوان / قوائم / اقتباس)
  const applyLinePrefix = (make: (line: string, i: number) => string) => {
    withTextarea(ta => {
      const s = ta.selectionStart
      const e = ta.selectionEnd
      const start = value.lastIndexOf('\n', Math.max(0, s - 1)) + 1
      let end = value.indexOf('\n', e)
      if (end === -1) end = value.length
      const block = value.slice(start, end)
      const nextBlock = block.split('\n').map((l, i) => make(l, i)).join('\n')
      onChange(value.slice(0, start) + nextBlock + value.slice(end))
      restore(start, start + nextBlock.length)
    })
  }

  const TOOLS = [
    { id: 'heading', label: 'عنوان', icon: Type, title: 'عنوان قسم (## )',
      run: () => applyLinePrefix(l => `## ${l.replace(/^#{1,3}\s*/, '')}`) },
    { id: 'ol', label: 'قائمة مرقمة', icon: ListOrdered, title: 'قائمة مرقمة',
      run: () => applyLinePrefix((l, i) => `${i + 1}. ${l.replace(/^\d+[\.\)]\s*/, '').replace(/^[-•▪]\s*/, '')}`) },
    { id: 'ul', label: 'نقاط', icon: List, title: 'قائمة نقطية',
      run: () => applyLinePrefix(l => `- ${l.replace(/^[-•▪]\s*/, '').replace(/^\d+[\.\)]\s*/, '')}`) },
    { id: 'quote', label: 'اقتباس', icon: Quote, title: 'اقتباس',
      run: () => applyLinePrefix(l => l.trim().startsWith('>') ? l.trim().replace(/^>\s?/, '') : `> ${l.trim()}`) },
    { id: 'bold', label: 'غامق', icon: Bold, title: 'غامق (Ctrl+B)',
      run: () => applyWrap('**', '**') },
    { id: 'mark', label: 'تمييز', icon: Highlighter, title: 'تمييز ذهبي',
      run: () => applyWrap('==', '==') },
    { id: 'divider', label: 'فاصل', icon: Minus, title: 'فاصل زخرفي',
      run: () => insertAt('\n\n---\n\n') },
  ]

  // اختصار Ctrl+B للغامق
  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault()
      applyWrap('**', '**')
    }
  }

  // ─── القوالب الجاهزة ───
  const TEMPLATES = [
    {
      id: 'detailed', label: 'درس تفصيلي',
      text: `## مقدمة الدرس\nاكتب هنا مقدمة جذابة تُعرّف المتدرب بما سيتعلمه في هذا الدرس ولماذا هو مهم له.\n\n## الفكرة الأساسية\nاشرح المفهوم الرئيسي بوضوح وأمثلة واقعية...\n\n> اكتب هنا القاعدة الذهبية التي تريد أن يتذكرها المتدرب للأبد.\n\n## خطوات التطبيق\n1. الخطوة الأولى — اشرحها بالتفصيل...\n2. الخطوة الثانية — ادعمها بمثال...\n3. الخطوة الثالثة — وضّح نتيجتها...\n\n## الخلاصة\nلخّص أهم النقاط واربطها بما سيأتي في الدرس القادم.`
    },
    {
      id: 'points', label: 'ملخص نقاط',
      text: `## ملخص سريع\n- النقطة الأولى المهمة...\n- النقطة الثانية...\n- النقطة الثالثة...\n\n==تذكر==: ركّز هنا على الرسالة الجوهرية للدرس.`
    },
    {
      id: 'article', label: 'مقالة طويلة',
      text: `## افتتاحية\nابدأ بقصة أو سؤال مثير يجذب انتباه المتدرب من أول سطر...\n\n---\n\n## القسم الأول: الأساسيات\nاشرح الأساس النظري هنا بأسلوب سلس ومقروء.\n\n> الاقتباس الملهم يضيف روحاً للنص.\n\n## القسم الثاني: التطبيق العملي\n1. ابدأ بالأبسط...\n2. ثم تدرّج للأصعب...\n3. اختم بتحدٍ عملي...\n\n---\n\n## الخاتمة\nاختم برسالة قوية تدفع المتدرب للعمل على ما تعلمه فوراً.`
    },
  ]

  const applyTemplate = (tplText: string) => {
    if (!value || !value.trim()) {
      onChange(tplText)
    } else {
      onChange(value.replace(/\s*$/, '') + '\n\n' + tplText)
    }
    setView('edit')
  }

  // 👑 خانة التحرير تُرسم مباشرة (لا كمكوّن داخلي) حتى لا يُفقد التركيز
  // مع كل ضغطة — وعند فتح ملء الشاشة تُخفى كي لا تتنازع ref واحدة.
  const composerTextarea = (
    <textarea
      ref={taRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      dir="rtl"
      rows={10}
      placeholder={'اكتب محتوى الدرس هنا...\n\nتلميح: استخدم شريط الأدوات للتنسيق\n## عنوان قسم — **غامق** — ==تمييز ذهبي== — > اقتباس'}
      className="w-full rounded-xl border border-gold/35 bg-white/90 px-4 py-3.5 text-sm leading-[2] text-foreground placeholder:text-muted-foreground/50 shadow-[inset_0_1px_4px_rgba(11,22,53,0.07)] focus:border-gold focus:ring-2 focus:ring-gold/25 focus:outline-none resize-y transition-all"
    />
  )

  return (
    <div dir="rtl" className="relative rounded-2xl border border-gold/40 bg-gradient-to-br from-navy/[0.045] via-white to-gold/[0.07] shadow-md overflow-hidden">
      {/* شريط ذهبي علوي */}
      <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-gold via-amber-400 to-gold opacity-80" />
      <div className="absolute -top-8 -left-8 w-28 h-28 bg-gold/15 rounded-full blur-2xl pointer-events-none" />

      {/* ═══ ترويسة المؤلف ═══ */}
      <div className="relative flex flex-wrap items-center gap-2 px-4 pt-4 pb-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-navy via-navy-light to-navy border border-gold/40 flex items-center justify-center shadow-md flex-shrink-0">
          <Crown className="w-4.5 h-4.5 text-gold" strokeWidth={2.2} />
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-extrabold text-navy flex items-center gap-1.5 leading-tight">
            محتوى الدرس النصي
            <Sparkles className="w-3.5 h-3.5 text-gold" />
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
            اكتب المحتوى — والمعاينة الحية تطابق ما يراه المتدرب حرفياً
          </span>
        </div>
        <div className="flex-1" />

        {/* قوالب جاهزة */}
        <div className="flex items-center gap-1">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t.text)}
              className="text-[10px] font-bold text-navy/80 bg-gold/12 hover:bg-gold/25 border border-gold/35 rounded-lg px-2.5 py-1.5 transition-all active:scale-95 whitespace-nowrap"
              title={`إدراج قالب: ${t.label}`}
            >
              <Wand2 className="w-3 h-3 inline-block ml-1 text-gold" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ شريط أدوات التنسيق ═══ */}
      <div className="relative flex flex-wrap items-center gap-1.5 px-4 pb-3">
        {TOOLS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={t.run}
            title={t.title}
            className="h-8 min-w-8 px-2 rounded-lg border border-navy/15 bg-white/85 hover:border-gold hover:bg-gold/15 text-navy/80 hover:text-navy flex items-center justify-center gap-1 text-[11px] font-bold transition-all active:scale-90 shadow-sm"
          >
            <t.icon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
        <div className="flex-1" />
        {/* مساعد الصيغة */}
        <button
          type="button"
          onClick={() => setShowHelp(h => !h)}
          className="h-8 px-2.5 rounded-lg border border-gold/35 bg-gold/10 hover:bg-gold/20 text-navy flex items-center gap-1 text-[11px] font-bold transition-all active:scale-95"
          title="دليل صيغ التنسيق"
        >
          <Keyboard className="w-3.5 h-3.5 text-gold" />
          دليل الصيغة
        </button>
      </div>

      {/* ═══ دليل الصيغ القابل للطي ═══ */}
      <div className={`grid transition-all duration-300 ${showHelp ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="mx-4 mb-3 rounded-xl border border-gold/30 bg-navy/[0.035] px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-foreground/75">
            <span><code className="text-navy font-bold" dir="ltr">## عنوان</code> — قسم رئيسي</span>
            <span><code className="text-navy font-bold" dir="ltr">### عنوان</code> — قسم فرعي</span>
            <span><code className="text-navy font-bold" dir="ltr">**غامق**</code> — نص بارز</span>
            <span><code className="text-navy font-bold" dir="ltr">==تمييز==</code> — خلفية ذهبية</span>
            <span><code className="text-navy font-bold" dir="ltr">&gt; اقتباس</code> — بطاقة كحلية</span>
            <span><code className="text-navy font-bold" dir="ltr">---</code> — فاصل زخرفي</span>
            <span><code className="text-navy font-bold" dir="ltr">1. عنصر</code> — قائمة مرقمة</span>
            <span><code className="text-navy font-bold" dir="ltr">- عنصر</code> — قائمة نقطية</span>
            <span>سطر قصير ينتهي بـ<strong className="text-navy">:</strong> — يصبح عنواناً تلقائياً</span>
          </div>
        </div>
      </div>

      {/* ═══ تبويبات: تحرير / معاينة ═══ */}
      <div className="relative flex items-center gap-1.5 mx-4 mb-3 bg-navy/[0.05] border border-navy/10 rounded-xl p-1 w-fit">
        <button
          type="button"
          onClick={() => setView('edit')}
          className={`h-8 px-4 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all ${view === 'edit' ? 'bg-gradient-to-br from-navy to-navy-light text-gold shadow-md border border-gold/40' : 'text-muted-foreground hover:text-navy'}`}
        >
          <Pencil className="w-3.5 h-3.5" />
          تحرير
        </button>
        <button
          type="button"
          onClick={() => setView('preview')}
          className={`h-8 px-4 rounded-lg text-[11px] font-extrabold flex items-center gap-1.5 transition-all ${view === 'preview' ? 'bg-gradient-to-br from-navy to-navy-light text-gold shadow-md border border-gold/40' : 'text-muted-foreground hover:text-navy'}`}
        >
          <Eye className="w-3.5 h-3.5" />
          معاينة حية
        </button>
      </div>

      {/* ═══ منطقة التحرير أو المعاينة ═══ */}
      <div className="relative px-4 pb-3">
        {view === 'edit' ? (
          fullEdit ? null : composerTextarea
        ) : (
          <div className="rounded-xl border border-gold/30 bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-navy via-navy-light to-navy text-white">
              <Eye className="w-3.5 h-3.5 text-gold" />
              <span className="text-[11px] font-bold">هكذا سيقرأ المتدرب درسك تماماً</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto px-5 py-5 lux-reader-scroll" dir="rtl">
              {value && value.trim() ? (
                formatLuxContent(value)
              ) : (
                <p className="text-center text-xs text-muted-foreground py-8">اكتب شيئاً في تبويب التحرير لتظهر المعاينة هنا</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ شريط الإحصاءات الحية ═══ */}
      <div className="relative flex flex-wrap items-center gap-2 px-4 py-2.5 bg-gradient-to-l from-navy/[0.05] to-gold/[0.08] border-t border-gold/25">
        <span className="text-[10.5px] font-bold text-navy/75 flex items-center gap-1 bg-white/70 border border-gold/25 rounded-full px-2.5 py-1">
          <Type className="w-3 h-3 text-gold" />
          {words} كلمة
        </span>
        <span className="text-[10.5px] font-bold text-navy/75 flex items-center gap-1 bg-white/70 border border-gold/25 rounded-full px-2.5 py-1">
          <AlignRight className="w-3 h-3 text-gold" />
          {chars} حرف
        </span>
        <span className="text-[10.5px] font-bold text-navy/75 flex items-center gap-1 bg-white/70 border border-gold/25 rounded-full px-2.5 py-1">
          <Clock className="w-3 h-3 text-gold" />
          {readingLabel(minutes)}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setFullEdit(true)}
          className="text-[10.5px] font-extrabold text-navy bg-gradient-to-l from-gold/25 to-gold/10 hover:from-gold/40 hover:to-gold/20 border border-gold/40 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-all active:scale-95"
        >
          <Maximize2 className="w-3 h-3" />
          تحرير بملء الشاشة
        </button>
      </div>

      {/* ═══ وضع التحرير بملء الشاشة ═══ */}
      {mounted && fullEdit && typeof document !== 'undefined' && createPortal(
        <div dir="rtl" className="fixed inset-0 z-[9999] bg-gradient-to-br from-navy via-[#0d1a3d] to-navy flex flex-col" role="dialog" aria-label="محرر الدرس بملء الشاشة">
          {/* زخرفة الخلفية */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
            backgroundImage: 'radial-gradient(circle at 10% 30%, #D4AF37 1.2px, transparent 1.2px), radial-gradient(circle at 90% 70%, white 1px, transparent 1px)',
            backgroundSize: '26px 26px, 20px 20px',
          }} />
          {/* الترويسة */}
          <div className="relative flex items-center gap-3 px-5 py-4 border-b border-gold/30">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-lg">
              <Crown className="w-5 h-5 text-navy" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <span className="text-white font-extrabold text-sm flex items-center gap-1.5">
                وضع التحرير بملء الشاشة
                <Sparkles className="w-4 h-4 text-gold" />
              </span>
              <span className="text-gold/70 text-[10.5px]">{words} كلمة • {chars} حرف • {readingLabel(minutes)}</span>
            </div>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setFullEdit(false)}
              className="h-9 px-4 rounded-xl bg-gold/15 hover:bg-gold/25 border border-gold/40 text-gold text-xs font-extrabold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
              إغلاق المحرر
            </button>
          </div>
          {/* شريط الأدوات */}
          <div className="relative flex flex-wrap items-center gap-1.5 px-5 py-2.5 border-b border-gold/20 bg-[#050C1F]/45">
            {TOOLS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={t.run}
                title={t.title}
                className="h-8 min-w-8 px-2.5 rounded-lg border border-gold/25 bg-white/5 hover:bg-gold/20 text-gold/90 flex items-center justify-center gap-1 text-[11px] font-bold transition-all active:scale-90"
              >
                <t.icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline text-white/80">{t.label}</span>
              </button>
            ))}
          </div>
          {/* المحرر الضخم */}
          <div className="relative flex-1 overflow-hidden px-5 py-4">
            <textarea
              ref={taRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyDown}
              dir="rtl"
              className="w-full h-full rounded-2xl border border-gold/30 bg-navy/[0.35] text-white/95 px-6 py-5 text-[15px] leading-[2.1] placeholder:text-white/35 shadow-inner focus:border-gold focus:ring-2 focus:ring-gold/30 focus:outline-none resize-none"
              placeholder={'اكتب درسك هنا...\n\n## عنوان\n**غامق** — ==تمييز== — > اقتباس — --- فاصل'}
            />
          </div>
          {/* التذييل */}
          <div className="relative flex items-center justify-between px-5 py-3 border-t border-gold/30">
            <span className="text-white/50 text-[10.5px]">اختصار: Ctrl+B للغامق — النص يُحفظ تلقائياً في النموذج عند الإغلاق</span>
            <button
              type="button"
              onClick={() => setFullEdit(false)}
              className="h-9 px-6 rounded-xl bg-gradient-to-l from-gold to-amber-400 text-navy text-xs font-black flex items-center gap-1.5 shadow-lg transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              تم — عد إلى النموذج
            </button>
          </div>
        </div>,
        document.body
      )}

      <style jsx global>{`
        .lux-reader-scroll::-webkit-scrollbar { width: 8px; }
        .lux-reader-scroll::-webkit-scrollbar-track { background: rgba(212,175,55,0.07); border-radius: 8px; }
        .lux-reader-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg,#d4af37,#b08d2a); border-radius: 8px; }
      `}</style>
    </div>
  )
}

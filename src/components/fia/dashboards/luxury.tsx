'use client'

// ============================================================================
// FIA ROYAL — Luxury shared UI kit for admin sections (v3)
// A cohesive "royal navy & gold" design language:
//  - LuxSection  : section shell with dark royal header band + shimmer + orbs
//  - LuxStats    : gradient stat tiles row
//  - LuxSearch   : glassy gold search field
//  - LuxSelect   : professional styled native select (RTL-safe)
//  - LuxEmpty    : magical empty state
//  - LuxDialog   : dialog shell with royal gradient header
//  - LuxBadge    : tinted pill badge
//  - LuxField    : labeled field wrapper with icon
//  - luxInput    : shared input class string
//  - luxTheme    : per-section gradient presets
// ============================================================================

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Search, Sparkles, ChevronDown, Check, X } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ---------------------------------------------------------------------------
// Section theme presets — each section gets its own royal gradient identity
// ---------------------------------------------------------------------------
export const luxTheme: Record<string, { band: string; icon: string; line: string }> = {
  trainers:    { band: 'from-[#061024] via-navy to-navy-light',  icon: 'from-gold to-amber-500',    line: 'from-transparent via-gold to-transparent' },
  students:    { band: 'from-[#04102b] via-[#0B1635] to-[#1A2547]', icon: 'from-blue-400 to-indigo-500', line: 'from-transparent via-blue-300 to-transparent' },
  certificates:{ band: 'from-[#0d1526] via-navy to-[#233158]',   icon: 'from-gold to-amber-500',    line: 'from-transparent via-gold to-transparent' },
  questions:   { band: 'from-[#1b1035] via-purple-900 to-fuchsia-900', icon: 'from-purple-400 to-fuchsia-500', line: 'from-transparent via-purple-300 to-transparent' },
  affiliates:  { band: 'from-[#0d1f14] via-emerald-900 to-teal-900', icon: 'from-emerald-400 to-teal-500', line: 'from-transparent via-emerald-300 to-transparent' },
  forum:       { band: 'from-[#101a33] via-navy to-[#20325c]',   icon: 'from-sky-400 to-blue-500',  line: 'from-transparent via-sky-300 to-transparent' },
  gold:        { band: 'from-[#061024] via-navy to-navy-light',  icon: 'from-gold to-amber-500',    line: 'from-transparent via-gold to-transparent' },
}

// Shared input styling (royal gold focus)
export const luxInput =
  'rounded-xl border-gold/30 bg-white focus:border-gold focus:ring-2 focus:ring-gold/25 transition-all placeholder:text-muted-foreground/50'

// ---------------------------------------------------------------------------
// LuxSection — section shell with royal header band
// ---------------------------------------------------------------------------
export function LuxSection({
  title, subtitle, icon: Icon, themeKey = 'gold', stats, actions, toolbar, children, count,
}: {
  title: string
  subtitle?: string
  icon: any
  themeKey?: keyof typeof luxTheme | string
  stats?: React.ReactNode
  actions?: React.ReactNode
  toolbar?: React.ReactNode
  children: React.ReactNode
  count?: number
}) {
  const t = luxTheme[themeKey] || luxTheme.gold
  return (
    <div className="rounded-3xl overflow-hidden border border-gold/25 shadow-[0_10px_40px_-12px_rgba(11,22,53,0.25)] bg-white">
      {/* ── Royal header band ─────────────────────────────────────────── */}
      <div className={cn('relative bg-gradient-to-l p-5 lg:p-6 overflow-hidden', t.band)}>
        {/* Gold dot matrix */}
        <div className="absolute inset-0 opacity-[0.18]" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, #D4AF37 1.2px, transparent 1.2px), radial-gradient(circle at 75% 65%, #ffffff 0.8px, transparent 0.8px)',
          backgroundSize: '22px 22px, 17px 17px',
        }} />
        {/* Floating orbs */}
        <div className="absolute -top-14 -left-14 w-44 h-44 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 w-56 h-56 rounded-full bg-gold/10 blur-3xl" />
        {/* Shimmer sweep */}
        <div className="absolute inset-0 lux-shimmer pointer-events-none" />
        {/* Bottom gold hairline */}
        <div className={cn('absolute bottom-0 inset-x-0 h-px bg-gradient-to-l', t.line)} />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Icon tile */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-gold/40 blur-lg rounded-2xl" />
              <div className={cn('relative w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg border border-white/30', t.icon)}>
                <Icon className="w-6 h-6 lg:w-7 lg:h-7 text-white drop-shadow" strokeWidth={2} />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg lg:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                {title}
                <Sparkles className="w-4 h-4 text-gold flex-shrink-0" />
              </h2>
              <p className="text-xs lg:text-sm text-white/75 mt-0.5 flex items-center gap-2 flex-wrap">
                {subtitle}
                {typeof count === 'number' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/20 border border-gold/40 text-gold-light text-[11px] font-bold" dir="ltr">
                    {count.toLocaleString('ar-EG')}
                  </span>
                )}
              </p>
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
        </div>
      </div>

      {/* ── Stats strip (optional) ────────────────────────────────────── */}
      {stats && <div className="relative border-b border-gold/15 bg-gradient-to-b from-gold/[0.06] to-transparent px-5 lg:px-6 py-4">{stats}</div>}

      {/* ── Toolbar (optional) ────────────────────────────────────────── */}
      {toolbar && <div className="px-5 lg:px-6 pt-5">{toolbar}</div>}

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="p-5 lg:p-6 bg-gradient-to-b from-white to-gold/[0.03]">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LuxStats — gradient stat tiles
// ---------------------------------------------------------------------------
export function LuxStats({ items }: { items: { icon: any; label: string; value: React.ReactNode; grad: string; text?: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((s, i) => (
        <div key={i} className="fia-card-hover relative overflow-hidden rounded-2xl border border-white/40 p-3.5 shadow-sm" >
          <div className={cn('absolute inset-0 bg-gradient-to-br opacity-90', s.grad)} />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center flex-shrink-0">
              <s.icon className="w-4.5 h-4.5 w-[18px] h-[18px] text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-extrabold text-white leading-none tabular-nums">{s.value}</div>
              <div className="text-[11px] text-white/85 mt-1 truncate">{s.label}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LuxSearch — royal search field
// ---------------------------------------------------------------------------
export function LuxSearch({ value, onChange, placeholder = 'بحث...', className }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative group', className)}>
      <div className="absolute inset-0 rounded-xl bg-gradient-to-l from-gold/25 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/70 pointer-events-none" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn('w-full h-11 pr-10 pl-9 rounded-xl border border-gold/30 bg-white/90 text-sm text-navy placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25 shadow-sm transition-all', className?.includes('flex-1') ? '' : '')}
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted/60 hover:bg-gold/20 flex items-center justify-center transition-colors" title="مسح">
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LuxOptionSheet — محرّك قائمة الاختيار الفاخرة الموحّد (v4)
// ورقة سفلية على الجوال / حوار مركزي على سطح المكتب — ترويسة ملكية متدرجة،
// بحث حي، بطاقات خيارات متحركة، حالة مختارة ذهبية بعلامة خضراء.
// يستخدمه LuxSelect و LuxCombo لتوحيد كل القوائم المنسدلة في التطبيق كاملاً.
// ---------------------------------------------------------------------------
function LuxOptionSheet({ open, onClose, title, icon: Icon, options, value, onPick, searchable = false, searchPlaceholder = 'ابحث...', renderOption, accent = 'gold' }: {
  open: boolean
  onClose: () => void
  title: string
  icon?: any
  options: { value: string; label: string; hint?: string; emoji?: string; meta?: string }[]
  value: string
  onPick: (v: string) => void
  searchable?: boolean
  searchPlaceholder?: string
  renderOption?: (o: any, selected: boolean) => React.ReactNode
  accent?: 'gold' | 'navy' | 'emerald' | 'amber' | 'blue'
}) {
  const [q, setQ] = useState('')
  useEffect(() => { if (open) setQ('') }, [open])
  if (!open) return null
  const needle = q.trim().toLowerCase()
  const filtered = needle
    ? options.filter((o) => o.label.toLowerCase().includes(needle) || (o.hint || '').toLowerCase().includes(needle) || (o.meta || '').toLowerCase().includes(needle))
    : options
  const accents: Record<string, { gradient: string; bg: string; text: string; border: string; iconBg: string }> = {
    gold:    { gradient: 'from-[#061024] via-navy to-[#3a2f10]', bg: 'from-gold/15 to-amber-500/5', text: 'text-navy', border: 'border-gold/45', iconBg: 'from-emerald-500 to-teal-600' },
    navy:    { gradient: 'from-[#061024] via-navy to-navy-light', bg: 'from-navy/10 to-navy/3', text: 'text-navy', border: 'border-navy/25', iconBg: 'from-emerald-500 to-teal-600' },
    emerald: { gradient: 'from-emerald-600 to-teal-700', bg: 'from-emerald-50 to-teal-50', text: 'text-emerald-700', border: 'border-emerald-300', iconBg: 'from-emerald-500 to-teal-600' },
    amber:   { gradient: 'from-amber-500 to-orange-600', bg: 'from-amber-50 to-orange-50', text: 'text-amber-700', border: 'border-amber-300', iconBg: 'from-amber-500 to-orange-600' },
    blue:    { gradient: 'from-blue-600 to-indigo-700', bg: 'from-blue-50 to-indigo-50', text: 'text-blue-700', border: 'border-blue-300', iconBg: 'from-emerald-500 to-teal-600' },
  }
  const a = accents[accent] || accents.gold
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center sm:justify-center" style={{ animation: 'fadeIn 0.2s ease' }} role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" style={{ animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        {/* الترويسة الملكية */}
        <div className={cn('relative bg-gradient-to-br p-4 pb-3.5 overflow-hidden flex-shrink-0', a.gradient)}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="absolute top-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-x-8 -translate-y-8" />
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-gold/20 rounded-full blur-2xl translate-x-6 translate-y-6" />
          <div className="absolute inset-0 lux-shimmer pointer-events-none" />
          <div className="relative flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-sm flex-shrink-0">
              {Icon ? <Icon className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-white tracking-tight truncate">{title}</h3>
              <p className="text-white/70 text-[10px] flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> {options.length} خياراً — اختر ما يناسبك</p>
            </div>
            <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
          {searchable && (
            <div className="relative mt-3">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold pointer-events-none" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-10 pr-9 pl-9 rounded-xl border border-white/20 bg-white/10 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-gold focus:bg-white/15 transition-all"
              />
              {q && (
                <button type="button" onClick={() => setQ('')} className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors" title="مسح">
                  <X className="w-3 h-3 text-white/90" />
                </button>
              )}
            </div>
          )}
        </div>
        {/* بطاقات الخيارات */}
        <div className="flex-1 overflow-y-auto fia-scroll p-3 space-y-1.5" style={{ background: 'linear-gradient(to bottom, rgba(248,250,252,0.6), white)' }}>
          {filtered.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center mb-2"><Search className="w-5 h-5 text-gold/60" /></div>
              <p className="text-xs text-muted-foreground">لا توجد نتائج مطابقة</p>
            </div>
          )}
          {filtered.map((o, i) => {
            const sel = o.value === value
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onPick(o.value); onClose() }}
                style={{ animation: `slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) ${Math.min(i, 14) * 0.025}s both` }}
                className={cn(
                  'w-full p-3 rounded-2xl text-right text-sm font-medium flex items-center justify-between gap-2 border-2 transition-all',
                  sel
                    ? cn('bg-gradient-to-l shadow-sm', a.bg, a.text, a.border)
                    : 'text-gray-600 bg-white border-transparent hover:bg-gold/[0.04] hover:text-navy hover:border-gold/25'
                )}
              >
                {renderOption ? renderOption(o, sel) : (
                  <span className="flex items-center gap-2.5 min-w-0 flex-1">
                    {sel ? (
                      <div className={cn('w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm', a.iconBg)}>
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] text-gray-400 font-bold">{o.emoji || i + 1}</span>
                      </div>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate">{o.label}</span>
                      {o.hint && <span className="block text-[10px] text-gray-400 truncate">{o.hint}</span>}
                    </span>
                  </span>
                )}
                {!renderOption && o.meta && <span className="text-[10px] font-bold text-gold bg-gold/10 border border-gold/25 rounded-full px-2 py-0.5 flex-shrink-0">{o.meta}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LuxSelect — قائمة اختيار فاخرة (v4): زر أنيق يفتح ورقة خيارات ملكية
// RTL-safe، بحث تلقائي عند كثرة الخيارات، متوافقة مع كل الاستدعاءات القديمة
// ---------------------------------------------------------------------------
export function LuxSelect({ value, onChange, options, placeholder = '— اختر —', className, disabled, title, icon: Icon, accent }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; emoji?: string }[]
  placeholder?: string
  className?: string
  disabled?: boolean
  title?: string
  icon?: any
  accent?: 'gold' | 'navy' | 'emerald' | 'amber' | 'blue'
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'w-full h-11 px-4 rounded-xl border bg-white text-sm text-right flex items-center justify-between gap-2 transition-all shadow-sm',
          'border-gold/30 hover:border-gold/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25',
          disabled && 'opacity-50 cursor-not-allowed bg-muted/30'
        )}
      >
        <span className={cn('truncate font-medium', !selected && 'text-muted-foreground/60 font-normal')}>
          {selected ? (selected.emoji ? `${selected.emoji} ` : '') + selected.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gold flex-shrink-0" />
      </button>
      <LuxOptionSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title || placeholder || 'اختر من القائمة'}
        icon={Icon}
        options={options}
        value={value}
        onPick={onChange}
        searchable={options.length > 7}
        accent={accent}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// LuxCombo — قائمة اختيار بحثية فاخرة (v4): محرّك الورقة الملكية نفسه
// بحث حي دائماً + دعم القيمة الحالية خارج القائمة + renderOption كامل
// Perfect for: student picker, course picker, countries, methods
// ---------------------------------------------------------------------------
export function LuxCombo({ value, onChange, options, placeholder = '— اختر —', searchPlaceholder = 'ابحث...', className, renderOption, disabled, title, icon: Icon, accent }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; hint?: string; emoji?: string; meta?: string }[]
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  renderOption?: (o: any, selected: boolean) => React.ReactNode
  disabled?: boolean
  title?: string
  icon?: any
  accent?: 'gold' | 'navy' | 'emerald' | 'amber' | 'blue'
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  // ضمان ظهور القيمة الحالية حتى لو لم تعد ضمن القائمة (قيم نصية قديمة)
  const effOptions = React.useMemo(() => {
    if (value && !options.some((o) => o.value === value)) return [{ value, label: value, emoji: '📌' }, ...options]
    return options
  }, [value, options])

  return (
    <div className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'w-full h-11 px-4 rounded-xl border bg-white text-sm text-right flex items-center justify-between gap-2 transition-all shadow-sm',
          'border-gold/30 hover:border-gold/50 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={cn('truncate font-medium', !selected && 'text-muted-foreground/60 font-normal')}>
          {selected ? (selected.emoji ? `${selected.emoji} ` : '') + selected.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-gold flex-shrink-0" />
      </button>

      {/* الورقة الملكية */}
      <LuxOptionSheet
        open={open}
        onClose={() => setOpen(false)}
        title={title || 'اختر من القائمة'}
        icon={Icon}
        options={effOptions}
        value={value}
        onPick={onChange}
        searchable
        searchPlaceholder={searchPlaceholder}
        renderOption={renderOption}
        accent={accent}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// LuxPicker — magical full-screen dropdown card (same UX as the courses
// dialog picker): trigger mini-card + bottom-sheet/centered modal with a
// royal gradient header, numbered option cards and staggered animations.
// RTL-safe, mobile-first (bottom sheet), desktop centered.
// ---------------------------------------------------------------------------
export function LuxPicker({ label, value, onChange, options, icon: Icon, placeholder = '— اختر —', accent = 'gold', disabled }: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; hint?: string; emoji?: string }[]
  icon?: any
  placeholder?: string
  accent?: 'gold' | 'navy' | 'emerald' | 'amber' | 'blue'
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  const selectedLabel = selected ? (selected.emoji ? `${selected.emoji} ` : '') + selected.label : value || placeholder

  const accents: Record<string, { gradient: string; bg: string; text: string; border: string; iconBg: string }> = {
    gold:    { gradient: 'from-[#061024] via-navy to-[#3a2f10]',  bg: 'from-gold/10 to-amber-500/5',   text: 'text-navy',        border: 'border-gold/35',    iconBg: 'from-gold to-amber-500' },
    navy:    { gradient: 'from-[#061024] via-navy to-navy-light', bg: 'from-navy/8 to-navy/3',         text: 'text-navy',        border: 'border-navy/20',    iconBg: 'from-navy to-navy-light' },
    emerald: { gradient: 'from-emerald-600 to-teal-700',          bg: 'from-emerald-50 to-teal-50',    text: 'text-emerald-700', border: 'border-emerald-200', iconBg: 'from-emerald-500 to-teal-600' },
    amber:   { gradient: 'from-amber-500 to-orange-600',          bg: 'from-amber-50 to-orange-50',    text: 'text-amber-700',   border: 'border-amber-200',   iconBg: 'from-amber-500 to-orange-600' },
    blue:    { gradient: 'from-blue-600 to-indigo-700',           bg: 'from-blue-50 to-indigo-50',     text: 'text-blue-700',    border: 'border-blue-200',    iconBg: 'from-blue-500 to-indigo-600' },
  }
  const a = accents[accent] || accents.gold

  return (
    <>
      {/* Trigger — mini card like the courses dialog */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'w-full h-11 px-3 text-sm bg-gradient-to-br border rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/30 cursor-pointer transition-all hover:shadow-md flex items-center justify-between gap-2 group',
          a.bg, a.border,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={cn('font-medium truncate flex items-center gap-1.5', value ? a.text : 'text-muted-foreground/60 font-normal')}>
          {selectedLabel}
        </span>
        <div className={cn('w-6 h-6 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform', a.iconBg)}>
          <ChevronDown className="w-3.5 h-3.5 text-white" />
        </div>
      </button>

      {/* الورقة الملكية الموحدة */}
      <LuxOptionSheet
        open={open}
        onClose={() => setOpen(false)}
        title={label || 'اختر من القائمة'}
        icon={Icon}
        options={options}
        value={value}
        onPick={onChange}
        searchable={options.length > 7}
        accent={accent}
      />
    </>
  )
}

// ---------------------------------------------------------------------------
// LuxEmpty — magical empty state
// ---------------------------------------------------------------------------
export function LuxEmpty({ icon: Icon, title, hint, action, themeKey = 'gold' }: {
  icon: any
  title: string
  hint?: string
  action?: React.ReactNode
  themeKey?: string
}) {
  const t = luxTheme[themeKey] || luxTheme.gold
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-white via-white to-gold/[0.05] py-14 px-6 text-center">
      <div className="absolute inset-0 opacity-[0.12]" style={{
        backgroundImage: 'radial-gradient(circle at 15% 30%, #D4AF37 1.5px, transparent 1.5px), radial-gradient(circle at 85% 70%, #0B1635 1px, transparent 1px)',
        backgroundSize: '26px 26px, 20px 20px',
      }} />
      <div className="relative inline-block mb-4 lux-float">
        <div className="absolute inset-0 bg-gold/30 rounded-3xl blur-2xl animate-pulse" />
        <div className="relative w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-navy via-navy-light to-navy flex items-center justify-center shadow-2xl border border-gold/40 rotate-3">
          <Icon className={cn('w-10 h-10', themeKey === 'questions' ? 'text-purple-300' : themeKey === 'affiliates' ? 'text-emerald-300' : themeKey === 'forum' ? 'text-sky-300' : themeKey === 'students' ? 'text-blue-300' : 'text-gold')} />
        </div>
        <div className="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-gold to-amber-500 flex items-center justify-center shadow-md">
          <Sparkles className="w-3 h-3 text-navy" />
        </div>
      </div>
      <h3 className="relative font-extrabold text-navy text-base mb-1.5">{title}</h3>
      {hint && <p className="relative text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">{hint}</p>}
      {action && <div className="relative mt-4 flex justify-center">{action}</div>}
      <div className={cn('relative mt-5 mx-auto h-px w-40 bg-gradient-to-l', t.line)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// LuxBadge — tinted pill
// ---------------------------------------------------------------------------
export function LuxBadge({ children, tone = 'gold', className }: { children: React.ReactNode; tone?: string; className?: string }) {
  const tones: Record<string, string> = {
    gold: 'bg-gold/12 text-[#8a6d1d] border-gold/35',
    navy: 'bg-navy/8 text-navy border-navy/20',
    green: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/30',
    red: 'bg-rose-500/12 text-rose-600 border-rose-500/30',
    blue: 'bg-blue-500/12 text-blue-700 border-blue-500/30',
    purple: 'bg-purple-500/12 text-purple-700 border-purple-500/30',
    amber: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    gray: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold whitespace-nowrap', tones[tone] || tones.gold, className)}>
      {children}
    </span>
  )
}

// ---------------------------------------------------------------------------
// LuxField — labeled field wrapper
// ---------------------------------------------------------------------------
export function LuxField({ label, icon: Icon, required, hint, children, className }: {
  label: string
  icon?: any
  required?: boolean
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label className="text-xs font-bold text-navy flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-gold" />}
        {label}
        {required && <span className="text-rose-500">*</span>}
        {hint && <span className="text-[10px] font-normal text-muted-foreground">({hint})</span>}
      </Label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// LuxDialog — dialog shell with royal gradient header
// ---------------------------------------------------------------------------
export function LuxDialog({ open, onOpenChange, title, subtitle, icon: Icon, gradient = 'from-[#061024] via-navy to-navy-light', maxWidth = 'sm:max-w-lg', footer, children }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  subtitle?: string
  icon: any
  gradient?: string
  maxWidth?: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-h-[92vh] overflow-y-auto lux-scrollbar p-0 border-0', maxWidth)}>
        {/* Header */}
        <div className={cn('relative bg-gradient-to-l p-5 pb-6 text-white overflow-hidden', gradient)}>
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'radial-gradient(circle at 20% 25%, #D4AF37 1.2px, transparent 1.2px), radial-gradient(circle at 80% 70%, white 0.8px, transparent 0.8px)',
            backgroundSize: '20px 20px, 16px 16px',
          }} />
          <div className="absolute -top-10 -left-10 w-36 h-36 bg-gold/15 rounded-full blur-3xl" />
          <div className="absolute inset-0 lux-shimmer pointer-events-none" />
          <button onClick={() => onOpenChange(false)} className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center z-10 transition-colors">
            <X className="w-4 h-4 text-white/90" />
          </button>
          <DialogHeader className="relative">
            <DialogTitle className="text-lg font-extrabold tracking-tight text-white flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gold/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-gold/40 flex-shrink-0">
                <Icon className="w-5.5 h-5.5 w-[22px] h-[22px] text-gold" strokeWidth={2.2} />
              </div>
              <span>
                {title}
                {subtitle && (
                  <span className="block text-xs font-normal text-white/75 mt-0.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-gold" /> {subtitle}
                  </span>
                )}
              </span>
            </DialogTitle>
          </DialogHeader>
        </div>
        {/* Body */}
        <div className="p-5 bg-gradient-to-b from-gold/[0.04] to-white space-y-4">{children}</div>
        {footer && <DialogFooter className="p-4 bg-muted/20 border-t border-gold/15">{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// LuxSaveBar — standard dialog footer buttons
// ---------------------------------------------------------------------------
export function LuxSaveBar({ onCancel, onSave, saving, saveLabel = 'حفظ', icon: Icon, gradient = 'from-gold to-amber-500', text = 'text-navy' }: {
  onCancel: () => void
  onSave: () => void
  saving?: boolean
  saveLabel?: string
  icon?: any
  gradient?: string
  text?: string
}) {
  return (
    <>
      <Button variant="outline" onClick={onCancel} className="rounded-xl border-gold/30 hover:bg-gold/5">إلغاء</Button>
      <Button onClick={onSave} disabled={saving} className={cn('bg-gradient-to-r rounded-xl shadow-md active:scale-[0.97] transition-all px-6 font-bold', gradient, text)}>
        {saving ? <><Loader className="w-4 h-4 ml-1.5 animate-spin" /> جاري الحفظ...</> : <>{Icon && <Icon className="w-4 h-4 ml-1.5" />} {saveLabel}</>}
      </Button>
    </>
  )
}

function Loader({ className }: { className?: string }) {
  return (
    <span className={cn('inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin align-middle', className)} />
  )
}

// ---------------------------------------------------------------------------
// luxRowTag — small key/value row used inside cards
// ---------------------------------------------------------------------------
export function LuxRow({ icon: Icon, children, mono }: { icon?: any; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground min-w-0">
      {Icon && <Icon className="w-2.5 h-2.5 flex-shrink-0 text-gold/70" />}
      <span className={cn('truncate text-navy font-medium', mono && 'font-mono')} dir={mono ? 'ltr' : undefined}>{children}</span>
    </div>
  )
}

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

import React, { useEffect, useRef, useState } from 'react'
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
// LuxSelect — professional native select (RTL-safe, always renders well)
// ---------------------------------------------------------------------------
export function LuxSelect({ value, onChange, options, placeholder = '— اختر —', className, disabled }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; emoji?: string }[]
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <div className={cn('relative group/select', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full h-11 pr-10 pl-9 rounded-xl border border-gold/30 bg-white text-sm text-navy font-medium',
          'focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/25 shadow-sm transition-all appearance-none cursor-pointer',
          disabled && 'opacity-50 cursor-not-allowed bg-muted/30',
          'hover:border-gold/50'
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.emoji ? `${o.emoji} ` : ''}{o.label}</option>
        ))}
      </select>
      <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold pointer-events-none transition-transform group-focus-within/select:rotate-180" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// LuxCombo — searchable select (royal dropdown with live filtering)
// Perfect for: student picker, course picker inside dialogs
// ---------------------------------------------------------------------------
export function LuxCombo({ value, onChange, options, placeholder = '— اختر —', searchPlaceholder = 'ابحث...', className, renderOption, disabled }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; hint?: string; emoji?: string; meta?: string }[]
  placeholder?: string
  searchPlaceholder?: string
  className?: string
  renderOption?: (o: any, selected: boolean) => React.ReactNode
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [])

  const filtered = options.filter((o) =>
    !q.trim() || o.label.toLowerCase().includes(q.toLowerCase()) || (o.hint || '').toLowerCase().includes(q.toLowerCase()) || (o.meta || '').toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div ref={ref} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(!open); setQ('') }}
        className={cn(
          'w-full h-11 px-4 rounded-xl border bg-white text-sm text-right flex items-center justify-between gap-2 transition-all shadow-sm',
          open ? 'border-gold ring-2 ring-gold/25 shadow-md' : 'border-gold/30 hover:border-gold/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span className={cn('truncate font-medium', !selected && 'text-muted-foreground/60 font-normal')}>
          {selected ? (selected.emoji ? `${selected.emoji} ` : '') + selected.label : placeholder}
        </span>
        <ChevronDown className={cn('w-4 h-4 text-gold flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute z-50 top-[calc(100%+6px)] inset-x-0 rounded-2xl border border-gold/30 bg-white shadow-2xl overflow-hidden lux-pop origin-top">
          {/* Header + search */}
          <div className="p-2.5 border-b border-gold/15 bg-gradient-to-b from-gold/[0.07] to-transparent">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gold/70" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-9 pr-9 px-3 rounded-lg border border-gold/25 bg-white text-xs text-navy focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold/25"
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-56 overflow-y-auto lux-scrollbar p-1.5 space-y-0.5">
            {filtered.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground">لا توجد نتائج مطابقة</div>
            )}
            {filtered.map((o) => {
              const sel = o.value === value
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false) }}
                  className={cn(
                    'w-full text-right px-3 py-2.5 rounded-xl transition-all flex items-center gap-2.5 border',
                    sel ? 'bg-gradient-to-l from-gold/15 to-gold/5 border-gold/40 shadow-sm' : 'border-transparent hover:bg-gold/5 hover:border-gold/20'
                  )}
                >
                  {renderOption ? renderOption(o, sel) : (
                    <>
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm', sel ? 'bg-gradient-to-br from-gold to-amber-500 text-navy' : 'bg-navy/5 text-navy')}>
                        {o.emoji || o.label?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-navy truncate">{o.label}</div>
                        {o.hint && <div className="text-[10px] text-muted-foreground truncate">{o.hint}</div>}
                      </div>
                      {o.meta && <span className="text-[10px] font-bold text-gold bg-gold/10 border border-gold/25 rounded-full px-2 py-0.5 flex-shrink-0">{o.meta}</span>}
                    </>
                  )}
                  {sel && <Check className="w-4 h-4 text-gold flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
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

'use client'

/**
 * ============================================================================
 * 🏛️👑 v7.0 — الحالات الفارغة الملكية (Royal Empty States)
 * ============================================================================
 * الفراغ في المملكة لا يبقى فراغاً: أيقونة ذهبية داخل قوس مضيء، عنوان مهيب،
 * وصف مطمئن، وإجراء اختياري — بلغة عربية أنيقة تليق بالأكاديمية.
 * ============================================================================
 */

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Sparkles } from 'lucide-react'

export interface RoyalEmptyProps {
  icon?: LucideIcon
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  /** حجم مضغوط للبطاقات الصغيرة */
  compact?: boolean
}

export function RoyalEmpty({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
  compact,
}: RoyalEmptyProps) {
  const IconRender = Icon || Sparkles
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-gold/25 bg-gradient-to-b from-gold/[0.06] to-transparent overflow-hidden',
        compact ? 'px-4 py-8' : 'px-6 py-14',
        className
      )}
    >
      {/* توهج ذهبي خلفي خافت */}
      <div
        aria-hidden
        className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full bg-gold/10 blur-3xl pointer-events-none"
      />
      <div className="relative">
        <div className={cn(
          'rounded-2xl bg-gradient-to-br from-gold/25 to-gold/5 border border-gold/40 flex items-center justify-center shadow-[0_0_28px_rgba(212,175,55,0.25)]',
          compact ? 'h-12 w-12' : 'h-16 w-16 animate-float'
        )}>
          <IconRender className={cn('text-gold', compact ? 'h-6 w-6' : 'h-8 w-8')} strokeWidth={1.6} />
        </div>
      </div>
      <h3 className={cn('relative font-extrabold text-gold', compact ? 'mt-3 text-sm' : 'mt-5 text-lg')}>
        {title}
      </h3>
      {subtitle && (
        <p className={cn('relative max-w-sm leading-relaxed', compact ? 'mt-1 text-xs' : 'mt-2 text-sm', 'text-muted-foreground')}>
          {subtitle}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="relative mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-gold-light via-gold to-amber-600 px-5 py-2.5 text-sm font-extrabold text-navy shadow-[0_4px_16px_rgba(212,175,55,0.4)] transition-transform hover:scale-[1.03] active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default RoyalEmpty

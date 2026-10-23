'use client'

/**
 * ============================================================================
 * ✨👑 v7.0 — هياكل التحميل الملكية (Royal Skeletons)
 * ============================================================================
 * بدل مؤشر الدوران التقليدي: هياكل متلألئة ذهبية تحاكي شكل المحتوى الحقيقي
 * قبل وصوله — فتشعر السرعة قبل أن تصل. مكونات عرضية بحتة لا تمس منطقاً.
 * ============================================================================
 */

import { cn } from '@/lib/utils'

/** شريط متلألئ ذهبي — الوحدة الأساسية */
export function RoyalShimmer({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-lg bg-gold/10',
        className
      )}
    >
      <div
        className="absolute inset-0 -translate-x-full animate-[royal-shimmer_1.8s_infinite]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.18) 45%, rgba(229,193,88,0.28) 50%, rgba(212,175,55,0.18) 55%, transparent 100%)',
        }}
      />
    </div>
  )
}

/** هيكل بطاقة ملكية (عنوان + سطور) */
export function RoyalCardSkeleton({ className, lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={cn('rounded-2xl border border-gold/20 bg-white/5 p-5 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <RoyalShimmer className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <RoyalShimmer className="h-4 w-1/3" />
          <RoyalShimmer className="h-3 w-1/4" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <RoyalShimmer key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

/** شبكة بطاقات — للقوائم الرئيسية (دورات، مدربون، طلبات) */
export function RoyalGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <RoyalCardSkeleton key={i} lines={2} className={cn(i === 0 && 'royal-skeleton-lead')} />
      ))}
    </div>
  )
}

/** هيكل جدول ملكي — للوائح الإدارية */
export function RoyalTableSkeleton({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-gold/20 overflow-hidden', className)}>
      <div className="flex gap-3 bg-gold/10 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <RoyalShimmer key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-gold/10">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3 px-4 py-3.5 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <RoyalShimmer key={c} className={cn('h-3.5 flex-1', c === 0 && 'max-w-[80px]')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** هيكل إحصائيات علوية — أرقام ضخمة قادمة */
export function RoyalStatsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gold/20 bg-white/5 p-4 space-y-2">
          <RoyalShimmer className="h-8 w-16 rounded-md" />
          <RoyalShimmer className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  )
}

/** هيكل قائمة سطور — للإشعارات والرسائل */
export function RoyalListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-gold/15 bg-white/5 px-4 py-3">
          <RoyalShimmer className="h-9 w-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <RoyalShimmer className="h-3 w-2/5" />
            <RoyalShimmer className="h-2.5 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** شاشة تحميل كاملة للوحة — تُستخدم عند أول جلب للبيانات */
export function RoyalDashboardSkeleton({ label = 'جارِ تجهيز القصر الملكي…' }: { label?: string }) {
  return (
    <div className="space-y-5" role="status" aria-busy="true" aria-label={label}>
      <div className="flex items-center justify-center gap-3 pt-2">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full rounded-full bg-gold opacity-60 animate-ping" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-gold" />
        </span>
        <span className="text-sm text-gold font-bold tracking-wide">{label}</span>
      </div>
      <RoyalStatsSkeleton />
      <RoyalGridSkeleton count={6} />
    </div>
  )
}

export default RoyalDashboardSkeleton

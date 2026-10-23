'use client'

import { useEffect, useState, useCallback } from 'react'

/**
 * ============================================================================
 * ⚡👑 v7.0 — الخزنة الملكية للبيانات (Royal Cache)
 * ============================================================================
 * طبقة تخزين مؤقت للبيانات المشتركة: ذاكرة + منع التكرار (dedupe) + عمر
 * افتراضي (TTL) + نمط «قدم القديم فوراً وحدّث بهدوء» (stale-while-revalidate).
 *
 * الفلسفة: البيانات التي لا تتغير كل ثانية (إعدادات الموقع، الدورات المنشورة،
 * التخصصات، الأسئلة الشائعة…) لا تحتاج رحلة إلى الخادم في كل تنقّل — تُقرأ من
 * الخزنة فوراً (0ms) ثم تُحدَّث في الخلفية بصمت.
 *
 * آمنة 100%: لا تُستخدم أبداً للإشعارات أو أي بيانات حية تتطلب لحظية — تلك
 * تبقى على مساراتها الأصلية دون مساس.
 * ============================================================================
 */

interface CacheEntry<T = unknown> {
  data: T
  at: number
  /** وعد التحديث الجاري إن وجد */
  refreshing?: Promise<T>
}

const store = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()

export interface RoyalCacheOptions {
  /** عمر البيانات بالمللي ثانية قبل اعتبارها قديمة (افتراضي 90 ثانية) */
  ttl?: number
  /** جلب تحديث في الخلفية حتى لو كانت البيانات صالحة (افتراضي: فقط عند القِدم) */
  revalidateAlways?: boolean
}

function isFresh(e: CacheEntry, ttl: number): boolean {
  return Date.now() - e.at < ttl
}

/** جلب مع خزنة ملكية — يعيد البيانات فوراً من الذاكرة إن كانت حية */
export async function royalFetch<T = unknown>(url: string, opts: RoyalCacheOptions = {}): Promise<T> {
  const ttl = opts.ttl ?? 90_000
  const entry = store.get(url) as CacheEntry<T> | undefined

  if (entry) {
    if (isFresh(entry, ttl) && !opts.revalidateAlways) return entry.data
    // stale-while-revalidate: قدّم القديم الآن وحدّث بهدوء
    if (!entry.refreshing) {
      entry.refreshing = doFetch<T>(url)
        .then((fresh) => {
          store.set(url, { data: fresh, at: Date.now() })
          return fresh
        })
        .catch(() => entry.data)
        .finally(() => {
          const e = store.get(url) as CacheEntry<T> | undefined
          if (e) e.refreshing = undefined
        })
    }
    return entry.data
  }

  // لا شيء في الخزنة — انتظر الجلب الأول (مع dedupe)
  let p = inflight.get(url) as Promise<T> | undefined
  if (!p) {
    p = doFetch<T>(url)
    inflight.set(url, p)
  }
  try {
    const data = await p
    store.set(url, { data, at: Date.now() })
    return data
  } finally {
    inflight.delete(url)
  }
}

function doFetch<T>(url: string): Promise<T> {
  return fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
}

/** إبطال خزنة رابط (أو كل الخزنة) — بعد تعديل إداري مثلاً */
export function royalInvalidate(url?: string): void {
  if (url) store.delete(url)
  else store.clear()
}

/**
 * خطاف React للبيانات المخزنة ملكياً — يُظهر البيانات المخزنة فوراً
 * ثم يحدّث الحالة بصمت عند وصول الجديد.
 */
export function useRoyalData<T = unknown>(
  url: string | null,
  opts: RoyalCacheOptions = {}
): { data: T | null; loading: boolean; error: string | null; refresh: () => void } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!url) { setLoading(false); return }
    let alive = true
    setLoading(true)
    setError(null)
    royalFetch<T>(url, opts)
      .then((d) => { if (alive) { setData(d); setLoading(false) } })
      .catch((e) => { if (alive) { setError(e?.message || 'خطأ'); setLoading(false) } })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, tick])

  const refresh = useCallback(() => { royalInvalidate(url || undefined); setTick((t) => t + 1) }, [url])

  return { data, loading, error, refresh }
}

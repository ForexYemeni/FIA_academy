'use client'

import { useEffect, useState } from 'react'

/**
 * 🎓 useSpecializationCatalog — خط مركزي لجلب كتالوج التخصصات العالمية
 * والمسميات الوظيفية من /api/specializations (مزروع من الإدارة، ترحيل 026)
 * مع ذاكرة على مستوى الوحدة حتى لا تتكرر النداءات بين الأقسام.
 */
export type SpecItem = { id: string; name: string; type: 'title' | 'specialization'; icon?: string | null; enabled: boolean; sort: number }

let cache: SpecItem[] | null = null
let inflight: Promise<SpecItem[]> | null = null
const listeners = new Set<(items: SpecItem[]) => void>()

async function fetchCatalog(): Promise<SpecItem[]> {
  if (cache) return cache
  if (!inflight) {
    inflight = fetch('/api/specializations')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: SpecItem[]) => { cache = Array.isArray(rows) ? rows : []; return cache })
      .catch(() => cache || [])
      .finally(() => { inflight = null })
  }
  return inflight
}

/** فرض إعادة الجلب (بعد تعديل إداري مثلاً) */
export function refreshSpecializationCatalog() {
  cache = null
  fetchCatalog().then((items) => listeners.forEach((l) => l(items)))
}

export function useSpecializationCatalog() {
  const [items, setItems] = useState<SpecItem[]>(cache || [])
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    let alive = true
    listeners.add((next) => { if (alive) setItems(next) })
    fetchCatalog().then((next) => { if (alive) { setItems(next); setLoading(false) } })
    return () => { alive = false; listeners.delete(() => {}) }
  }, [])

  const titles = items.filter((i) => i.type === 'title' && i.enabled).map((i) => ({ value: i.name, label: i.name, emoji: i.icon || '🎓' }))
  const specializations = items.filter((i) => i.type === 'specialization' && i.enabled).map((i) => ({ value: i.name, label: i.name, emoji: i.icon || '📚' }))
  return { items, titles, specializations, loading }
}

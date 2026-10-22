'use client'

/**
 * ============================================================================
 * جسر الهوية الملكي (Royal API Auth Bridge)
 * ============================================================================
 * كل طلبات /api/* من المتصفح تحمل الآن التوقيع الملكي (Bearer token) تلقائياً —
 * دون لمس أي مكوّن أو شاشة: نغلّف fetch مرة واحدة ونضيف الترويسة من الجلسة
 * المخزنة (zustand persist → localStorage 'fia-auth').
 * يعمل في المتصفح وفي WebView التطبيق على حد سواء.
 * ============================================================================
 */

import { useEffect } from 'react'

declare global {
  interface Window {
    __fiaApiBridgeInstalled?: boolean
  }
}

export function ApiAuthBridge() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.__fiaApiBridgeInstalled) return
    window.__fiaApiBridgeInstalled = true

    const origFetch = window.fetch.bind(window)

    const readToken = (): string | null => {
      try {
        const raw = localStorage.getItem('fia-auth')
        if (!raw) return null
        const parsed = JSON.parse(raw)
        return parsed?.state?.token || null
      } catch {
        return null
      }
    }

    window.fetch = async (input: any, init?: any) => {
      try {
        const url =
          typeof input === 'string'
            ? input
            : input && typeof input === 'object' && 'url' in input
            ? String(input.url)
            : ''

        // نفس الأصل فقط، ومسارات API حصراً
        if (url && (url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`))) {
          const token = readToken()
          if (token) {
            const headers = new Headers(
              init?.headers || (input && typeof input === 'object' && 'headers' in input ? input.headers : undefined)
            )
            if (!headers.get('Authorization')) {
              headers.set('Authorization', `Bearer ${token}`)
            }
            init = { ...(init || {}), headers }
          }
        }
      } catch {
        // أي عطل في الجسر لا يعطل الطلب الأصلي أبداً
      }
      return origFetch(input, init)
    }
  }, [])

  return null
}

export default ApiAuthBridge

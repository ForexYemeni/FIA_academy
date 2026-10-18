'use client'

import { useEffect } from 'react'

/**
 * Synchronizes dashboard tab navigation with `window.location.hash`.
 *
 * Why this exists:
 *   Notification links look like `/#courses`, `/#payments`, `/#profile`, etc.
 *   When the user clicks a notification, the browser navigates to `/` with
 *   a hash. Without this hook, the dashboard would just load at the default
 *   tab ('overview') and ignore the hash — leaving the user wondering why
 *   they didn't end up where the notification pointed.
 *
 * What it does:
 *   1. On mount: reads `window.location.hash`. If it matches one of the
 *      `validTabs`, calls `setActive(hash)` and then strips the hash from
 *      the URL bar (so a refresh doesn't keep reopening the same tab).
 *   2. Listens to `hashchange` events for the lifetime of the dashboard
 *      (handles the case where the user clicks another notification while
 *      already on the dashboard — the URL only changes its hash, so React
 *      Router would normally ignore it).
 *
 * Usage:
 *   const [active, setActive] = useState('overview')
 *   useHashTab(validTabs, setActive)
 *
 * The hook is a no-op on the server (Next.js SSR) and on browsers without
 * `window` (it gracefully early-returns).
 */
export function useHashTab(
  validTabs: string[],
  setActive: (id: string) => void
) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const applyHash = () => {
      const h = window.location.hash.replace(/^#/, '').trim()
      if (!h) return
      // Handle compound hashes like `#forum?t=123` — take the part before `?`
      const base = h.split('?')[0].split('&')[0]
      if (validTabs.includes(base)) {
        setActive(base)
        // Strip the hash so refresh doesn't keep reopening the same tab
        try {
          history.replaceState(null, '', window.location.pathname + window.location.search)
        } catch {}
      }
    }

    // Apply on mount (notification deep link)
    applyHash()

    // Listen for hash-only navigations (e.g., user clicks another
    // notification while already on the dashboard)
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
    // We intentionally exclude `setActive` from deps — passing a new
    // function identity every render would re-run the effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validTabs.join('|')])
}

// PWA service worker for FIA Academy
// - Caches the app shell for offline use
// - Handles push notifications (real external popups, even when app is closed)
// - Handles notification clicks (navigate to a link)
//
// ⚠️ IMPORTANT: We NEVER cache API responses. The app relies on fresh
// data from /api/* endpoints for Realtime updates + payment status +
// enrollment lists. Caching these would cause stale UI.

const APP_SHELL_CACHE = 'fia-shell-v5'
const DYNAMIC_CACHE = 'fia-dynamic-v5'

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/fia/logo-fia.png',
  '/fia/favicon.svg',
]

// === Install: cache app shell ===
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

// === Activate: clean old caches + claim clients ===
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          // Delete ALL old cache versions (v1, v2, etc.) to ensure
          // users get fresh content after we deploy updates.
          .filter((k) => k !== APP_SHELL_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// === Fetch: caching strategy ===
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // ⚡ NEVER cache API requests — always go to network.
  // This is critical for the Realtime feature: when the app refetches
  // /api/payments or /api/enrollments after a Realtime event, we
  // MUST get the latest data, not a stale cached version.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // ⚡ NEVER cache Supabase Realtime WebSocket upgrade requests
  // (these go to wss://*.supabase.co/realtime/v1/...)
  if (url.hostname.includes('supabase.co')) {
    return // let the browser handle it natively
  }

  // Cache-first for static assets (images, fonts, _next/*)
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/fia/') ||
    url.pathname.startsWith('/uploads/') ||
    /\.(?:png|jpg|jpeg|svg|webp|woff2?|css|js)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request)
            .then((res) => {
              const clone = res.clone()
              caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone)).catch(() => {})
              return res
            })
            .catch(() => cached)
        )
      })
    )
    return
  }

  // Network-first for HTML pages — fall back to cache if offline.
  // We DO cache the latest HTML so the app works offline, but we
  // always prefer the network version when available.
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone)).catch(() => {})
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }
})

// === Push notifications: real external popups ===
// Triggered by the server sending a push event (via Web Push API +
// VAPID keys). Works even when the user's tab is closed — the OS
// shows the notification, and clicking it focuses/opens the app.
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'إشعار جديد', body: event.data ? event.data.text() : '' }
  }
  const title = payload.title || 'إشعار جديد'
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/fia/logo-fia.png',
    badge: payload.badge || '/fia/favicon.svg',
    tag: payload.tag || 'fia-notification',
    data: { link: payload.link || '/' },
    dir: 'rtl',
    lang: 'ar',
    requireInteraction: payload.requireInteraction === true,
    vibrate: [200], // single short vibrate — no repeating pattern
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

// === Notification click: navigate to the link + focus window ===
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification.data?.link || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it + navigate to the link
      for (const client of clientList) {
        if (client.url.includes(link) || 'focus' in client) {
          client.navigate(link)
          return client.focus()
        }
      }
      // Otherwise open a new window
      return clients.openWindow(link)
    })
  )
})

// === Allow pages to trigger SW notifications (for in-app "external"
// popups that look the same as push notifications) ===
self.addEventListener('message', (event) => {
  if (!event.data) return
  // Manual update trigger
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }
  // Show a notification from the page (more reliable than new Notification())
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, link, tag } = event.data
    self.registration.showNotification(title || 'إشعار', {
      body: body || '',
      icon: '/fia/logo-fia.png',
      badge: '/fia/favicon.svg',
      tag: tag || `sw-${Date.now()}`,
      data: { link: link || '/' },
      dir: 'rtl',
      lang: 'ar',
      vibrate: [200], // single short vibrate — no repeating pattern
    })
  }
})

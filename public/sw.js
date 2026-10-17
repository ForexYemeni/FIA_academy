// PWA service worker — caches the app shell for offline use.
const APP_SHELL_CACHE = 'fia-shell-v1'
const DYNAMIC_CACHE = 'fia-dynamic-v1'

const APP_SHELL = [
  '/',
  '/manifest.json',
  '/fia/logo-fia.png',
  '/fia/favicon.svg',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== APP_SHELL_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// Network-first for /api/* and dynamic pages, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Never cache API requests
  if (url.pathname.startsWith('/api/')) {
    return fetch(request).catch(() => caches.match(request))
  }

  // Cache-first for static assets (images, fonts, _next/*)
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/fia/') ||
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

  // Network-first for HTML pages
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

// Allow manual claim
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

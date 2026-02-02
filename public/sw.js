// ── Cache configuration ──
const CACHE_NAME = 'brannloggen-v1'
const STATIC_ASSETS = [
  '/',
  '/icon-192.png',
  '/manifest.json',
]

// ── Install: pre-cache static assets ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  // Activate immediately without waiting for existing tabs to close
  self.skipWaiting()
})

// ── Activate: clean up old caches ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  // Take control of all open tabs immediately
  self.clients.claim()
})

// ── Fetch: network-first with cache fallback ──
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET requests and Supabase/API calls
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname.includes('supabase')) return

  // For navigation requests (HTML pages): network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // For static assets (JS, CSS, images): stale-while-revalidate
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|ico|woff2?)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => cached)

        return cached || fetchPromise
      })
    )
    return
  }
})

// ── Push notifications ──
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'Brannloggen'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || undefined,
    data: data.url ? { url: data.url } : undefined,
  }

  // Update badge count via navigator.setAppBadge (PWA)
  if ('setAppBadge' in self.navigator) {
    // Count existing notifications + 1
    self.registration.getNotifications().then((notifications) => {
      const count = notifications.length + 1
      self.navigator.setAppBadge(count).catch(() => {})
    }).catch(() => {})
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'

  // Clear badge when user taps notification
  if ('clearAppBadge' in self.navigator) {
    self.navigator.clearAppBadge().catch(() => {})
  }

  event.waitUntil(clients.openWindow(url))
})

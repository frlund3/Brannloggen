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

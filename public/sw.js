// public/sw.js — Service Worker para Web Push Notifications
const CACHE_NAME = 'hermes-crm-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = {
      title: 'Hermes CRM',
      body: event.data.text(),
      icon: '/favicon.ico',
    }
  }

  const options = {
    body: data.body,
    icon: data.icon ?? '/favicon.ico',
    badge: data.badge ?? '/favicon.ico',
    image: data.image,
    data: data.data ?? {},
    tag: data.tag ?? 'hermes-notification',
    renotify: true,
    actions: data.actions ?? [],
    vibrate: [200, 100, 200],
    timestamp: data.timestamp ?? Date.now(),
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url ?? '/'
  const action = event.action

  if (action === 'dismiss') return

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

/*
 * Staff app service worker - sirf desktop / browser push notifications ke liye
 * (naya online order, standing order bana ...). Pages cache nahi karta.
 * Register: components/layout/StaffBell.tsx (scope /__staff/ - portal ke service worker se alag)
 */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: event.data ? event.data.text() : 'OrderDraft' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'OrderDraft', {
      body: data.body || '',
      tag: data.tag,
      data: { url: data.url || '/orders' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/orders', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && !client.url.includes('/portal/') && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})

/*
 * Customer portal service worker (PWA).
 *  - App jaisa install ho sake (Add to Home Screen)
 *  - Internet na ho to "You're offline" page (pages network se, cache sirf fallback ke liye)
 *  - Push notifications: admin ka message phone / desktop pe (Settings -> Customer portal -> Notify customers)
 * API / prices kabhi cache nahi hote - hamesha fresh.
 */
const CACHE = 'od-portal-v2'
const ASSETS = 'od-portal-assets-v1' // /assets/* (Vite hashed files - kabhi badalte nahi) - app turant khule
const OFFLINE_HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline</title><style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;
justify-content:center;margin:0;background:#f8fafc;color:#0f172a;text-align:center}div{max-width:320px;padding:24px}
button{margin-top:16px;padding:10px 18px;border:0;border-radius:8px;background:#0f172a;color:#fff;font-size:15px}</style>
</head><body><div><h2>You're offline</h2><p>Check your internet connection, then try again. Your cart is saved on this device.</p>
<button onclick="location.reload()">Try again</button></div></body></html>`

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.put('/__offline', new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html' } }))))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('od-portal-') && k !== CACHE && k !== ASSETS).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  // Page navigation: network pehle, fail ho to offline page
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/__offline')))
    return
  }
  // JS / CSS / fonts (hashed naam) - cache pehle: dobara khulne pe app turant (API kabhi cache nahi)
  const url = new URL(req.url)
  if (req.method === 'GET' && url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSETS).then((cache) =>
        cache.match(req).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok) cache.put(req, res.clone())
              return res
            }),
        ),
      ),
    )
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: event.data ? event.data.text() : 'New message' }
  }
  const title = data.title || 'New message'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag,
      data: { url: data.url || '/' },
      icon: data.icon,
      badge: data.icon,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})

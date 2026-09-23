const CACHE_NAME = 'aa-cache-v4';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

// 1. INSTALL & ACTIVATE: Pre-cache offline assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// 2. NETWORK FIRST WITH CACHE FALLBACK (Prevents UI freezing)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// 3. BACKGROUND PUSH LISTENER (Wakes phone even when browser is closed)
self.addEventListener('push', (event) => {
  let data = {
    title: '⚠️ 10:01 AM उपस्थिति सूचना',
    body: 'सुप्रभात! आपने आज क्लॉक-इन नहीं किया है। कृपया तुरंत अटेंडेंस दर्ज करें।',
    url: './index.html'
  };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: './logo.png',
    badge: './logo.png',
    vibrate: [300, 100, 300, 100, 300], // High-priority double buzz pattern
    tag: 'attendance-reminder',         // Collapses duplicates
    renotify: true,                     // Buzzes on every scheduled alert
    requireInteraction: true,           // Keeps alert on screen until dismissed or tapped
    data: {
      url: data.url || './index.html'
    },
    actions: [
      { action: 'open_form', title: 'Open Form 📥' },
      { action: 'dismiss', title: 'Dismiss ✕' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// 4. NOTIFICATION CLICK LISTENER (Wakes screen and opens form directly)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = new URL(event.notification.data?.url || './index.html', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If the attendance portal is already open, focus it
      for (const client of windowClients) {
        if (client.url.includes('index.html') || client.url === self.location.origin + '/') {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If app/browser is completely closed, open a clean window directly
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

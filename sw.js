const CACHE_NAME = 'aryavarta-cache-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png'
];

// Install: Pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => clients.claim())
  );
});

// Fetch: Serve from cache immediately, then update in background
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Bypass Google Apps Script API calls from service worker cache
  if (event.request.url.includes('script.google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});

// Background Push Notifications
self.addEventListener('push', (event) => {
  let payload = {
    title: '⚠️ आर्यावर्त उपस्थिति सूचना',
    body: 'समय हो चुका है! कृपया पोर्टल खोलकर अपनी उपस्थिति दर्ज करें।'
  };

  if (event.data) {
    try { payload = event.data.json(); } catch(e) { payload.body = event.data.text(); }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: './logo.png',
      badge: './logo.png',
      vibrate: [300, 100, 300],
      tag: 'aa-attendance-alert',
      renotify: true,
      requireInteraction: true
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes('attendance') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});

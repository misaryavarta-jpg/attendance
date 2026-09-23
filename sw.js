self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

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

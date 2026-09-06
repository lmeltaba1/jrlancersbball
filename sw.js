// Self-destructing service worker - clears all caches and unregisters
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.map(name => caches.delete(name)))
    ).then(() => self.clients.claim())
     .then(() => self.registration.unregister())
  );
});

// Pass everything through to network
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request));
});

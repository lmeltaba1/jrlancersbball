// Self-destructing service worker
// This file unregisters itself and clears caches for users who had it installed

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Clear all lancers caches
      caches.keys().then(names =>
        Promise.all(names.filter(n => n.startsWith('lancers-')).map(n => caches.delete(n)))
      ),
      // Unregister this service worker
      self.registration.unregister()
    ]).then(() => {
      // Refresh all open tabs to get clean state
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    })
  );
});

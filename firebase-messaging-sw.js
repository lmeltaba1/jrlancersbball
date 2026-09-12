// Jr. Lancers Basketball - Service Worker (Push Notifications Only)
// Version 2 - Matching Bills app implementation
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Firebase init
firebase.initializeApp({
  apiKey: "AIzaSyCZDonC8aqbg5OvtM-cHdA5LTJleZn8nwk",
  authDomain: "lancers-bball.firebaseapp.com",
  projectId: "lancers-bball",
  storageBucket: "lancers-bball.firebasestorage.app",
  messagingSenderId: "840563401504",
  appId: "1:840563401504:web:fab87697f7129e98976d45"
});

const messaging = firebase.messaging();

// Background message handler removed - notifications now use FCM notification payload
// which is automatically displayed by the browser (no duplicate handling needed)

// Handle notification click - open URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Get URL from notification data
  let url = event.notification.data?.url || '/index.html';

  // Ensure full URL for PWA
  if (url.startsWith('/')) {
    url = 'https://lancers-bball.web.app' + url;
  }

  console.log('Notification clicked, opening:', url);

  // Try to focus existing window first, otherwise open new
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes('lancers-bball.web.app') && 'focus' in client) {
          return client.focus().then(() => client.navigate(url));
        }
      }
      // No existing window, open new one
      return clients.openWindow(url);
    })
  );
});

// Install - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate - clear ALL old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// No fetch handler - let browser handle all requests normally (no caching)

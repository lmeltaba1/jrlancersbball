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

// Handle background push messages (data-only messages)
messaging.onBackgroundMessage((payload) => {
  console.log('Background message:', payload);

  // Read from data payload (not notification payload to avoid duplicates)
  const data = payload.data || {};
  const notificationTitle = data.title || 'Jr. Lancers Basketball';
  const notificationOptions = {
    body: data.body || 'New update from the team',
    icon: '/images/lancers-logo-192.png',
    badge: '/images/lancers-logo-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/index.html' },
    tag: 'lancers-' + (data.type || 'notification')
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click - open URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/index.html';

  // Always open the URL - this works reliably on all platforms
  event.waitUntil(
    clients.openWindow(url)
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

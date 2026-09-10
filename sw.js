// Jr. Lancers PWA Service Worker
// Provides offline caching for static assets while keeping dynamic data fresh

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `lancers-static-${CACHE_VERSION}`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/roster.html',
  '/schedule.html',
  '/messages.html',
  '/playbook.html',
  '/highlights.html',
  '/attendance.html',
  '/volunteers.html',
  '/game-detail.html',
  '/game-stats.html',
  '/stats-view.html',
  '/css/athletic.css',
  '/js/app.js',
  '/js/theme.js',
  '/js/firebase-config.js',
  '/images/lancers-logo.jpg',
  '/images/lancers-logo-192.png',
  '/images/lancers-logo-512.png'
];

// URLs that should NEVER be cached (Firebase, auth, dynamic data)
const NEVER_CACHE_PATTERNS = [
  /firebaseio\.com/,
  /googleapis\.com/,
  /firebasestorage\.app/,
  /cloudfunctions\.net/,
  /firestore\.googleapis\.com/,
  /identitytoolkit\.googleapis\.com/,
  /securetoken\.googleapis\.com/,
  /fcmregistrations\.googleapis\.com/,
  /\/api\//,
  /\.run\.app/
];

// Check if URL should never be cached
function shouldNeverCache(url) {
  return NEVER_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

// Install: Cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        // Cache what we can, don't fail if some assets are missing
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.log(`SW: Failed to cache ${url}:`, err.message);
            })
          )
        );
      })
      .then(() => {
        console.log('SW: Static assets cached');
        // Don't skip waiting - let user control when to update
        // This prevents disruption for active users
      })
  );
});

// Activate: Clean up old caches, claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('lancers-') && name !== STATIC_CACHE)
            .map(name => {
              console.log('SW: Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('SW: Activated, claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch: Stale-while-revalidate for static, network-first for dynamic
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Never cache Firebase/auth requests - always go to network
  if (shouldNeverCache(url)) {
    return;
  }

  // For navigation requests (HTML pages), use network-first with cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline: try cache
          return caches.match(event.request)
            .then(cached => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // For static assets (CSS, JS, images), use stale-while-revalidate
  if (url.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?)(\?.*)?$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          // Return cached immediately, fetch update in background
          const fetchPromise = fetch(event.request)
            .then(response => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE).then(cache => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            })
            .catch(() => cached);

          return cached || fetchPromise;
        })
    );
    return;
  }

  // Everything else: network only (don't interfere)
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    // Allow manual trigger of update when user is ready
    self.skipWaiting();
  }
});

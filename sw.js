// Jr. Lancers PWA Service Worker
// Provides offline caching for static assets while keeping dynamic data fresh

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `lancers-static-${CACHE_VERSION}`;

// Static assets to precache on install
const PRECACHE_ASSETS = [
  '/css/athletic.css',
  '/js/app.js',
  '/js/theme.js',
  '/images/lancers-logo.jpg',
  '/images/lancers-logo-192.png'
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

// Install: Cache core static assets only
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => console.log('SW: Core assets cached'))
      .catch(err => console.log('SW: Precache failed:', err.message))
  );
  // Take over immediately
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name.startsWith('lancers-') && name !== STATIC_CACHE)
            .map(name => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: Network-first for everything, cache as backup
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Never intercept Firebase/auth - let browser handle directly
  if (shouldNeverCache(event.request.url)) return;

  // Network-first strategy: try network, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache successful responses for same-origin requests
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE)
            .then(cache => cache.put(event.request, responseClone))
            .catch(() => {}); // Ignore cache errors
        }
        return response;
      })
      .catch(() => {
        // Network failed - try cache
        return caches.match(event.request)
          .then(cached => {
            if (cached) return cached;
            // For navigation, return cached index as fallback
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            // Otherwise return network error
            return new Response('Offline', { status: 503, statusText: 'Offline' });
          });
      })
  );
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

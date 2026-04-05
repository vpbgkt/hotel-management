/**
 * BlueStay Service Worker
 * 
 * Provides offline support, caching strategies, and PWA functionality.
 * - Cache-first for static assets (images, fonts, CSS, JS)
 * - Network-first for API calls & page navigations
 * - Offline fallback page when network is unavailable
 */

const CACHE_NAME = 'bluestay-v2';
const STATIC_CACHE = 'bluestay-static-v2';
const API_CACHE = 'bluestay-api-v2';

// Static assets to pre-cache during installation
const PRECACHE_URLS = [
  '/',
  '/offline',
];

// Install event — pre-cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => {
      // Activate immediately, don't wait for old tabs to close
      return self.skipWaiting();
    })
  );
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, API_CACHE, CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // Take control of all open tabs immediately
      return self.clients.claim();
    })
  );
});

// Fetch event — routing strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extension and other non-http requests  
  if (!url.protocol.startsWith('http')) return;

  // Strategy: Cache-first for static assets
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy: Network-first for API calls
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/graphql')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Strategy: Network-first for page navigations with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, CACHE_NAME).catch(() => {
        return caches.match('/offline') || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // Default: Network-first
  event.respondWith(networkFirst(request, CACHE_NAME));
});

/**
 * Cache-first strategy
 * Returns cached response if available, otherwise fetches from network and caches.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

/**
 * Network-first strategy
 * Tries network first, falls back to cache. Caches successful responses.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('No network and no cache');
  }
}

/**
 * Check if a URL is a static asset (images, fonts, CSS, JS bundles)
 */
function isStaticAsset(url) {
  const staticExtensions = [
    '.js', '.css', '.woff', '.woff2', '.ttf', '.otf',
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico',
  ];
  
  // Next.js static files
  if (url.pathname.startsWith('/_next/static/')) return true;
  
  // Uploaded images
  if (url.pathname.startsWith('/uploads/')) return true;
  
  // Check file extension
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'BlueStay',
      body: event.data.text(),
    };
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    tag: payload.tag || 'bluestay-notification',
    renotify: true,
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || 'BlueStay', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  if (event.action === 'dismiss') return;

  // Focus existing tab or open new one
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

/* ============================================
   CURAAH — Service Worker
   Caches static assets for fast loads and
   serves an offline page when disconnected.
   ============================================ */

const CACHE_NAME    = 'curaah-v1';
const OFFLINE_URL   = '/offline.html';

/* Static assets to pre-cache on install */
const PRE_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/dashboard.html',
  '/hospitals.html',
  '/hospital-profile.html',
  '/checkin.html',
  '/attendent-portal.html',
  '/staff-potral.html',
  '/referral.html',
  '/proxy-booking.html',
  '/qr-generator.html',
  '/onboard.html',
  '/offline.html',
  '/css/style.css',
  '/js/main.js',
  '/js/supabase.js',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-180.png',
  '/assets/icons/icon-maskable-512.png',
];

/* ── INSTALL: pre-cache all static assets ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Pre-caching assets');
      return cache.addAll(PRE_CACHE);
    }).then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: clean up old cache versions ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: serve from cache or network ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET and cross-origin requests (Supabase API, CDN fonts, etc.) */
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  /* HTML pages: Network First → Cache fallback → Offline page */
  if (request.destination === 'document' ||
      request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          /* Clone and cache fresh response */
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  /* Static assets (CSS, JS, images): Cache First → Network fallback */
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        /* Cache valid responses */
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

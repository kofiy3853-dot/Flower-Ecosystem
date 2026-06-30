const CACHE_STATIC = 'flower-eco-static-v3';
const CACHE_IMAGES = 'flower-eco-images-v3';

const STATIC_ASSETS = [
  '/', '/index.html', '/styles/main.css',
  '/js/shared/components.js', '/js/shared/auth.js',
  '/js/shared/theme.js', '/js/shared/animations.js',
  '/js/shared/api.js', '/js/shared/cart.js', '/js/index.js',
  '/data/articles.json', '/data/videos.json',
  '/data/courses.json', '/data/events.json',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_STATIC).then(c => c.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      // Delete all old caches
      caches.keys().then(keys => Promise.all(
        keys.filter(k => k !== CACHE_STATIC && k !== CACHE_IMAGES)
            .map(k => caches.delete(k))
      )),
      clients.claim()
    ])
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip cross-origin & API requests — never cache these
  if (url.hostname !== self.location.hostname) return;
  if (url.pathname.startsWith('/api/')) return;

  // Images: stale-while-revalidate (instant from cache, refresh in background)
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    e.respondWith(
      caches.open(CACHE_IMAGES).then(async cache => {
        const cached = await cache.match(e.request);
        const fetchPromise = fetch(e.request).then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok && res.type === 'basic') {
        const clone = res.clone();
        caches.open(CACHE_STATIC).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('/')))
  );
});

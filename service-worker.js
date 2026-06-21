const CACHE = 'flower-eco-v2';
const ASSETS = [
  '/', '/index.html', '/styles/main.css',
  '/flower-knowledge-hub.html', '/flower-knowledge.html',
  '/bloom-calendar.html', '/flower-quiz.html', '/my-garden.html',
  '/marketplace.html', '/learning.html', '/community.html',
  '/js/shared/api.js', '/js/shared/auth.js', '/js/shared/theme.js',
  '/js/shared/ui.js', '/js/shared/cart.js', '/js/shared/components.js'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.hostname !== self.location.hostname) {
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      if (res.ok && res.type === 'basic') {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() => caches.match('/')))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )),
      clients.claim()
    ])
  );
});

const CACHE_NAME = 'anleitungsquiz-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n.startsWith('anleitungsquiz-')).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const path = url.pathname;
  const isNetworkFirst =
    event.request.mode === 'navigate' ||
    path.endsWith('index.html') ||
    path.endsWith('app.js') ||
    path.endsWith('sw.js') ||
    (path === '/' || path.endsWith('/'));
  if (isNetworkFirst) {
    event.respondWith(
      fetch(event.request)
        .then((r) => {
          const clone = r.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return r;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then((r) => r || fetch(event.request).then((res) => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
      return res;
    }))
  );
});

const CACHE = 'tdv-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/TheDouglasVision.dc.html',
  '/support.js',
  '/_ds/nocturne-6ad6d877-2b1e-4775-8548-94fdb4d1c0bd/styles.css',
  '/_ds/nocturne-6ad6d877-2b1e-4775-8548-94fdb4d1c0bd/_ds_bundle.js',
  '/uploads/logo.png',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
        }
        return resp;
      });
    })
  );
});

const CACHE_NAME = 'clock-cal-v2';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './src/styles.css',
  './src/main.js',
  './src/utils.js',
  './src/storage.js',
  './src/icons/calicon-192.png',
  './src/icons/calicon-512.png'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching offline resources');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => {
        if (k !== CACHE_NAME) {
          console.log('Removing old cache', k);
          return caches.delete(k);
        }
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', evt => {
  if (evt.request.method !== 'GET') return;
  
  evt.respondWith(
    caches.match(evt.request).then(cachedResponse => {
      // Return cached response if found
      if (cachedResponse) {
        return cachedResponse;
      }
      // Otherwise fetch from network
      return fetch(evt.request).then(networkResponse => {
        // Optional: Can dynamically cache new requests here if desired
        return networkResponse;
      });
    }).catch(err => {
      console.error('Fetch failed:', err);
      // Fallback logic could go here (e.g., return a custom offline page)
    })
  );
});

const CACHE_NAME = 'clock-cal-v1';
const FILES_TO_CACHE = ['/', '/index.html', '/manifest.json', '/src/styles.css', '/src/main.js', '/src/icons/icon-192.png', '/src/icons/icon-512.png'];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k=>{if(k!==CACHE_NAME) return caches.delete(k)})))
  )
  self.clients.claim();
});

self.addEventListener('fetch', evt=>{
  if(evt.request.method !== 'GET') return;
  evt.respondWith(
    caches.match(evt.request).then(resp => resp || fetch(evt.request))
  );
});

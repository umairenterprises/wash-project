// Wash Plant Management System — Service Worker v7.1
const CACHE_NAME = 'washplant-v7.1';

const CORE_ASSETS = [
  '/wash-project/',
  '/wash-project/index.html',
  '/wash-project/manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        CORE_ASSETS.map(url =>
          cache.add(url).catch(err => console.log('Cache skip:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Firebase — kabhi cache mat karo
  if (
    url.includes('firebaseio.com') ||
    url.includes('firebaseapp.com') ||
    url.includes('firebase.googleapis.com') ||
    url.includes('identitytoolkit') ||
    url.includes('gstatic.com/firebasejs')
  ) {
    return;
  }

  // Main app — Network first, offline mein cache se
  if (url.includes('/wash-project/') || url.includes('index.html') || url.includes('manifest.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request) ||
          caches.match('/wash-project/index.html') ||
          caches.match('/wash-project/')
        )
    );
    return;
  }

  // CDN fonts & libraries — Cache first
  if (url.includes('fonts.googleapis') || url.includes('fonts.gstatic') || url.includes('cdnjs.cloudflare')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // Default
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

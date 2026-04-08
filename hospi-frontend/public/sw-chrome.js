// 🔧 Service Worker optimisé pour Chrome Mobile
const CACHE_NAME = 'inuaafia-chrome-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/default-doctor.png'
];

// Installation du cache
self.addEventListener('install', event => {
  console.log('🔧 Chrome SW: Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('🔧 Chrome SW: Mise en cache des ressources');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation du cache
self.addEventListener('activate', event => {
  console.log('🔧 Chrome SW: Activation...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🔧 Chrome SW: Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retourner la réponse en cache
        if (response) {
          return response;
        }

        // Cache miss - faire la requête réseau
        return fetch(event.request).then(response => {
          // Mettre en cache les nouvelles réponses
          if (event.request.method === 'GET' && response.ok) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, response.clone());
            });
          }
          return response;
        }).catch(() => {
          // Erreur réseau - essayer le cache
          return caches.match(event.request);
        });
      })
  );
});

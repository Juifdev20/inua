const CACHE_NAME = 'inuaafia-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/inuaafia-logo.svg',
  // Pages critiques
  '/login',
  '/dashboard',
  '/appointments',
  '/patients/profile',
  // Page offline
  '/offline.html',
  // Assets statiques
  '/vite.svg'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Mise en cache des ressources');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Erreur lors de la mise en cache', error);
      })
  );
});

// Activation du service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activation...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprimer tous les anciens caches (inuaafia-v1, v2, etc.)
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression de l\'ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Tous les anciens caches ont été nettoyés');
      // Forcer le claim des clients pour appliquer immédiatement le nouveau SW
      return self.clients.claim();
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // 🔥 NE PAS CACHER les appels API pour toujours avoir des données fraîches
  const isApiCall = requestUrl.pathname.startsWith('/api/') || 
                    requestUrl.hostname.includes('render.com');
  
  if (isApiCall) {
    // Pour les API : toujours aller chercher sur le réseau, jamais le cache
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.error('Service Worker: Erreur API', error);
        // Retourner une réponse d'erreur JSON pour les API
        return new Response(
          JSON.stringify({ error: 'Network error', offline: true }), 
          { 
            status: 503, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      })
    );
    return;
  }
  
  // Pour les ressources statiques : utiliser cache-first
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si la ressource est en cache, on la retourne
        if (response) {
          console.log('Service Worker: Ressource trouvée dans le cache', event.request.url);
          return response;
        }

        // Sinon, on fait la requête réseau
        console.log('Service Worker: Requête réseau', event.request.url);
        return fetch(event.request).then((response) => {
          // Vérifier si la réponse est valide
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cloner la réponse car elle ne peut être utilisée qu'une fois
          const responseToCache = response.clone();

          // Mettre en cache les nouvelles requêtes GET
          if (event.request.method === 'GET') {
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }

          return response;
        }).catch((error) => {
          console.error('Service Worker: Erreur réseau', error);
          
          // Pour les requêtes de navigation, retourner la page offline
          if (event.request.destination === 'document') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Gestion des messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // 🔐 Répondre aux demandes de persistance de session
  if (event.data && event.data.type === 'KEEP_ALIVE') {
    console.log('[SW] Keep-alive received');
    // Ne rien faire de spécial, juste garder le SW actif
  }
});

// Notification push (optionnel)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification d\'InuaAfia',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/logo192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('InuaAfia', options)
  );
});

// Gestion du clic sur notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

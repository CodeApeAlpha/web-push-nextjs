const CACHE_NAME = 'app-cache-v1';
const APP_SHELL = [
  '/',
  '/next.png',
  '/nextjs.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              console.log('Deleting old cache:', key);
              return caches.delete(key);
            }
          })
        )
      ),
      // Clean up old cache entries (keep only last 50)
      cleanupOldCacheEntries()
    ])
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const request = event.request;
  // Network-first for HTML navigations, cache-first for others
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(err => console.log('Cache failed:', err));
        return response;
      }).catch(() => caches.match('/'))
    );
  } else {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(err => console.log('Cache failed:', err));
          return response;
        });
      })
    );
  }
});

const sendDeliveryReportAction = () => {
  console.log('Web push delivered.');
};

self.addEventListener('push', function (event) {
  if (!event.data) {
    return;
  }

  const payload = event.data.json();
  const { body, icon, image, badge, url, title } = payload;
  const notificationTitle = title ?? 'Hi';
  const notificationOptions = {
    body,
    icon,
    image,
    data: {
      url,
    },
    badge,
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions).then(() => {
      sendDeliveryReportAction();
    }),
  );
});

// Cleanup function to limit cache size
async function cleanupOldCacheEntries() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    if (keys.length > 50) { // Keep only 50 most recent entries
      const keysToDelete = keys.slice(0, keys.length - 50);
      await Promise.all(keysToDelete.map(key => {
        console.log('Deleting old cache entry:', key.url);
        return cache.delete(key);
      }));
      console.log(`Cleaned up ${keysToDelete.length} old cache entries`);
    }
  } catch (error) {
    console.log('Cache cleanup failed:', error);
  }
}

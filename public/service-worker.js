// Dynamic cache version based on timestamp - updates automatically with each deployment
const CACHE_VERSION = 'protector-ng-v' + new Date().toISOString().split('T')[0].replace(/-/g, '.');
const STATIC_CACHE = CACHE_VERSION + '-static';
const DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';

// Static assets that can be cached long-term
const staticAssets = [
  '/images/PRADO/slideshow/logo.PNG',
  '/manifest.json'
];

// Install event - cache static resources only
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event - Version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(staticAssets);
      })
      .then(() => {
        console.log('Service Worker: Installation complete - Force activating');
        return self.skipWaiting(); // Force new service worker to activate immediately
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event - Version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all caches that don't match current version
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete - Taking control of all pages');
      return self.clients.claim(); // Take control of all pages immediately
    })
  );
});

// Fetch event - Network-first strategy for dynamic content, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (Supabase API, etc.)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip caching auth-related responses to prevent stale auth state
  const isAuthRelated = 
    url.pathname.includes('/auth/') ||
    url.pathname.includes('/api/auth') ||
    url.searchParams.has('access_token') ||
    url.searchParams.has('refresh_token');

  if (isAuthRelated) {
    // For auth-related requests, always fetch from network and don't cache
    event.respondWith(fetch(request));
    return;
  }

  // Determine if this is a static asset
  const isStaticAsset = 
    request.destination === 'image' ||
    request.destination === 'font' ||
    request.destination === 'manifest' ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i);

  if (isStaticAsset) {
    // CACHE-FIRST strategy for static assets (images, icons, fonts)
    event.respondWith(cacheFirst(request));
  } else {
    // NETWORK-FIRST strategy for dynamic content (HTML, JS, CSS, API)
    event.respondWith(networkFirst(request));
  }
});

// Network-first strategy: Try network, fallback to cache
async function networkFirst(request) {
  try {
    console.log('Service Worker: Network-first for', request.url);
    const networkResponse = await fetch(request);
    
    // Cache successful responses for offline fallback
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache for', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving from cache', request.url);
      return cachedResponse;
    }
    
    // If no cache and no network, return error
    console.error('Service Worker: No cache and no network for', request.url);
    throw error;
  }
}

// Cache-first strategy: Try cache, fallback to network
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('Service Worker: Serving static asset from cache', request.url);
    return cachedResponse;
  }
  
  console.log('Service Worker: Fetching static asset from network', request.url);
  try {
    const networkResponse = await fetch(request);
    
    // Cache the new static asset
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Failed to fetch static asset', request.url, error);
    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle offline actions when connection is restored
  console.log('Service Worker: Performing background sync');
  // You can implement offline queue processing here
}

function parsePushPayload(event) {
  if (!event.data) return {}

  try {
    return event.data.json()
  } catch (jsonError) {
    try {
      return { body: event.data.text() }
    } catch {
      return {}
    }
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = parsePushPayload(event)
  console.log('Service Worker: Push notification received', data)

  const title = data.title || 'Protector.Ng Security Alert'
  const targetUrl = data.url || data?.data?.url || '/app?tab=account'
  const options = {
    body: data.body || 'A new security update is available.',
    icon: data.icon || '/images/PRADO/slideshow/logo.PNG',
    badge: data.badge || '/images/PRADO/slideshow/logo.PNG',
    tag: data.tag || 'protector-security-alert',
    vibrate: [120, 60, 120],
    data: {
      ...data.data,
      url: targetUrl,
      receivedAt: Date.now()
    },
    actions: Array.isArray(data.actions) && data.actions.length > 0
      ? data.actions
      : [
          { action: 'open', title: 'Open App' },
          { action: 'close', title: 'Dismiss' }
        ]
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification click handler with deep-link support
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const targetUrl = event.notification?.data?.url || '/app?tab=account'
  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    const absoluteTargetUrl = new URL(targetUrl, self.location.origin).href

    for (const client of allClients) {
      if (!('focus' in client)) continue

      try {
        if ('navigate' in client && typeof client.navigate === 'function') {
          await client.navigate(absoluteTargetUrl)
        }
      } catch (error) {
        console.warn('Service Worker: navigate failed, trying focus only', error)
      }

      return client.focus()
    }

    return clients.openWindow(absoluteTargetUrl)
  })())
})

// Message listener - handle cache clearing requests from app
self.addEventListener('message', async (event) => {
  console.log('Service Worker: Message received', event.data);
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('Service Worker: Clearing all caches...');
    
    try {
      // Get all cache names
      const cacheNames = await caches.keys();
      
      // Delete all caches
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('Service Worker: Deleting cache', cacheName);
          return caches.delete(cacheName);
        })
      );
      
      console.log('Service Worker: All caches cleared successfully');
      
      // Notify all clients that cache is cleared
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'CACHE_CLEARED' });
      });
      
      // Send response back to sender
      event.ports[0]?.postMessage({ success: true });
    } catch (error) {
      console.error('Service Worker: Error clearing cache', error);
      event.ports[0]?.postMessage({ success: false, error: error.message });
    }
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Skip waiting requested');
    self.skipWaiting();
  }
});
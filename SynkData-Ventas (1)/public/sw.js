// ============================================================================
// SynkData-Ventas Service Worker — PWA Offline Support
// ============================================================================

const CACHE_NAME = 'synkdata-v1';
const DB_NAME = 'synkdata-offline';
const DB_STORE = 'operations';
const DB_VERSION = 1;

// Critical paths to pre-cache during install
const PRE_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/logo.svg',
  '/icon.svg',
];

// ---------------------------------------------------------------------------
// IndexedDB helpers (used inside the SW where we can't import modules)
// ---------------------------------------------------------------------------

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addToQueue(operation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const record = {
      url: operation.url,
      method: operation.method,
      headers: operation.headers || {},
      body: operation.body,
      timestamp: operation.timestamp || Date.now(),
    };
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function getAllQueued() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function removeFromQueue(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function clearQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

// ---------------------------------------------------------------------------
// Install event — pre-cache critical assets
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  console.log('[SW] Install — pre-caching critical assets');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Use addAll for simplicity; individual failures won't block install
      return Promise.allSettled(
        PRE_CACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn(`[SW] Failed to pre-cache ${url}:`, err);
          })
        )
      );
    })
  );
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate event — clean up old caches
// ---------------------------------------------------------------------------

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate — cleaning old caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// ---------------------------------------------------------------------------
// Message event — handle SKIP_WAITING
// ---------------------------------------------------------------------------

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING — activating immediately');
    self.skipWaiting();
  }
});

// ---------------------------------------------------------------------------
// Fetch event — route requests to the appropriate strategy
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // API requests: network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event));
    return;
  }

  // Static assets: cache-first strategy
  event.respondWith(handleStaticRequest(event));
});

// ---------------------------------------------------------------------------
// Network-first strategy for API requests
// ---------------------------------------------------------------------------

async function handleApiRequest(event) {
  const { request } = event;

  try {
    // Try the network first
    const response = await fetch(request);

    // Only cache successful GET responses
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (networkError) {
    // Network failed — check method
    if (request.method === 'GET') {
      // For GET requests, try the cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Return a basic offline JSON response for uncached GET APIs
      return new Response(
        JSON.stringify({
          error: true,
          message: 'You are offline and no cached data is available for this request.',
          offline: true,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // For mutating requests (POST, PUT, DELETE, PATCH) — queue for background sync
    if (
      request.method === 'POST' ||
      request.method === 'PUT' ||
      request.method === 'DELETE' ||
      request.method === 'PATCH'
    ) {
      try {
        // Clone the request so we can read the body
        const clonedRequest = request.clone();
        let body = null;

        try {
          body = await clonedRequest.json();
        } catch {
          // Not JSON — try text
          try {
            body = await clonedRequest.text();
          } catch {
            body = null;
          }
        }

        // Capture headers as a plain object
        const headers = {};
        clonedRequest.headers.forEach((value, key) => {
          headers[key] = value;
        });

        await addToQueue({
          url: request.url,
          method: request.method,
          headers,
          body,
          timestamp: Date.now(),
        });

        // Register a background sync if supported
        if ('sync' in self.registration) {
          await self.registration.sync.register('synkdata-sync');
        }

        return new Response(
          JSON.stringify({
            queued: true,
            message: 'You are offline. This operation has been queued and will be processed when you reconnect.',
            offline: true,
          }),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (queueError) {
        console.error('[SW] Failed to queue offline operation:', queueError);
        return new Response(
          JSON.stringify({
            error: true,
            message: 'Failed to queue the operation for offline sync. Please try again.',
            offline: true,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Fallback for any other method
    return new Response(
      JSON.stringify({
        error: true,
        message: 'You are offline.',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ---------------------------------------------------------------------------
// Cache-first strategy for static assets
// ---------------------------------------------------------------------------

async function handleStaticRequest(event) {
  const { request } = event;

  // Try the cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Not in cache — fetch from network and cache the response
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses for static assets
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // If it's a navigation request, return the cached root (SPA fallback)
    if (request.mode === 'navigate') {
      const cachedRoot = await caches.match('/');
      if (cachedRoot) {
        return cachedRoot;
      }
    }

    // Return a simple offline page for navigation requests
    if (request.mode === 'navigate') {
      return new Response(
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SynkData-Ventas — Offline</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f8f9fa;
      color: #333;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #666; margin-bottom: 1rem; }
    button {
      padding: 0.75rem 1.5rem;
      background: #10b981;
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      cursor: pointer;
    }
    button:hover { background: #059669; }
  </style>
</head>
<body>
  <div class="container">
    <h1>You are offline</h1>
    <p>SynkData-Ventas cannot reach the server right now. Your pending operations will be synced automatically when you reconnect.</p>
    <button onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>`,
        {
          status: 503,
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // For non-navigation requests, return a generic error
    return new Response('Offline — resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// ---------------------------------------------------------------------------
// Sync event — process queued offline operations
// ---------------------------------------------------------------------------

self.addEventListener('sync', (event) => {
  if (event.tag === 'synkdata-sync') {
    console.log('[SW] Background sync triggered — processing offline queue');
    event.waitUntil(processSyncQueue());
  }
});

async function processSyncQueue() {
  const operations = await getAllQueued();

  if (operations.length === 0) {
    console.log('[SW] No queued operations to sync');
    return;
  }

  console.log(`[SW] Processing ${operations.length} queued operation(s)`);

  for (const op of operations) {
    try {
      const fetchOptions = {
        method: op.method,
        headers: {
          'Content-Type': 'application/json',
          ...op.headers,
        },
      };

      // Attach body for methods that support it
      if (op.body && op.method !== 'GET' && op.method !== 'HEAD') {
        fetchOptions.body = typeof op.body === 'string' ? op.body : JSON.stringify(op.body);
      }

      const response = await fetch(op.url, fetchOptions);

      if (response.ok) {
        console.log(`[SW] Successfully synced: ${op.method} ${op.url}`);
        await removeFromQueue(op.id);
      } else {
        console.warn(
          `[SW] Sync failed for ${op.method} ${op.url} — status ${response.status}`
        );
        // Leave it in the queue for the next sync attempt
      }
    } catch (error) {
      console.error(`[SW] Sync error for ${op.method} ${op.url}:`, error);
      // Leave it in the queue for the next sync attempt
    }
  }

  // Notify all clients that the sync completed
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({
      type: 'SYNC_COMPLETED',
      remaining: (await getAllQueued()).length,
    });
  }
}

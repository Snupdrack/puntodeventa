// ============================================================================
// SynkData-Ventas Offline Helper Module
// ============================================================================
// Provides utilities for registering the service worker, managing the offline
// operation queue in IndexedDB, and reacting to connectivity changes.
// ============================================================================

const DB_NAME = 'synkdata-offline';
const DB_STORE = 'operations';
const DB_VERSION = 1;

// ---------------------------------------------------------------------------
// Internal IndexedDB helpers
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Service Worker Registration
// ---------------------------------------------------------------------------

/**
 * Registers the SynkData service worker and handles lifecycle updates.
 *
 * - On first registration the SW will be installed and activated automatically.
 * - When a new SW is found, the user can be prompted to refresh (via callback).
 * - Returns the registered ServiceWorkerRegistration or null if SW is not supported.
 */
export async function registerServiceWorker(
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[Offline] Service workers are not supported in this environment');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[Offline] Service worker registered successfully');

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // A new version is available — the old SW is still controlling the page
            console.log('[Offline] New service worker version available');

            if (onUpdateAvailable) {
              onUpdateAvailable(registration);
            } else {
              // Default behavior: force the waiting SW to activate immediately
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          } else {
            // First install — content is pre-cached
            console.log('[Offline] Content is pre-cached for offline use');
          }
        }
      });
    });

    // When the controlling SW changes, reload the page to pick up the new version
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[Offline] Service worker controller changed — reloading');
      window.location.reload();
    });

    // Listen for messages from the SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_COMPLETED') {
        console.log(
          `[Offline] Background sync completed — ${event.data.remaining ?? 0} operation(s) still queued`
        );
      }
    });

    return registration;
  } catch (error) {
    console.error('[Offline] Failed to register service worker:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Connectivity helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` when the browser reports an active network connection.
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Subscribes to online/offline events and calls the provided callback
 * with the current connectivity state whenever it changes.
 *
 * Returns an unsubscribe function for cleanup.
 */
export function onConnectionChange(
  callback: (online: boolean) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ---------------------------------------------------------------------------
// Offline Queue — IndexedDB operations
// ---------------------------------------------------------------------------

export interface OfflineOperation {
  id?: number;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: unknown;
  timestamp?: number;
}

/**
 * Reads all pending operations from the offline queue.
 */
export async function getOfflineQueue(): Promise<OfflineOperation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as OfflineOperation[]);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[Offline] Failed to read offline queue:', error);
    return [];
  }
}

/**
 * Adds a pending sale/operation to the IndexedDB offline queue.
 * This should be called when a mutating API request fails due to being offline.
 */
export async function addToOfflineQueue(
  operation: Omit<OfflineOperation, 'id'>
): Promise<number | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      const record: OfflineOperation = {
        ...operation,
        timestamp: operation.timestamp ?? Date.now(),
      };
      const request = store.add(record);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[Offline] Failed to add operation to offline queue:', error);
    return undefined;
  }
}

/**
 * Attempts to process all queued offline operations by replaying them
 * against the server. Successfully processed operations are removed from
 * the queue; failures remain for a later retry.
 *
 * Call this when connectivity is restored (e.g. on the 'online' event).
 */
export async function processOfflineQueue(): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  const operations = await getOfflineQueue();

  if (operations.length === 0) {
    return { processed: 0, failed: 0, remaining: 0 };
  }

  let processed = 0;
  let failed = 0;
  const db = await openDB();

  for (const op of operations) {
    try {
      const fetchOptions: RequestInit = {
        method: op.method,
        headers: {
          'Content-Type': 'application/json',
          ...(op.headers ?? {}),
        },
      };

      if (op.body && op.method !== 'GET' && op.method !== 'HEAD') {
        fetchOptions.body =
          typeof op.body === 'string' ? op.body : JSON.stringify(op.body);
      }

      const response = await fetch(op.url, fetchOptions);

      if (response.ok) {
        // Remove from queue on success
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(DB_STORE, 'readwrite');
          const store = tx.objectStore(DB_STORE);
          const deleteReq = store.delete(op.id!);
          deleteReq.onsuccess = () => resolve();
          deleteReq.onerror = () => reject(deleteReq.error);
          tx.oncomplete = () => {};
        });
        processed++;
      } else {
        console.warn(
          `[Offline] Replay failed for ${op.method} ${op.url} — status ${response.status}`
        );
        failed++;
      }
    } catch (error) {
      console.error(
        `[Offline] Replay error for ${op.method} ${op.url}:`,
        error
      );
      failed++;
    }
  }

  db.close();

  const remaining = (await getOfflineQueue()).length;

  return { processed, failed, remaining };
}

/**
 * Clears the entire offline queue. Use with caution.
 */
export async function clearOfflineQueue(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      const store = tx.objectStore(DB_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('[Offline] Failed to clear offline queue:', error);
  }
}

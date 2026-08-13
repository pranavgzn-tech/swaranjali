/**
 * Recordings in IndexedDB.
 *
 * Audio blobs blow past the ~5 MB localStorage limit within a few takes and
 * localStorage cannot hold binary cleanly anyway. Settings stay in
 * localStorage — small, synchronous, simple — and the audio lives here.
 *
 * Phase 1 creates the store and reports usage. The recorder that fills it
 * arrives in Phase 2.
 */

const DB_NAME = 'swaranjali';
const DB_VERSION = 1;
const STORE = 'recordings';

export interface Recording {
  id: string;
  createdAt: number;
  durationMs: number;
  label: string;
  blob: Blob;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transact<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export async function saveRecording(recording: Recording): Promise<void> {
  await transact('readwrite', (store) => store.put(recording));
  // Ask iOS to treat this as durable, once there is something worth keeping.
  if (navigator.storage?.persist) await navigator.storage.persist();
}

export function listRecordings(): Promise<Recording[]> {
  return transact<Recording[]>('readonly', (store) => store.getAll() as IDBRequest<Recording[]>);
}

export function deleteRecording(id: string): Promise<void> {
  return transact('readwrite', (store) => store.delete(id));
}

/** Human-readable storage usage, for the settings panel. */
export async function formatStorageUsage(): Promise<string> {
  if (!navigator.storage?.estimate) return 'Not reported on this device';
  try {
    const { usage } = await navigator.storage.estimate();
    if (usage === undefined) return 'Not reported on this device';
    const mb = usage / (1024 * 1024);
    return mb < 1 ? `${Math.round(usage / 1024)} KB used` : `${mb.toFixed(1)} MB used`;
  } catch {
    return 'Not reported on this device';
  }
}

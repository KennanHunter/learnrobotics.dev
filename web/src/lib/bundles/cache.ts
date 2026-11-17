// Tiny IndexedDB-backed cache for compressed bundle blobs. Keyed by
// `${kind}:${pin}` so bumping a pin naturally invalidates the old entry
// (and old entries can be swept in a follow-up). Each bundle is tens to
// hundreds of MB — this is the difference between a one-time cold load and
// a hang on every page visit.

const DB_NAME = "runtime-bundles";
const STORE = "bundles";
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function cacheKey(kind: string, pin: string): string {
  return `${kind}:${pin}`;
}

export async function readCached(
  kind: string,
  pin: string,
): Promise<Uint8Array | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(cacheKey(kind, pin));
    req.onsuccess = () => {
      const value = req.result;
      if (!value) return resolve(null);
      if (value instanceof Uint8Array) return resolve(value);
      if (value instanceof ArrayBuffer) return resolve(new Uint8Array(value));
      resolve(null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function writeCached(
  kind: string,
  pin: string,
  bytes: Uint8Array,
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(bytes, cacheKey(kind, pin));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

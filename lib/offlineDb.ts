// Minimal promise wrapper around IndexedDB. No dependencies.
// Stores: outbox (queued API writes), clients (clients registered/opened on this device), meta (id map etc.)

const DB_NAME = "ncsr-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("outbox")) db.createObjectStore("outbox", { keyPath: "id" });
      if (!db.objectStoreNames.contains("clients")) db.createObjectStore("clients", { keyPath: "clientId" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export const dbGetAll = <T = any>(store: string) => run<T[]>(store, "readonly", (s) => s.getAll());
export const dbGet = <T = any>(store: string, key: IDBValidKey) => run<T | undefined>(store, "readonly", (s) => s.get(key));
export const dbPut = (store: string, value: any) => run(store, "readwrite", (s) => s.put(value));
export const dbDelete = (store: string, key: IDBValidKey) => run(store, "readwrite", (s) => s.delete(key));
export const dbClear = (store: string) => run(store, "readwrite", (s) => s.clear());

/** Wipes every offline record on this device. Call on logout. */
export async function clearLocalStore(): Promise<void> {
  await Promise.all([dbClear("outbox"), dbClear("clients"), dbClear("meta")]);
}

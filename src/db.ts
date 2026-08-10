/**
 * Wrapper minimo de IndexedDB. Duas stores:
 *  - kv:     um unico registro com o AppData inteiro (JSON, ~centenas de kB)
 *  - photos: um Blob por foto (jpeg comprimido)
 * Sem dependencias: o que precisamos aqui cabe em 60 linhas.
 */
const DB_NAME = 'treino'
const DB_VERSION = 1
const KV = 'kv'
const PHOTOS = 'photos'

let dbp: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbp) return dbp
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV)
      if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbp
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        t.oncomplete = () => resolve(req.result)
        t.onerror = () => reject(t.error)
        t.onabort = () => reject(t.error)
      }),
  )
}

export const kvGet = <T>(key: string) => tx<T>(KV, 'readonly', (s) => s.get(key))
export const kvSet = (key: string, value: unknown) =>
  tx(KV, 'readwrite', (s) => s.put(value, key) as IDBRequest<unknown>)

export const photoGet = (id: string) => tx<Blob | undefined>(PHOTOS, 'readonly', (s) => s.get(id))
export const photoSet = (id: string, blob: Blob) =>
  tx(PHOTOS, 'readwrite', (s) => s.put(blob, id) as IDBRequest<unknown>)
export const photoDel = (id: string) =>
  tx(PHOTOS, 'readwrite', (s) => s.delete(id) as IDBRequest<unknown>)
export const photoKeys = () => tx<IDBValidKey[]>(PHOTOS, 'readonly', (s) => s.getAllKeys())

export async function storageEstimate() {
  if (!navigator.storage?.estimate) return null
  try {
    const e = await navigator.storage.estimate()
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 }
  } catch {
    return null
  }
}

/** Pede ao navegador para nao despejar os dados. Silencioso se nao suportado. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

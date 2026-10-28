// ============================================================================
// MOTOR INDEXEDDB DE ALTO RENDIMIENTO (+10,000 REGISTROS)
// ============================================================================

const DB_NAME = 'TalentATS_ProductionDB_v2';
const DB_VERSION = 2;

export const STORES = {
  HISTORICAL_8K: 'historical_8k',
  VACANCIES_2026: 'vacancies_2026',
  CANDIDATES_2026: 'candidates_2026',
  APPLICATIONS_2026: 'applications_2026',
  ADMIN_USERS: 'admin_users',
  CONFIG: 'config',
  AUDIT_LOGS: 'audit_logs'
};

class IndexedDBEngine {
  private dbPromise: Promise<IDBDatabase> | null = null;

  public getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB no está disponible en este entorno.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Store Base Histórica (Key: id)
        if (!db.objectStoreNames.contains(STORES.HISTORICAL_8K)) {
          const store = db.createObjectStore(STORES.HISTORICAL_8K, { keyPath: 'id' });
          store.createIndex('correo', 'correo', { unique: false });
          store.createIndex('area', 'area', { unique: false });
          store.createIndex('carreraPregrado', 'carreraPregrado', { unique: false });
        }

        // 2. Store Vacantes 2026+ (Key: id)
        if (!db.objectStoreNames.contains(STORES.VACANCIES_2026)) {
          const store = db.createObjectStore(STORES.VACANCIES_2026, { keyPath: 'id' });
          store.createIndex('code', 'code', { unique: true });
          store.createIndex('status', 'status', { unique: false });
        }

        // 3. Store Candidatos 2026+ (Key: dni)
        if (!db.objectStoreNames.contains(STORES.CANDIDATES_2026)) {
          const store = db.createObjectStore(STORES.CANDIDATES_2026, { keyPath: 'dni' });
          store.createIndex('nombre', 'nombre', { unique: false });
          store.createIndex('telefono', 'telefono', { unique: false });
        }

        // 4. Store Postulaciones 2026+ (Key: id)
        if (!db.objectStoreNames.contains(STORES.APPLICATIONS_2026)) {
          const store = db.createObjectStore(STORES.APPLICATIONS_2026, { keyPath: 'id' });
          store.createIndex('vacancyId', 'vacancyId', { unique: false });
          store.createIndex('candidateDni', 'candidateDni', { unique: false });
        }

        // 5. Store Usuarios Admin Autorizados (Key: id)
        if (!db.objectStoreNames.contains(STORES.ADMIN_USERS)) {
          const store = db.createObjectStore(STORES.ADMIN_USERS, { keyPath: 'id' });
          store.createIndex('email', 'email', { unique: true });
        }

        // 6. Store Configuración y Sesión
        if (!db.objectStoreNames.contains(STORES.CONFIG)) {
          db.createObjectStore(STORES.CONFIG, { keyPath: 'key' });
        }

        // 7. Store Registro de Auditoría Inmutable (Key: id)
        if (!db.objectStoreNames.contains(STORES.AUDIT_LOGS)) {
          const store = db.createObjectStore(STORES.AUDIT_LOGS, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('action', 'action', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // Get all items from a store
  public async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // Get item by key
  public async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Put a single item
  public async put<T>(storeName: string, value: T): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Bulk put for massive imports (+10,000 records in a single fast transaction)
  public async bulkPut<T>(storeName: string, items: T[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Delete item by key
  public async delete(storeName: string, key: IDBValidKey): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Clear an entire store
  public async clearStore(storeName: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Complete database wipeout
  public async wipeAll(): Promise<void> {
    const stores = Object.values(STORES);
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(stores, 'readwrite');
      for (const s of stores) {
        tx.objectStore(s).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const idb = new IndexedDBEngine();

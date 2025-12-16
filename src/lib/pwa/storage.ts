/**
 * PWA IndexedDB Storage
 * Manages family code, children data, and offline sync
 */

const DB_NAME = 'FamilyRewardsDB';
const DB_VERSION = 1;
const STORES = {
  FAMILY_CODE: 'familyCode',
  CHILDREN: 'children',
  SYNC_QUEUE: 'syncQueue',
};

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB database
 */
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Family Code store
      if (!database.objectStoreNames.contains(STORES.FAMILY_CODE)) {
        database.createObjectStore(STORES.FAMILY_CODE, { keyPath: 'id' });
      }

      // Children store
      if (!database.objectStoreNames.contains(STORES.CHILDREN)) {
        const childrenStore = database.createObjectStore(STORES.CHILDREN, { keyPath: 'id' });
        childrenStore.createIndex('familyId', 'familyId', { unique: false });
      }

      // Sync queue for offline operations
      if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        database.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

/**
 * Save family code to IndexedDB
 */
export async function saveFamilyCode(code: string, familyId?: string): Promise<void> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORES.FAMILY_CODE], 'readwrite');
    const store = transaction.objectStore(STORES.FAMILY_CODE);

    await new Promise((resolve, reject) => {
      const request = store.put({
        id: 'current',
        code: code.toUpperCase().trim(),
        familyId,
        savedAt: new Date().toISOString(),
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Error saving family code:', error);
    // Fallback to localStorage
    localStorage.setItem('family_code', code);
  }
}

/**
 * Get family code from IndexedDB
 */
export async function getFamilyCode(): Promise<string | null> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORES.FAMILY_CODE], 'readonly');
    const store = transaction.objectStore(STORES.FAMILY_CODE);

    return new Promise((resolve, reject) => {
      const request = store.get('current');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result?.code || null);
      };
    });
  } catch (error) {
    console.error('Error getting family code:', error);
    // Fallback to localStorage
    return localStorage.getItem('family_code');
  }
}

/**
 * Save children data to IndexedDB
 */
export async function saveChildren(children: any[]): Promise<void> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORES.CHILDREN], 'readwrite');
    const store = transaction.objectStore(STORES.CHILDREN);

    // Clear existing children
    await new Promise((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    // Add new children
    for (const child of children) {
      await new Promise((resolve, reject) => {
        const request = store.add({
          ...child,
          cachedAt: new Date().toISOString(),
        });

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    }
  } catch (error) {
    console.error('Error saving children:', error);
  }
}

/**
 * Get all children from IndexedDB
 */
export async function getChildren(familyId?: string): Promise<any[]> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORES.CHILDREN], 'readonly');
    const store = transaction.objectStore(STORES.CHILDREN);

    return new Promise((resolve, reject) => {
      const request = familyId 
        ? store.index('familyId').getAll(familyId)
        : store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Error getting children:', error);
    return [];
  }
}

/**
 * Get single child from IndexedDB
 */
export async function getChild(childId: string): Promise<any | null> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORES.CHILDREN], 'readonly');
    const store = transaction.objectStore(STORES.CHILDREN);

    return new Promise((resolve, reject) => {
      const request = store.get(childId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch (error) {
    console.error('Error getting child:', error);
    return null;
  }
}

/**
 * Clear all data from IndexedDB
 */
export async function clearAllData(): Promise<void> {
  try {
    const database = await initDB();
    const transaction = database.transaction(
      [STORES.FAMILY_CODE, STORES.CHILDREN, STORES.SYNC_QUEUE],
      'readwrite'
    );

    for (const storeName of [STORES.FAMILY_CODE, STORES.CHILDREN, STORES.SYNC_QUEUE]) {
      const store = transaction.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
      });
    }
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

/**
 * Add operation to sync queue for offline support
 */
export async function addToSyncQueue(operation: {
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
}): Promise<void> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    await new Promise((resolve, reject) => {
      const request = store.add({
        ...operation,
        timestamp: new Date().toISOString(),
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Error adding to sync queue:', error);
  }
}

/**
 * Get all operations from sync queue
 */
export async function getSyncQueue(): Promise<any[]> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORES.SYNC_QUEUE], 'readonly');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Error getting sync queue:', error);
    return [];
  }
}

/**
 * Remove operation from sync queue after successful sync
 */
export async function removeSyncQueueItem(id: number): Promise<void> {
  try {
    const database = await initDB();
    const transaction = database.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = transaction.objectStore(STORES.SYNC_QUEUE);

    await new Promise((resolve, reject) => {
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Error removing from sync queue:', error);
  }
}

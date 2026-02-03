import { HistoryItem } from "../types";

const DB_NAME = 'SketchToImageDB';
const STORE_NAME = 'library';
const DB_VERSION = 1;

// Open or create the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const getLibrary = async (): Promise<HistoryItem[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as HistoryItem[];
        // Sort by timestamp descending (newest first)
        items.sort((a, b) => b.timestamp - a.timestamp);
        resolve(items);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to load library from IndexedDB:", error);
    return [];
  }
};

export const saveToLibrary = async (item: HistoryItem): Promise<HistoryItem[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Add the new item
      store.put(item);

      transaction.oncomplete = async () => {
        // Return updated list
        const items = await getLibrary();
        resolve(items);
      };

      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Failed to save to library:", error);
    // Attempt to return current list even if save failed
    return getLibrary();
  }
};

export const deleteFromLibrary = async (id: string): Promise<HistoryItem[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      store.delete(id);

      transaction.oncomplete = async () => {
        const items = await getLibrary();
        resolve(items);
      };

      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error("Failed to delete from library:", error);
    return getLibrary();
  }
};
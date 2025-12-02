/**
 * IndexedDB database for storing translation keys
 */

const DB_NAME = 'paraglide-translations';
const DB_VERSION = 1;
const STORE_NAME = 'translation-keys';

let db = null;

/**
 * Initialize the IndexedDB database
 */
export async function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Create object store if it doesn't exist
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('locale', 'locale', { unique: false });
        objectStore.createIndex('key', 'key', { unique: false });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Get all stored translation keys
 */
export async function getAllKeys() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get keys for a specific locale
 */
export async function getKeysByLocale(locale) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const index = objectStore.index('locale');
    const request = index.getAll(locale);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Add or update a translation key
 */
export async function saveKey(locale, key, value) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    const record = {
      id: `${locale}:${key}`,
      locale,
      key,
      value,
      timestamp: Date.now()
    };

    const request = objectStore.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Fetch translation data from debug endpoint and sync to database
 */
export async function syncTranslations() {
  try {
    const response = await fetch('/paraglide-debug-langs.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch translations: ${response.statusText}`);
    }

    const data = await response.json();
    const stats = {
      newKeys: 0,
      updatedKeys: 0,
      totalKeys: 0
    };

    // Get existing keys
    const existingKeys = await getAllKeys();
    const existingKeyMap = new Map(existingKeys.map(k => [k.id, k]));

    // Process each locale
    for (const [locale, messages] of Object.entries(data)) {
      await processLocaleMessages(locale, messages, existingKeyMap, stats);
    }

    console.log('[DB] Sync complete:', stats);
    return stats;
  } catch (error) {
    console.error('[DB] Sync failed:', error);
    throw error;
  }
}

/**
 * Process messages for a locale (handles nested objects and arrays)
 */
async function processLocaleMessages(locale, messages, existingKeyMap, stats) {
  for (const [key, value] of Object.entries(messages)) {
    const recordId = `${locale}:${key}`;

    // Convert complex values (arrays/objects) to JSON string
    const valueStr = typeof value === 'object' ? JSON.stringify(value) : value;

    // Check if this is a new key or updated value
    const existing = existingKeyMap.get(recordId);
    if (!existing) {
      stats.newKeys++;
      console.log(`[DB] New key found: ${recordId}`);
    } else if (existing.value !== valueStr) {
      stats.updatedKeys++;
      console.log(`[DB] Updated key: ${recordId}`);
    }

    await saveKey(locale, key, valueStr);
    stats.totalKeys++;
  }
}

/**
 * Get statistics about stored translations
 */
export async function getStats() {
  const allKeys = await getAllKeys();
  const locales = new Set(allKeys.map(k => k.locale));

  return {
    totalKeys: allKeys.length,
    locales: Array.from(locales),
    keysByLocale: Object.fromEntries(
      Array.from(locales).map(locale => [
        locale,
        allKeys.filter(k => k.locale === locale).length
      ])
    )
  };
}

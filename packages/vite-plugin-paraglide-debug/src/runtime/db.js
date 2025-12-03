/**
 * IndexedDB storage for translation edits
 */

const DB_NAME = 'paraglide-translations';
const DB_VERSION = 3; // Incremented to add hasConflict index
const STORE_NAME = 'translations';

let db = null;

export async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      let store;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      } else {
        store = event.target.transaction.objectStore(STORE_NAME);
      }

      // Create indices
      if (!store.indexNames.contains('locale')) {
        store.createIndex('locale', 'locale', { unique: false });
      }
      if (!store.indexNames.contains('isEdited')) {
        store.createIndex('isEdited', 'isEdited', { unique: false });
      }
      if (!store.indexNames.contains('hasConflict')) {
        store.createIndex('hasConflict', 'hasConflict', { unique: false });
      }
    };
  });
}

export async function saveTranslationEdit(locale, key, newValue, originalValue = null) {
  const database = await initDB();
  const tx = database.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const id = `${locale}:${key}`;
  const now = new Date();

  // Get existing record to preserve originalValue if it exists
  const existingRecord = await new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  const record = {
    id,
    locale,
    key,
    originalValue: existingRecord?.originalValue || originalValue || newValue,
    editedValue: newValue,
    isEdited: true,
    hasConflict: false, // Clear conflict when user makes a new edit
    lastEditTime: now,
    lastSyncTime: existingRecord?.lastSyncTime || null,
  };

  return new Promise((resolve, reject) => {
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTranslationEdit(locale, key) {
  const database = await initDB();
  const tx = database.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const id = `${locale}:${key}`;

  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getEditedTranslations() {
  const database = await initDB();
  const tx = database.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const results = req.result.filter(r => r.isEdited === true);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getTranslation(locale, key) {
  const database = await initDB();
  const tx = database.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  const id = `${locale}:${key}`;

  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllEditedTranslations(locale) {
  const database = await initDB();
  const tx = database.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      let results = req.result;

      // Filter for edited translations only
      results = results.filter(r => r.isEdited === true);

      // Filter by locale if provided
      if (locale) {
        results = results.filter(r => r.locale === locale);
      }

      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getConflicts(locale) {
  const database = await initDB();
  const tx = database.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      let results = req.result;

      // Filter for conflicts only
      results = results.filter(r => r.hasConflict === true);

      // Filter by locale if provided
      if (locale) {
        results = results.filter(r => r.locale === locale);
      }

      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function syncTranslations(serverTranslations) {
  const database = await initDB();
  const tx = database.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const stats = {
    newKeys: 0,
    updated: 0,
    conflicts: 0,
    unchanged: 0,
    autoResolved: 0  // Edits that matched new server values
  };

  for (const [locale, translations] of Object.entries(serverTranslations)) {
    for (const [key, serverValue] of Object.entries(translations)) {
      const id = `${locale}:${key}`;

      // Get existing record
      const existingRecord = await new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      if (!existingRecord) {
        // New key - save it
        const record = {
          id,
          locale,
          key,
          originalValue: serverValue,
          editedValue: serverValue,
          isEdited: false,
          hasConflict: false,
          lastEditTime: null,
          lastSyncTime: new Date(),
        };

        await new Promise((resolve, reject) => {
          const req = store.put(record);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });

        stats.newKeys++;
      } else {
        // Existing key - smart conflict detection

        // Normalize values for comparison (handle objects/arrays)
        const normalizeValue = (val) => {
          return typeof val === 'object' ? JSON.stringify(val) : String(val);
        };

        const serverValueNormalized = normalizeValue(serverValue);
        const originalValueNormalized = normalizeValue(existingRecord.originalValue);
        const editedValueNormalized = normalizeValue(existingRecord.editedValue);

        const serverChanged = serverValueNormalized !== originalValueNormalized;
        const userHasEdit = existingRecord.isEdited;
        const userEditMatchesServer = editedValueNormalized === serverValueNormalized;

        /**
         * SMART CONFLICT DETECTION RULES:
         *
         * 1. TRUE CONFLICT: Server changed + User edited + Edit differs from new server
         *    → Show conflict dialog for user to resolve
         *
         * 2. AUTO-RESOLVE (no conflict): Server changed + User edit matches new server
         *    → Accept the change, clear edit flag (user made same change)
         *
         * 3. NO CONFLICT: Server unchanged + User edited
         *    → Keep user's edit as-is (server hasn't changed, no conflict)
         *
         * 4. SIMPLE UPDATE: Server changed + No user edit
         *    → Apply server update
         */

        if (serverChanged && userHasEdit && !userEditMatchesServer) {
          // SCENARIO 1: TRUE CONFLICT
          const updatedRecord = {
            ...existingRecord,
            originalValue: serverValue, // Update to new server value
            hasConflict: true, // Mark conflict
            lastSyncTime: new Date(),
            // Keep editedValue unchanged - preserve user's work
          };

          await new Promise((resolve, reject) => {
            const req = store.put(updatedRecord);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });

          stats.conflicts++;

        } else if (serverChanged && userHasEdit && userEditMatchesServer) {
          // SCENARIO 2: AUTO-RESOLVE - User made same change as server
          const updatedRecord = {
            ...existingRecord,
            originalValue: serverValue,
            editedValue: serverValue, // Sync with server
            isEdited: false, // Clear edit flag - change accepted
            hasConflict: false,
            lastSyncTime: new Date(),
          };

          await new Promise((resolve, reject) => {
            const req = store.put(updatedRecord);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });

          stats.autoResolved++;

        } else if (!serverChanged && userHasEdit) {
          // SCENARIO 3: Server unchanged, user has edit - no action needed
          // Don't update anything, keep user's edit
          stats.unchanged++;

        } else if (serverChanged && !userHasEdit) {
          // SCENARIO 4: Server changed, no user edit - simple update
          const updatedRecord = {
            ...existingRecord,
            originalValue: serverValue,
            editedValue: serverValue,
            lastSyncTime: new Date(),
          };

          await new Promise((resolve, reject) => {
            const req = store.put(updatedRecord);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
          });

          stats.updated++;

        } else {
          // No changes at all
          stats.unchanged++;
        }
      }
    }
  }

  return stats;
}

export async function resolveConflict(locale, key, resolution) {
  const database = await initDB();
  const tx = database.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const id = `${locale}:${key}`;

  const existingRecord = await new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (!existingRecord) {
    throw new Error(`Translation not found: ${id}`);
  }

  const updatedRecord = {
    ...existingRecord,
    hasConflict: false,
  };

  if (resolution === 'keep-local') {
    // Keep the edited value, mark as edited
    updatedRecord.isEdited = true;
  } else if (resolution === 'keep-server') {
    // Use the server value
    updatedRecord.editedValue = existingRecord.originalValue;
    updatedRecord.isEdited = false;
  } else if (typeof resolution === 'string') {
    // Custom merge value
    updatedRecord.editedValue = resolution;
    updatedRecord.isEdited = true;
  }

  return new Promise((resolve, reject) => {
    const req = store.put(updatedRecord);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

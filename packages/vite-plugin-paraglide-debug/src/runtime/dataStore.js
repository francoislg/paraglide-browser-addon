/**
 * Unified Data Access Layer
 *
 * Loads server translations and local edits ONCE during initialization,
 * stores them in memory for fast synchronous access.
 *
 * This eliminates repeated network calls and database queries.
 */

import { initDB } from './db.js';

// In-memory cache (populated during initialization)
let serverTranslations = null; // { locale: { key: value } }
let localEdits = null;         // Map<locale:key, {editedValue, isEdited, hasConflict, ...}>
let isInitialized = false;

/**
 * Initialize data store - called once during startup
 * Loads both server translations and local edits into memory
 */
export async function initDataStore() {
  if (isInitialized) {
    console.log('[paraglide-debug] Data store already initialized');
    return;
  }

  console.log('[paraglide-debug] Initializing data store...');

  // Load server translations from endpoint (called ONCE)
  try {
    const response = await fetch('/@paraglide-debug/langs.json');
    if (response.ok) {
      serverTranslations = await response.json();
      const localeCount = Object.keys(serverTranslations).length;
      const keyCount = Object.values(serverTranslations).reduce(
        (sum, locale) => sum + Object.keys(locale).length,
        0
      );
      console.log(
        `[paraglide-debug] ✓ Loaded server translations: ${localeCount} locales, ${keyCount} keys`
      );
    } else {
      console.error('[paraglide-debug] Failed to load server translations:', response.status);
      serverTranslations = {};
    }
  } catch (error) {
    console.error('[paraglide-debug] Error loading server translations:', error);
    serverTranslations = {};
  }

  // Load all local edits from IndexedDB (called ONCE)
  try {
    const database = await initDB();
    const tx = database.transaction('translations', 'readonly');
    const store = tx.objectStore('translations');

    const allRecords = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    // Build cache map
    localEdits = new Map();
    for (const record of allRecords) {
      const cacheKey = `${record.locale}:${record.key}`;
      localEdits.set(cacheKey, {
        editedValue: record.editedValue,
        originalValue: record.originalValue,
        isEdited: record.isEdited,
        hasConflict: record.hasConflict,
        lastEditTime: record.lastEditTime,
        lastSyncTime: record.lastSyncTime,
      });
    }

    console.log(`[paraglide-debug] ✓ Loaded local edits: ${localEdits.size} records`);
  } catch (error) {
    console.error('[paraglide-debug] Error loading local edits:', error);
    localEdits = new Map();
  }

  // Make accessible globally
  if (typeof window !== 'undefined') {
    window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};
    window.__paraglideBrowserDebug.dataStore = {
      serverTranslations,
      localEdits,
    };
  }

  isInitialized = true;
  console.log('[paraglide-debug] ✓ Data store initialized');
}

/**
 * Get the translation to display (edited if exists, otherwise server)
 * Returns the RAW template (with {param} placeholders intact)
 * SYNCHRONOUS - no await needed
 *
 * @param {string} locale - Locale code (e.g., 'en', 'fr', 'es')
 * @param {string} key - Translation key
 * @returns {Object} Translation data
 */
export function getDisplayTranslation(locale, key) {
  if (!isInitialized) {
    console.warn('[paraglide-debug] Data store not initialized, call initDataStore() first');
    return {
      value: '',
      isEdited: false,
      hasConflict: false,
      source: 'none',
    };
  }

  const cacheKey = `${locale}:${key}`;
  const localEdit = localEdits?.get(cacheKey);

  // If user has edited this translation, use their version
  if (localEdit?.isEdited) {
    return {
      value: localEdit.editedValue,
      isEdited: true,
      hasConflict: localEdit.hasConflict || false,
      source: 'local',
      lastEditTime: localEdit.lastEditTime,
    };
  }

  // Otherwise, use server version
  const serverValue = serverTranslations?.[locale]?.[key];
  if (serverValue !== undefined) {
    return {
      value: serverValue,
      isEdited: false,
      hasConflict: false,
      source: 'server',
    };
  }

  // Not found anywhere
  return {
    value: '',
    isEdited: false,
    hasConflict: false,
    source: 'none',
  };
}

/**
 * Get both versions for comparison (edit popup, conflict resolution)
 * SYNCHRONOUS - no await needed
 *
 * @param {string} locale - Locale code
 * @param {string} key - Translation key
 * @returns {Object} Both versions
 */
export function getTranslationVersions(locale, key) {
  if (!isInitialized) {
    console.warn('[paraglide-debug] Data store not initialized');
    return {
      edited: null,
      server: '',
      current: '',
      isEdited: false,
      hasConflict: false,
    };
  }

  const cacheKey = `${locale}:${key}`;
  const localEdit = localEdits?.get(cacheKey);
  const serverValue = serverTranslations?.[locale]?.[key] || '';

  return {
    edited: localEdit?.editedValue || null,
    server: serverValue,
    current: localEdit?.isEdited ? localEdit.editedValue : serverValue,
    isEdited: localEdit?.isEdited || false,
    hasConflict: localEdit?.hasConflict || false,
    originalValue: localEdit?.originalValue || serverValue,
  };
}

/**
 * Check if a translation has been edited locally
 *
 * @param {string} locale - Locale code
 * @param {string} key - Translation key
 * @returns {boolean} True if edited
 */
export function isTranslationEdited(locale, key) {
  const cacheKey = `${locale}:${key}`;
  return localEdits?.get(cacheKey)?.isEdited || false;
}

/**
 * Check if a translation has a conflict
 *
 * @param {string} locale - Locale code
 * @param {string} key - Translation key
 * @returns {boolean} True if has conflict
 */
export function hasTranslationConflict(locale, key) {
  const cacheKey = `${locale}:${key}`;
  return localEdits?.get(cacheKey)?.hasConflict || false;
}

/**
 * Update local cache after editing (call after saving to DB)
 *
 * @param {string} locale - Locale code
 * @param {string} key - Translation key
 * @param {string} editedValue - New edited value
 * @param {boolean} isEdited - Is edited flag
 * @param {boolean} hasConflict - Has conflict flag
 */
export function updateLocalCache(locale, key, editedValue, isEdited, hasConflict = false) {
  if (!localEdits) {
    console.warn('[paraglide-debug] Cannot update cache, data store not initialized');
    return;
  }

  const cacheKey = `${locale}:${key}`;
  const existing = localEdits.get(cacheKey) || {};

  localEdits.set(cacheKey, {
    ...existing,
    editedValue,
    isEdited,
    hasConflict,
    lastEditTime: new Date(),
  });

  console.log(`[paraglide-debug] Updated cache for ${cacheKey}`);
}

/**
 * Refresh data store (call after sync to reload server data)
 */
export async function refreshDataStore() {
  console.log('[paraglide-debug] Refreshing data store...');
  isInitialized = false;
  await initDataStore();
}

/**
 * Get all server translations (for export, debugging)
 *
 * @returns {Object} Server translations
 */
export function getServerTranslations() {
  return serverTranslations;
}

/**
 * Get all local edits (for export, debugging)
 *
 * @returns {Map} Local edits map
 */
export function getLocalEdits() {
  return localEdits;
}

/**
 * Check if data store is initialized
 *
 * @returns {boolean} True if initialized
 */
export function isDataStoreInitialized() {
  return isInitialized;
}

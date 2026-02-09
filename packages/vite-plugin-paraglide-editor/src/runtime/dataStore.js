/**
 * Unified Data Access Layer
 *
 * Purpose: In-memory cache for translations and local edits.
 *
 * Responsibilities:
 * - Load server translations ONCE during initialization
 * - Load local edits from IndexedDB ONCE during initialization
 * - Provide synchronous access to translation data
 * - Manage cache updates when edits are saved
 * - Eliminate repeated network calls and database queries
 *
 * This module does NOT:
 * - Render translations (see renderer.js)
 * - Handle UI interactions (see ui/)
 * - Manage IndexedDB directly (see db.js)
 */

import { initDB } from './db.js';

// In-memory cache (populated during initialization)
let serverTranslations = null; // { locale: { key: value } }
let localEdits = null;         // Map<locale:key, {editedValue, isEdited, hasConflict, ...}>
let isInitialized = false;

/**
 * Initialize data store - called once during startup
 * Loads both server translations and local edits into memory
 * Performs initial sync if DB is empty
 */
export async function initDataStore() {
  if (isInitialized) {
    console.log('[paraglide-editor] Data store already initialized');
    return;
  }

  console.log('[paraglide-editor] Initializing data store...');

  try {
    const response = await fetch('/@paraglide-editor/langs.json');
    if (response.ok) {
      serverTranslations = await response.json();
      const localeCount = Object.keys(serverTranslations).length;
      const keyCount = Object.values(serverTranslations).reduce(
        (sum, locale) => sum + Object.keys(locale).length,
        0
      );
      console.log(
        `[paraglide-editor] ✓ Loaded server translations: ${localeCount} locales, ${keyCount} keys`
      );
    } else {
      console.error('[paraglide-editor] Failed to load server translations:', response.status);
      serverTranslations = {};
    }
  } catch (error) {
    console.error('[paraglide-editor] Error loading server translations:', error);
    serverTranslations = {};
  }

  try {
    const database = await initDB();
    const tx = database.transaction('translations', 'readonly');
    const store = tx.objectStore('translations');

    const allRecords = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    // Check if we need to do an initial sync (DB is empty)
    if (allRecords.length === 0 && Object.keys(serverTranslations).length > 0) {
      console.log('[paraglide-editor] DB is empty, performing initial sync...');

      // Import syncTranslations to populate the DB
      const { syncTranslations } = await import('./db.js');
      const stats = await syncTranslations(serverTranslations);
      console.log('[paraglide-editor] Initial sync complete:', stats);

      // Reload records after sync
      const txAfterSync = database.transaction('translations', 'readonly');
      const storeAfterSync = txAfterSync.objectStore('translations');
      const reloadedRecords = await new Promise((resolve, reject) => {
        const req = storeAfterSync.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      allRecords.length = 0;
      allRecords.push(...reloadedRecords);
    }

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

    console.log(`[paraglide-editor] ✓ Loaded local edits: ${localEdits.size} records`);
  } catch (error) {
    console.error('[paraglide-editor] Error loading local edits:', error);
    localEdits = new Map();
  }

  if (typeof window !== 'undefined') {
    window.__paraglideEditor = window.__paraglideEditor || {};
    window.__paraglideEditor.dataStore = {
      serverTranslations,
      localEdits,
    };
  }

  isInitialized = true;
  console.log('[paraglide-editor] ✓ Data store initialized');
}

/**
 * Get the translation to display (edited if exists, otherwise server)
 * Returns the RAW template (with {param} placeholders intact)
 *
 * @param {string} locale - Locale code (e.g., 'en', 'fr', 'es')
 * @param {string} key - Translation key
 * @returns {Object} Translation data
 */
export function getDisplayTranslation(locale, key) {
  if (!isInitialized) {
    console.warn('[paraglide-editor] Data store not initialized, call initDataStore() first');
    return {
      value: '',
      isEdited: false,
      hasConflict: false,
      source: 'none',
    };
  }

  const cacheKey = `${locale}:${key}`;
  const localEdit = localEdits?.get(cacheKey);

  if (localEdit?.isEdited) {
    return {
      value: localEdit.editedValue,
      isEdited: true,
      hasConflict: localEdit.hasConflict || false,
      source: 'local',
      lastEditTime: localEdit.lastEditTime,
    };
  }

  const serverValue = serverTranslations?.[locale]?.[key];
  if (serverValue !== undefined) {
    return {
      value: serverValue,
      isEdited: false,
      hasConflict: false,
      source: 'server',
    };
  }

  return {
    value: '',
    isEdited: false,
    hasConflict: false,
    source: 'none',
  };
}

/**
 * Get both versions for comparison (edit popup, conflict resolution)
 *
 * @param {string} locale - Locale code
 * @param {string} key - Translation key
 * @returns {Object} Both versions
 */
export function getTranslationVersions(locale, key) {
  if (!isInitialized) {
    console.warn('[paraglide-editor] Data store not initialized');
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
    console.warn('[paraglide-editor] Cannot update cache, data store not initialized');
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

  console.log(`[paraglide-editor] Updated cache for ${cacheKey}`);
}

/**
 * Refresh data store (call after sync to reload server data)
 */
export async function refreshDataStore() {
  console.log('[paraglide-editor] Refreshing data store...');
  isInitialized = false;
  await initDataStore();
}

/**
 * Get all server translations (for export, debugging)
 *
 * @returns {Object}
 */
export function getServerTranslations() {
  return serverTranslations;
}


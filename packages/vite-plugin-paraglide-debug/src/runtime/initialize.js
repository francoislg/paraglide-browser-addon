/**
 * Master Initialization Coordinator
 *
 * Purpose: Orchestrate startup of all debug subsystems in correct order.
 *
 * Responsibilities:
 * - Initialize database connection
 * - Load data store (server translations + local edits)
 * - Wait for Paraglide registry to be populated
 * - Emit __paraglideDebugInitialized event when ready
 * - Ensure proper initialization sequence
 *
 * Initialization Order:
 * 1. Database (IndexedDB)
 * 2. Data Store (loads server translations + local edits ONCE)
 * 3. Wait for Paraglide registry (__paraglideInitialized event)
 * 4. Emit __paraglideDebugInitialized
 *
 * This module does NOT:
 * - Build element registry (see registry.js)
 * - Initialize UI components (see runtime.js)
 * - Handle events after initialization (see runtime.js)
 */

import { initDB } from './db.js';
import { initDataStore } from './dataStore.js';

/**
 * Initialize the Paraglide debug system
 * Loads all data once and coordinates component initialization
 *
 * @returns {Promise<void>}
 */
export async function initialize() {
  console.log('[paraglide-debug] Starting initialization...');

  const initSteps = [
    { name: 'Database', fn: initDB },
    { name: 'Data Store (Server + Local Edits)', fn: initDataStore },
    { name: 'Registry Wait', fn: waitForRegistry },
  ];

  for (const step of initSteps) {
    try {
      console.log(`[paraglide-debug] Init: ${step.name}...`);
      await step.fn();
      console.log(`[paraglide-debug] Init: ${step.name} ✓`);
    } catch (error) {
      console.error(`[paraglide-debug] Init: ${step.name} failed:`, error);
      throw error;
    }
  }

  const event = new CustomEvent('__paraglideDebugInitialized', {
    detail: {
      timestamp: Date.now(),
      registrySize: window.__paraglideBrowserDebug.registry?.size || 0,
      serverTranslationsLoaded: Object.keys(window.__paraglideBrowserDebug.dataStore?.serverTranslations || {}).length,
      localEditsLoaded: window.__paraglideBrowserDebug.dataStore?.localEdits?.size || 0
    }
  });
  window.dispatchEvent(event);

  console.log('[paraglide-debug] ✓ Initialization complete, emitted __paraglideDebugInitialized');
  console.log('[paraglide-debug] Data summary:', {
    registrySize: event.detail.registrySize,
    locales: event.detail.serverTranslationsLoaded,
    localEdits: event.detail.localEditsLoaded
  });
}

/**
 * Wait for Paraglide registry to be populated by message functions
 * Registry is populated when app calls translation functions like greeting()
 *
 * @returns {Promise<void>}
 */
async function waitForRegistry() {
  return new Promise((resolve) => {
    if (window.__paraglideBrowserDebug?.registry?.size > 0) {
      console.log('[paraglide-debug] Registry already populated:', window.__paraglideBrowserDebug.registry.size);
      resolve();
      return;
    }

    console.log('[paraglide-debug] Waiting for __paraglideInitialized event...');
    const handler = (e) => {
      console.log('[paraglide-debug] Registry populated via event:', e.detail.registrySize);
      window.removeEventListener('__paraglideInitialized', handler);
      resolve();
    };
    window.addEventListener('__paraglideInitialized', handler);
  });
}

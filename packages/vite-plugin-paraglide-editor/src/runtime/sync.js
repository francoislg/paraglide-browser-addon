/**
 * Server Sync Functionality
 *
 * Purpose: Synchronize local edits with server translations and detect conflicts.
 *
 * Responsibilities:
 * - Fetch latest translations from server
 * - Compare server translations with local edits
 * - Detect conflicts when both server and local have changed
 * - Auto-resolve conflicts when edits match server changes
 * - Refresh data store after sync
 * - Update UI with sync results
 *
 * This module does NOT:
 * - Resolve conflicts manually (see ui/conflictList.js)
 * - Store data directly (see db.js)
 * - Provide UI (see ui/modal.js)
 */

import { syncTranslations } from './db.js';
import { refreshDataStore, getTranslationsUrl } from './dataStore.js';

export async function syncWithServer() {
  try {
    console.log('[paraglide-editor] Fetching translations from server...');

    const response = await fetch(getTranslationsUrl());

    if (!response.ok) {
      throw new Error(`Failed to fetch translations: ${response.status} ${response.statusText}`);
    }

    const serverTranslations = await response.json();

    console.log('[paraglide-editor] Server translations fetched:', Object.keys(serverTranslations));

    const stats = await syncTranslations(serverTranslations);

    console.log('[paraglide-editor] Sync complete:', stats);

    await refreshDataStore();
    console.log('[paraglide-editor] Data store refreshed after sync');

    if (window.__paraglideEditor?.applySavedEdits) {
      window.__paraglideEditor.applySavedEdits();
    }

    const messages = [];
    if (stats.newKeys > 0) messages.push(`${stats.newKeys} new keys`);
    if (stats.updated > 0) messages.push(`${stats.updated} updated`);
    if (stats.autoResolved > 0) messages.push(`${stats.autoResolved} auto-resolved`);
    if (stats.conflicts > 0) messages.push(`${stats.conflicts} conflicts detected`);
    if (stats.unchanged > 0) messages.push(`${stats.unchanged} unchanged`);

    const summary = messages.length > 0 ? messages.join(', ') : 'No changes';

    if (window.__paraglideEditor?.refreshConflictList) {
      await window.__paraglideEditor.refreshConflictList();
    }

    console.log(`[paraglide-editor] Sync complete: ${summary}`);

    return stats;
  } catch (error) {
    console.error('[paraglide-editor] Sync failed:', error);
    alert(`Sync failed: ${error.message}\n\nCheck console for details.`);
    throw error;
  }
}

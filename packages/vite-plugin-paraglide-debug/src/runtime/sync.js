/**
 * Sync functionality for fetching server translations and detecting conflicts
 */

import { syncTranslations } from './db.js';
import { refreshDataStore } from './dataStore.js';

export async function syncWithServer() {
  try {
    console.log('[paraglide-debug] Fetching translations from server...');

    // Fetch translations from the debug endpoint
    const response = await fetch('/@paraglide-debug/langs.json');

    if (!response.ok) {
      throw new Error(`Failed to fetch translations: ${response.status} ${response.statusText}`);
    }

    const serverTranslations = await response.json();

    console.log('[paraglide-debug] Server translations fetched:', Object.keys(serverTranslations));

    // Sync with database
    const stats = await syncTranslations(serverTranslations);

    console.log('[paraglide-debug] Sync complete:', stats);

    // Refresh data store (reload server translations + local edits)
    await refreshDataStore();
    console.log('[paraglide-debug] Data store refreshed after sync');

    // Re-apply saved edits to update UI
    if (window.__paraglideBrowserDebug?.applySavedEdits) {
      window.__paraglideBrowserDebug.applySavedEdits();
    }

    // Show results to user
    const messages = [];
    if (stats.newKeys > 0) messages.push(`${stats.newKeys} new keys`);
    if (stats.updated > 0) messages.push(`${stats.updated} updated`);
    if (stats.autoResolved > 0) messages.push(`${stats.autoResolved} auto-resolved`);
    if (stats.conflicts > 0) messages.push(`${stats.conflicts} conflicts detected`);
    if (stats.unchanged > 0) messages.push(`${stats.unchanged} unchanged`);

    const summary = messages.length > 0 ? messages.join(', ') : 'No changes';

    // Refresh conflict list if it exists
    if (window.__paraglideBrowserDebug?.refreshConflictList) {
      await window.__paraglideBrowserDebug.refreshConflictList();
    }

    if (stats.conflicts > 0) {
      alert(`Sync complete: ${summary}\n\nYou have ${stats.conflicts} conflict(s) that need resolution.`);
    } else if (stats.autoResolved > 0) {
      alert(`Sync complete: ${summary}\n\n✓ Your edits matched the server changes and were auto-accepted.`);
    } else {
      alert(`Sync complete: ${summary}`);
    }

    return stats;
  } catch (error) {
    console.error('[paraglide-debug] Sync failed:', error);
    alert(`Sync failed: ${error.message}\n\nCheck console for details.`);
    throw error;
  }
}

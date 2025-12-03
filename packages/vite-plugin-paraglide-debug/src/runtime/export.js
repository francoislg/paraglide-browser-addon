/**
 * Export functionality for translation edits
 */

import { getEditedTranslations } from './db.js';
import { getServerTranslations } from './dataStore.js';

export async function exportEdits() {
  try {
    const edits = await getEditedTranslations();

    if (edits.length === 0) {
      alert('No edits to export yet.');
      return;
    }

    // Get server translations from cache (no network call)
    console.log('[paraglide-debug] Getting server translations from cache...');
    const serverTranslations = getServerTranslations();

    if (!serverTranslations) {
      throw new Error('Server translations not loaded yet');
    }

    console.log('[paraglide-debug] Server translations loaded from cache:', Object.keys(serverTranslations));

    // Group edits by locale
    const editsByLocale = {};
    edits.forEach(edit => {
      if (!editsByLocale[edit.locale]) {
        editsByLocale[edit.locale] = {};
      }

      // Parse JSON values (for plural forms) back to objects
      let value = edit.editedValue;
      try {
        const parsed = JSON.parse(value);
        // If it's a valid JSON array/object, use it
        if (typeof parsed === 'object') {
          value = parsed;
        }
      } catch {
        // Keep as string
      }

      editsByLocale[edit.locale][edit.key] = value;
    });

    // Merge server translations with edits for each locale
    const mergedTranslations = {};
    for (const locale of Object.keys(serverTranslations)) {
      // Start with server translations
      mergedTranslations[locale] = { ...serverTranslations[locale] };

      // Override with edited values
      if (editsByLocale[locale]) {
        Object.assign(mergedTranslations[locale], editsByLocale[locale]);
      }
    }

    // Also include any locales that only have edits (not in server)
    for (const locale of Object.keys(editsByLocale)) {
      if (!mergedTranslations[locale]) {
        mergedTranslations[locale] = editsByLocale[locale];
      }
    }

    // Create and download JSON files
    const locales = Object.keys(mergedTranslations);
    for (const locale of locales) {
      const json = JSON.stringify(mergedTranslations[locale], null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${locale}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`[paraglide-debug] Exported full ${locale}.json with ${Object.keys(mergedTranslations[locale]).length} keys`);
    }

    console.log(`[paraglide-debug] Exported ${locales.length} language files`);
    alert(`Successfully exported ${locales.length} complete language files!\n\nFiles: ${locales.map(l => `${l}.json`).join(', ')}`);
  } catch (error) {
    console.error('[paraglide-debug] Export failed:', error);
    alert(`Export failed: ${error.message}\n\nCheck console for details.`);
  }
}

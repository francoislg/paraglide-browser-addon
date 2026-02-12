/**
 * Export Functionality
 *
 * Purpose: Export translation edits as downloadable JSON files.
 *
 * Responsibilities:
 * - Merge server translations with local edits
 * - Generate complete translation JSON files per locale
 * - Trigger browser downloads for each locale
 * - Handle plural/variant serialization
 *
 * This module does NOT:
 * - Modify stored data (see db.js, dataStore.js)
 * - Provide UI (see ui/modal.js)
 * - Render translations (see renderer.js)
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

    console.debug('[paraglide-editor] Getting server translations from cache...');
    const serverTranslations = getServerTranslations();

    if (!serverTranslations) {
      throw new Error('Server translations not loaded yet');
    }

    console.debug('[paraglide-editor] Server translations loaded from cache:', Object.keys(serverTranslations));

    const editsByLocale = {};
    edits.forEach(edit => {
      if (!editsByLocale[edit.locale]) {
        editsByLocale[edit.locale] = {};
      }

      let value = edit.editedValue;
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object') {
          value = parsed;
        }
      } catch {
      }

      editsByLocale[edit.locale][edit.key] = value;
    });

    const mergedTranslations = {};
    for (const locale of Object.keys(serverTranslations)) {
      mergedTranslations[locale] = { ...serverTranslations[locale] };

      if (editsByLocale[locale]) {
        Object.assign(mergedTranslations[locale], editsByLocale[locale]);
      }
    }

    for (const locale of Object.keys(editsByLocale)) {
      if (!mergedTranslations[locale]) {
        mergedTranslations[locale] = editsByLocale[locale];
      }
    }

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

      console.debug(`[paraglide-editor] Exported full ${locale}.json with ${Object.keys(mergedTranslations[locale]).length} keys`);
    }

    console.debug(`[paraglide-editor] Exported ${locales.length} language files`);
    alert(`Successfully exported ${locales.length} complete language files!\n\nFiles: ${locales.map(l => `${l}.json`).join(', ')}`);
  } catch (error) {
    console.error('[paraglide-editor] Export failed:', error);
    alert(`Export failed: ${error.message}\n\nCheck console for details.`);
  }
}

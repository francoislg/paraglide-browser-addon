/**
 * Shared Helper Functions
 */

import { getCurrentLocale } from './languageDetection.js';

export function getSelectedLanguages() {
  const stored = localStorage.getItem('pg-selected-languages');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.warn('[paraglide-debug] Failed to parse selected languages', e);
    }
  }
  return [getCurrentLocale()];
}

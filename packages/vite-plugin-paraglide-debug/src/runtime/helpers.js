/**
 * Shared helper functions for translation editing
 */

import { getCurrentLocale } from './languageDetection.js';
import { getServerTranslations } from './dataStore.js';

/**
 * Get selected languages from localStorage
 */
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

/**
 * Get translations for a specific key from cached data (no network call)
 */
export async function fetchTranslationsForKey(key) {
  try {
    // Use cached server translations - no network call!
    const allTranslations = getServerTranslations();

    if (!allTranslations) {
      console.warn('[paraglide-debug] Server translations not loaded yet');
      return {};
    }

    // Extract the specific key from all locales
    const keyTranslations = {};
    for (const [locale, translations] of Object.entries(allTranslations)) {
      if (translations[key]) {
        keyTranslations[locale] = translations[key];
      }
    }

    return keyTranslations;
  } catch (error) {
    console.error('[paraglide-debug] Failed to get translations from cache:', error);
    return {};
  }
}

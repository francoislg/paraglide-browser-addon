/**
 * Shared Helper Functions
 *
 * Purpose: Provide utility functions used across multiple modules.
 *
 * Responsibilities:
 * - Get selected languages from localStorage
 * - Fetch translations for a specific key from cache
 * - Other general-purpose utilities
 *
 * This module does NOT:
 * - Contain UI code (see ui/)
 * - Render translations (see renderer.js)
 * - Manage data storage (see dataStore.js, db.js)
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

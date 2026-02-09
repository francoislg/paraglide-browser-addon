/**
 * Shared Helper Functions
 */

import { getCurrentLocale } from './languageDetection.js';

/**
 * Check if the Paraglide debug runtime is enabled.
 *
 * When `requireOptIn` is false (the default), this always returns true —
 * the debug tools activate automatically when the Vite env var is set.
 * When `requireOptIn` is true, the user must set
 * `localStorage.setItem('pg-enabled', 'true')` to activate the tools.
 *
 * @returns {boolean}
 */
export function isPgEnabled() {
  if (!window.__paraglideBrowserDebug?.config?.requireOptIn) return true;
  return localStorage.getItem('pg-enabled') === 'true';
}

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

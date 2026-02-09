/**
 * Shared Helper Functions
 */

import { getCurrentLocale } from './languageDetection.js';

/**
 * Check if the Paraglide editor runtime is enabled.
 *
 * When `requireOptIn` is false (the default), this always returns true —
 * the editor tools activate automatically when the Vite env var is set.
 * When `requireOptIn` is true, the user must run this in the browser console:
 * `localStorage.setItem('pge-enabled', 'true')`
 *
 * @returns {boolean}
 */
export function isPgeEnabled() {
  if (!window.__paraglideEditor?.config?.requireOptIn) return true;
  return localStorage.getItem('pge-enabled') === 'true';
}

export function getSelectedLanguages() {
  const stored = localStorage.getItem('pge-selected-languages');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.warn('[paraglide-editor] Failed to parse selected languages', e);
    }
  }
  return [getCurrentLocale()];
}

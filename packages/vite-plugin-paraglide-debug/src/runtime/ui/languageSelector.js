/**
 * Language Selector UI Component
 *
 * Purpose: Provide UI for selecting which languages to edit in the translation editor.
 *
 * Responsibilities:
 * - Render language checkboxes in the modal
 * - Handle language selection state
 * - Update selected languages display
 * - Provide locale switching functionality
 *
 * This module does NOT:
 * - Contain helper functions (see helpers.js)
 * - Manage translations or data (see dataStore.js)
 * - Handle rendering logic (see renderer.js)
 */

import { getCurrentLocale } from '../languageDetection.js';
import { getServerTranslations } from '../dataStore.js';
import { getSelectedLanguages } from '../helpers.js';

/**
 * Save selected languages to localStorage
 */
function saveSelectedLanguages(languages) {
  localStorage.setItem('pg-selected-languages', JSON.stringify(languages));
  updateSelectedLanguagesDisplay(languages);
}

/**
 * Update the "Selected languages" display
 */
function updateSelectedLanguagesDisplay(languages) {
  const display = document.getElementById('pg-selected-locales');
  if (display) {
    if (languages.length === 0) {
      display.textContent = 'None';
      display.style.color = '#e53e3e';
    } else {
      display.textContent = languages.map(l => l.toUpperCase()).join(', ');
      display.style.color = '#48bb78';
    }
  }
}

/**
 * Initialize the language selector with checkboxes
 */
export async function initLanguageSelector() {
  try {
    // Get and display current locale immediately
    const currentLocale = getCurrentLocale();
    const currentLocaleEl = document.getElementById('pg-current-locale');
    if (currentLocaleEl) {
      currentLocaleEl.textContent = currentLocale.toUpperCase();
    }

    // Get available locales from cached data (no network call)
    let locales = [currentLocale]; // Default fallback
    try {
      const translations = getServerTranslations();
      if (translations && Object.keys(translations).length > 0) {
        locales = Object.keys(translations);
        console.log('[paraglide-debug] Loaded locales from cache:', locales);
      } else {
        console.warn('[paraglide-debug] Server translations not loaded yet, using fallback');
        if (currentLocaleEl) {
          currentLocaleEl.textContent = currentLocale.toUpperCase() + ' (loading...)';
        }
      }
    } catch (error) {
      console.error('[paraglide-debug] Error getting locales from cache:', error);
      if (currentLocaleEl) {
        currentLocaleEl.textContent = currentLocale.toUpperCase() + ' (error)';
      }
    }

    // Get selected languages (or default to current locale)
    let selectedLanguages = getSelectedLanguages();

    // Ensure current locale is in selected languages
    if (!selectedLanguages.includes(currentLocale)) {
      selectedLanguages.push(currentLocale);
      saveSelectedLanguages(selectedLanguages);
    }

    // Create locale checkboxes
    const checkboxContainer = document.getElementById('pg-locale-checkboxes');
    if (!checkboxContainer) {
      console.error('[paraglide-debug] Checkbox container #pg-locale-checkboxes not found!');
      return;
    }

    console.log('[paraglide-debug] Creating checkboxes for locales:', locales);
    checkboxContainer.innerHTML = '';

    locales.forEach(locale => {
      const label = document.createElement('label');
      label.style.display = 'inline-flex';
      label.style.alignItems = 'center';
      label.style.gap = '4px';
      label.style.cursor = 'pointer';
      label.style.whiteSpace = 'nowrap';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = locale;
      checkbox.checked = selectedLanguages.includes(locale);
      checkbox.id = `pg-locale-${locale}`;
      checkbox.style.cursor = 'pointer';

      const labelText = document.createElement('span');
      labelText.textContent = locale.toUpperCase();
      labelText.style.fontSize = '13px';
      labelText.style.fontWeight = '500';

      // Highlight current locale
      if (locale === currentLocale) {
        labelText.style.color = '#667eea';
      }

      // Handle checkbox change
      checkbox.addEventListener('change', (e) => {
        let selected = getSelectedLanguages();

        if (e.target.checked) {
          if (!selected.includes(locale)) {
            selected.push(locale);
          }
        } else {
          selected = selected.filter(l => l !== locale);
        }

        saveSelectedLanguages(selected);
        console.log('[paraglide-debug] Selected languages updated:', selected);
      });

      label.appendChild(checkbox);
      label.appendChild(labelText);
      checkboxContainer.appendChild(label);
      console.log(`[paraglide-debug] Created checkbox for locale: ${locale}`);
    });

    console.log(`[paraglide-debug] Checkbox container now has ${checkboxContainer.children.length} children`);

    // Update selected languages display
    updateSelectedLanguagesDisplay(selectedLanguages);

    console.log(`[paraglide-debug] Language selector initialized with ${locales.length} locales`);
    console.log(`[paraglide-debug] Current locale: ${currentLocale}, Selected: ${selectedLanguages.join(', ')}`);
  } catch (error) {
    console.error('[paraglide-debug] Failed to initialize language selector:', error);
  }
}

/**
 * Switch to a different locale
 */
export function switchLocale(newLocale) {
  console.log(`[paraglide-debug] Switching locale to: ${newLocale}`);

  // Try app's switchLanguage function first (if it exists)
  if (typeof window.switchLanguage === 'function') {
    window.switchLanguage(newLocale);
    // Trigger language change detection
    if (window.__paraglideBrowserDebug.updateCurrentLocale) {
      window.__paraglideBrowserDebug.updateCurrentLocale();
    }
    // Close modal
    document.getElementById('pg-editor-modal')?.remove();
    return;
  }

  // Fallback: Store locale and reload page
  localStorage.setItem('PARAGLIDE_LOCALE', newLocale);
  document.cookie = `PARAGLIDE_LOCALE=${newLocale}; path=/; max-age=34560000`;

  // Trigger language change detection before reload
  if (window.__paraglideBrowserDebug.updateCurrentLocale) {
    window.__paraglideBrowserDebug.updateCurrentLocale();
  }

  // Reload the page to apply new locale
  window.location.reload();
}

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

function saveSelectedLanguages(languages) {
  localStorage.setItem('pge-selected-languages', JSON.stringify(languages));
  updateSelectedLanguagesDisplay(languages);
}

function updateSelectedLanguagesDisplay(languages) {
  const display = document.getElementById('pge-selected-locales');
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

export async function initLanguageSelector() {
  try {
    const currentLocale = getCurrentLocale();

    let locales = [currentLocale];
    try {
      const translations = getServerTranslations();
      if (translations && Object.keys(translations).length > 0) {
        locales = Object.keys(translations);
        console.log('[paraglide-editor] Loaded locales from cache:', locales);
      } else {
        console.warn('[paraglide-editor] Server translations not loaded yet, using fallback');
      }
    } catch (error) {
      console.error('[paraglide-editor] Error getting locales from cache:', error);
    }

    const currentLocaleEl = document.getElementById('pge-current-locale');
    if (currentLocaleEl) {
      currentLocaleEl.textContent = currentLocale.toUpperCase();
    }

    const overrideSelect = document.getElementById('pge-locale-override');
    if (overrideSelect && overrideSelect.tagName === 'SELECT') {
      overrideSelect.innerHTML = '';

      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = 'None';
      overrideSelect.appendChild(defaultOpt);

      locales.forEach(locale => {
        const opt = document.createElement('option');
        opt.value = locale;
        opt.textContent = locale.toUpperCase();
        overrideSelect.appendChild(opt);
      });

      const overrideLocale = localStorage.getItem('pge-locale-override');
      if (overrideLocale && locales.includes(overrideLocale)) {
        overrideSelect.value = overrideLocale;
      } else {
        overrideSelect.value = '';
      }

      overrideSelect.disabled = locales.length <= 1;

      if (overrideSelect._pgeChangeHandler) {
        overrideSelect.removeEventListener('change', overrideSelect._pgeChangeHandler);
      }
      overrideSelect._pgeChangeHandler = (e) => {
        const newLocale = e.target.value;
        if (newLocale === '') {
          clearLocaleOverride();
        } else if (newLocale !== getCurrentLocale()) {
          switchLocale(newLocale, { closeModal: false });
        }
      };
      overrideSelect.addEventListener('change', overrideSelect._pgeChangeHandler);
    }

    let selectedLanguages = getSelectedLanguages();

    if (!selectedLanguages.includes(currentLocale)) {
      selectedLanguages.push(currentLocale);
      saveSelectedLanguages(selectedLanguages);
    }

    const checkboxContainer = document.getElementById('pge-locale-checkboxes');
    if (!checkboxContainer) {
      console.error('[paraglide-editor] Checkbox container #pge-locale-checkboxes not found!');
      return;
    }

    console.log('[paraglide-editor] Creating checkboxes for locales:', locales);
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
      checkbox.id = `pge-locale-${locale}`;
      checkbox.style.cursor = 'pointer';

      const labelText = document.createElement('span');
      labelText.textContent = locale.toUpperCase();
      labelText.style.fontSize = '13px';
      labelText.style.fontWeight = '500';

      if (locale === currentLocale) {
        labelText.style.color = '#667eea';
      }

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
        console.log('[paraglide-editor] Selected languages updated:', selected);
      });

      label.appendChild(checkbox);
      label.appendChild(labelText);
      checkboxContainer.appendChild(label);
      console.log(`[paraglide-editor] Created checkbox for locale: ${locale}`);
    });

    console.log(`[paraglide-editor] Checkbox container now has ${checkboxContainer.children.length} children`);

    updateSelectedLanguagesDisplay(selectedLanguages);

    console.log(`[paraglide-editor] Language selector initialized with ${locales.length} locales`);
    console.log(`[paraglide-editor] Current locale: ${currentLocale}, Selected: ${selectedLanguages.join(', ')}`);
  } catch (error) {
    console.error('[paraglide-editor] Failed to initialize language selector:', error);
  }
}

function clearLocaleOverride() {
  localStorage.removeItem('pge-locale-override');
  if (window.__paraglideEditor.updateCurrentLocale) {
    window.__paraglideEditor.updateCurrentLocale();
  }
}

export function switchLocale(newLocale, { closeModal = true } = {}) {
  console.log(`[paraglide-editor] Switching locale to: ${newLocale}`);
  localStorage.setItem('pge-locale-override', newLocale);

  if (window.__paraglideEditor.updateCurrentLocale) {
    window.__paraglideEditor.updateCurrentLocale();
  }
  if (closeModal) {
    document.getElementById('pge-editor-modal')?.remove();
  }
}

/**
 * Language Detection and Change Event System
 *
 * Purpose: Detect current locale and handle language switching.
 *
 * Responsibilities:
 * - Detect current locale from localStorage, cookies, and HTML lang attribute
 * - Watch for locale changes via multiple mechanisms
 * - Fire language change events
 * - Re-render all translations when language changes
 * - Maintain current locale state
 *
 * This module does NOT:
 * - Store translations (see dataStore.js)
 * - Provide UI for language selection (see ui/languageSelector.js)
 * - Manage element registry (see registry.js)
 */

import { getDisplayTranslation } from './dataStore.js';
import { renderTranslation, renderEditedTemplate } from './renderer.js';
import { setElementOutline } from './styles.js';

function detectCurrentLocale() {
  const editorOverride = localStorage.getItem('pge-locale-override');
  if (editorOverride) {
    return editorOverride;
  }

  const htmlLang = document.documentElement.lang;
  if (htmlLang) {
    return htmlLang.split('-')[0];
  }

  return 'en';
}

function reRenderAllTranslations(newLocale) {
  const elements = document.querySelectorAll('[data-paraglide-key]');
  let renderedCount = 0;

  elements.forEach(element => {
    const key = element.dataset.paraglideKey;
    const params = element.dataset.paraglideParams
      ? JSON.parse(element.dataset.paraglideParams)
      : {};

    const translation = getDisplayTranslation(newLocale, key);

    if (!translation.value) {
      console.warn(`[paraglide-editor] No translation found for ${key} in ${newLocale}`);
      return;
    }

    let rendered;
    if (translation.isEdited) {
      rendered = renderEditedTemplate(translation.value, params, newLocale);
    } else {
      rendered = renderTranslation(key, params, newLocale);
    }

    if (element.textContent !== rendered) {
      element.textContent = rendered;
      renderedCount++;
    }

    if (translation.isEdited) {
      element.dataset.paraglideEdited = 'true';
      const outlineState = translation.hasConflict ? 'conflict' : 'edited';
      setElementOutline(element, outlineState);
    } else {
      delete element.dataset.paraglideEdited;
      const outlineState = window.__paraglideEditor.isOverlayEnabled?.() ? 'hoverable' : 'none';
      setElementOutline(element, outlineState);
    }
  });

  console.log(`[paraglide-editor] ✓ Re-rendered ${renderedCount} elements for locale ${newLocale}`);
}

export function updateCurrentLocale() {
  const newLocale = detectCurrentLocale();
  const oldLocale = window.__paraglideEditor.currentLocale;

  if (newLocale !== oldLocale) {
    console.log(`[paraglide-editor] Language changed: ${oldLocale} → ${newLocale}`);
    window.__paraglideEditor.currentLocale = newLocale;

    const event = new CustomEvent('__paraglideEditorLanguageChange', {
      detail: { oldLocale, newLocale, elementsRendered: document.querySelectorAll('[data-paraglide-key]').length }
    });
    window.dispatchEvent(event);
  }

  return newLocale;
}

export function initLanguageDetection() {
  window.__paraglideEditor = window.__paraglideEditor || {};

  window.__paraglideEditor.currentLocale = detectCurrentLocale();
  console.log('[paraglide-editor] Initial locale:', window.__paraglideEditor.currentLocale);

  window.addEventListener('__paraglideEditorLanguageChange', (e) => {
    console.log('[paraglide-editor] Handling __paraglideEditorLanguageChange event:', e.detail);
    reRenderAllTranslations(e.detail.newLocale);
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'pge-locale-override') {
      console.log('[paraglide-editor] Detected editor locale override change');
      updateCurrentLocale();
    }
  });

  const htmlLangObserver = new MutationObserver((mutations) => {
    const langChanged = mutations.some(mutation =>
      mutation.type === 'attributes' &&
      mutation.attributeName === 'lang' &&
      mutation.target === document.documentElement
    );

    if (langChanged) {
      console.log('[paraglide-editor] Detected HTML lang attribute change');
      updateCurrentLocale();
    }
  });

  htmlLangObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });

  window.__paraglideEditor.updateCurrentLocale = updateCurrentLocale;

  console.log('[paraglide-editor] ✓ Language detection initialized');
}

export function getCurrentLocale() {
  return window.__paraglideEditor?.currentLocale || detectCurrentLocale();
}

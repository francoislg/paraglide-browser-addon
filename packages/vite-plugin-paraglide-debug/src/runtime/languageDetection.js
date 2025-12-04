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
  const localStorageLocale = localStorage.getItem('PARAGLIDE_LOCALE');
  if (localStorageLocale) {
    return localStorageLocale;
  }

  const cookieMatch = document.cookie.match(/PARAGLIDE_LOCALE=([^;]+)/);
  if (cookieMatch) {
    return cookieMatch[1];
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
      console.warn(`[paraglide-debug] No translation found for ${key} in ${newLocale}`);
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
      const outlineState = window.__paraglideBrowserDebug.isOverlayEnabled?.() ? 'hoverable' : 'none';
      setElementOutline(element, outlineState);
    }
  });

  console.log(`[paraglide-debug] ✓ Re-rendered ${renderedCount} elements for locale ${newLocale}`);
}

export function updateCurrentLocale() {
  const newLocale = detectCurrentLocale();
  const oldLocale = window.__paraglideBrowserDebug.currentLocale;

  if (newLocale !== oldLocale) {
    console.log(`[paraglide-debug] Language changed: ${oldLocale} → ${newLocale}`);
    window.__paraglideBrowserDebug.currentLocale = newLocale;

    const event = new CustomEvent('__paraglideDebugLanguageChange', {
      detail: { oldLocale, newLocale, elementsRendered: document.querySelectorAll('[data-paraglide-key]').length }
    });
    window.dispatchEvent(event);
  }

  return newLocale;
}

export function initLanguageDetection() {
  window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};

  window.__paraglideBrowserDebug.currentLocale = detectCurrentLocale();
  console.log('[paraglide-debug] Initial locale:', window.__paraglideBrowserDebug.currentLocale);

  window.addEventListener('__paraglideDebugLanguageChange', (e) => {
    console.log('[paraglide-debug] Handling __paraglideDebugLanguageChange event:', e.detail);
    reRenderAllTranslations(e.detail.newLocale);
  });

  window.addEventListener('storage', (e) => {
    if (e.key === 'PARAGLIDE_LOCALE') {
      console.log('[paraglide-debug] Detected localStorage language change');
      updateCurrentLocale();
    }
  });

  let lastCookie = document.cookie;
  setInterval(() => {
    if (document.cookie !== lastCookie) {
      const oldCookieLocale = lastCookie.match(/PARAGLIDE_LOCALE=([^;]+)/)?.[1];
      const newCookieLocale = document.cookie.match(/PARAGLIDE_LOCALE=([^;]+)/)?.[1];

      if (oldCookieLocale !== newCookieLocale) {
        console.log('[paraglide-debug] Detected cookie language change');
        updateCurrentLocale();
      }

      lastCookie = document.cookie;
    }
  }, 500);

  const htmlLangObserver = new MutationObserver((mutations) => {
    const langChanged = mutations.some(mutation =>
      mutation.type === 'attributes' &&
      mutation.attributeName === 'lang' &&
      mutation.target === document.documentElement
    );

    if (langChanged) {
      console.log('[paraglide-debug] Detected HTML lang attribute change');
      updateCurrentLocale();
    }
  });

  htmlLangObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang'],
  });

  window.__paraglideBrowserDebug.updateCurrentLocale = updateCurrentLocale;

  console.log('[paraglide-debug] ✓ Language detection initialized');
}

export function getCurrentLocale() {
  return window.__paraglideBrowserDebug?.currentLocale || detectCurrentLocale();
}

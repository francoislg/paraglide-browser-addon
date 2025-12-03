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

/**
 * Detect current locale from various sources
 */
function detectCurrentLocale() {
  // 1. Check localStorage (where Paraglide and our UI stores it)
  const localStorageLocale = localStorage.getItem('PARAGLIDE_LOCALE');
  if (localStorageLocale) {
    return localStorageLocale;
  }

  // 2. Check cookies
  const cookieMatch = document.cookie.match(/PARAGLIDE_LOCALE=([^;]+)/);
  if (cookieMatch) {
    return cookieMatch[1];
  }

  // 3. Check HTML lang attribute
  const htmlLang = document.documentElement.lang;
  if (htmlLang) {
    return htmlLang.split('-')[0]; // en-US -> en
  }

  // 4. Default to 'en'
  return 'en';
}

/**
 * Re-render all translation elements for a new locale
 * Uses the unified renderer to ensure consistency
 */
function reRenderAllTranslations(newLocale) {
  const elements = document.querySelectorAll('[data-paraglide-key]');
  let renderedCount = 0;

  elements.forEach(element => {
    const key = element.dataset.paraglideKey;
    const params = element.dataset.paraglideParams
      ? JSON.parse(element.dataset.paraglideParams)
      : {};

    // Get translation from unified data store (synchronous!)
    const translation = getDisplayTranslation(newLocale, key);

    if (!translation.value) {
      console.warn(`[paraglide-debug] No translation found for ${key} in ${newLocale}`);
      return;
    }

    // Render the translation
    let rendered;
    if (translation.isEdited) {
      // User has edited this - use template substitution with locale for plural evaluation
      rendered = renderEditedTemplate(translation.value, params, newLocale);
    } else {
      // Server translation - use original Paraglide function
      rendered = renderTranslation(key, params, newLocale);
    }

    // Update element text if different
    if (element.textContent !== rendered) {
      element.textContent = rendered;
      renderedCount++;
    }

    // Update visual indicators
    if (translation.isEdited) {
      element.dataset.paraglideEdited = 'true';
      const outlineState = translation.hasConflict ? 'conflict' : 'edited';
      setElementOutline(element, outlineState);
    } else {
      delete element.dataset.paraglideEdited;
      // Apply appropriate outline based on overlay mode state
      const outlineState = window.__paraglideBrowserDebug.isOverlayEnabled?.() ? 'hoverable' : 'none';
      setElementOutline(element, outlineState);
    }
  });

  console.log(`[paraglide-debug] ✓ Re-rendered ${renderedCount} elements for locale ${newLocale}`);
}

/**
 * Fire language change event and update current locale
 */
export function updateCurrentLocale() {
  const newLocale = detectCurrentLocale();
  const oldLocale = window.__paraglideBrowserDebug.currentLocale;

  if (newLocale !== oldLocale) {
    console.log(`[paraglide-debug] Language changed: ${oldLocale} → ${newLocale}`);
    window.__paraglideBrowserDebug.currentLocale = newLocale;

    // Fire custom event - listeners will handle re-rendering
    const event = new CustomEvent('__paraglideDebugLanguageChange', {
      detail: { oldLocale, newLocale, elementsRendered: document.querySelectorAll('[data-paraglide-key]').length }
    });
    window.dispatchEvent(event);
  }

  return newLocale;
}

/**
 * Initialize language detection system
 */
export function initLanguageDetection() {
  // Initialize namespace if not exists
  window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};

  // Initialize current locale
  window.__paraglideBrowserDebug.currentLocale = detectCurrentLocale();
  console.log('[paraglide-debug] Initial locale:', window.__paraglideBrowserDebug.currentLocale);

  // Listen for language change events and re-render translations
  window.addEventListener('__paraglideDebugLanguageChange', (e) => {
    console.log('[paraglide-debug] Handling __paraglideDebugLanguageChange event:', e.detail);
    reRenderAllTranslations(e.detail.newLocale);
  });

  // Watch for localStorage changes (language switch)
  window.addEventListener('storage', (e) => {
    if (e.key === 'PARAGLIDE_LOCALE') {
      console.log('[paraglide-debug] Detected localStorage language change');
      updateCurrentLocale();
    }
  });

  // Watch for cookie changes by polling (since there's no native cookie change event)
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

  // Watch for HTML lang attribute changes
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

  // Expose updateCurrentLocale - apps can call this after changing language
  // Example: After calling your app's language switcher, call:
  // window.__paraglideBrowserDebug.updateCurrentLocale();
  window.__paraglideBrowserDebug.updateCurrentLocale = updateCurrentLocale;

  console.log('[paraglide-debug] ✓ Language detection initialized');
}

/**
 * Get current locale
 */
export function getCurrentLocale() {
  return window.__paraglideBrowserDebug?.currentLocale || detectCurrentLocale();
}

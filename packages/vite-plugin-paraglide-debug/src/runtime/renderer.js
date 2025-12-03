/**
 * Unified Translation Rendering System
 *
 * Purpose: Render translation strings from server or edited templates.
 *
 * Responsibilities:
 * - Render server translations using original Paraglide functions (100% compatible)
 * - Render edited translations with parameter substitution
 * - Handle variant/plural translations via variants.js
 * - Provide consistent rendering interface for both source types
 *
 * Rendering Paths:
 * 1. Server translations: Uses original Paraglide message functions
 * 2. Edited translations: Simple parameter substitution with variant support
 *
 * Used by:
 * - overlay.js (applying edits and refreshing elements)
 * - popup.js (showing translation previews)
 * - languageDetection.js (re-rendering on language change)
 *
 * This module does NOT:
 * - Store translations (see dataStore.js)
 * - Manage element registry (see registry.js)
 * - Handle UI (see ui/)
 */

import { renderVariant } from './variants.js';

/**
 * Render a translation using the original Paraglide message function
 * Use this for server translations (not edited by user)
 *
 * @param {string} key - Translation key (e.g., 'greeting', 'items_count')
 * @param {object} params - Parameters to substitute (e.g., {name: 'John', count: 5})
 * @param {string} locale - Target locale (e.g., 'en', 'fr', 'es')
 * @returns {string} - Rendered string with parameters substituted
 *
 * @example
 * renderTranslation('greeting', {name: 'John'}, 'en') → 'Hello, John!'
 * renderTranslation('items_count', {count: 5}, 'en') → 'You have 5 items.'
 */
export function renderTranslation(key, params = {}, locale) {
  const messageFunctions = window.__paraglideBrowserDebug?.messageFunctions;

  if (!messageFunctions) {
    console.warn('[paraglide-debug] Message functions not available, wrapper not initialized yet');
    return '';
  }

  const messageFunction = messageFunctions[key];
  if (!messageFunction) {
    console.warn(`[paraglide-debug] Message function not found: ${key}`);
    return '';
  }

  try {
    // Call the original Paraglide function with parameters and locale option
    // This ensures 100% compatibility with Paraglide's logic
    return messageFunction(params, { locale });
  } catch (error) {
    console.error(`[paraglide-debug] Error rendering translation ${key}:`, error);
    return '';
  }
}

/**
 * Render an edited translation template with parameter substitution
 * Use this for user-edited translations
 *
 * Handles both:
 * - Simple templates: 'Hello {name}!'
 * - Variants: JSON array with match object (plural, ordinal, matching, multi-selector)
 *
 * @param {string|object} template - Template string or variant structure
 * @param {object} params - Parameters to substitute
 * @param {string} locale - Locale for plural evaluation (e.g., 'en', 'fr', 'es')
 * @returns {string} - Rendered string
 *
 * @example
 * renderEditedTemplate('Hello {name}!', {name: 'John'}, 'en') → 'Hello John!'
 * renderEditedTemplate('[{"match":{"countPlural=one":"...","countPlural=other":"..."}}]', {count: 5}, 'en') → 'You have 5 items'
 */
export function renderEditedTemplate(template, params = {}, locale = 'en') {
  if (!template) {
    return '';
  }

  // Check if this is a variant (JSON string starting with '[{')
  if (typeof template === 'string' && template.trim().startsWith('[{')) {
    try {
      const parsed = JSON.parse(template);
      if (Array.isArray(parsed) && parsed[0]?.match) {
        return renderVariant(parsed[0], params, locale);
      }
    } catch (e) {
      // Not valid JSON, fall through to simple substitution
      console.warn('[paraglide-debug] Failed to parse variant:', e);
    }
  }

  // Check if this is already a parsed variant object
  if (typeof template === 'object' && template.match) {
    return renderVariant(template, params, locale);
  }

  // Simple string template
  if (typeof template !== 'string') {
    return '';
  }

  // Simple parameter substitution: {name} → actual value
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

/**
 * Check if message functions are available
 * Useful for waiting until initialization is complete
 *
 * @returns {boolean} True if message functions are available
 */
export function areMessageFunctionsAvailable() {
  return !!(window.__paraglideBrowserDebug?.messageFunctions);
}

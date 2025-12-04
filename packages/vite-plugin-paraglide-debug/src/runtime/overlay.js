/**
 * Overlay Mode and Element Refresh Management
 *
 * Purpose: Manage overlay mode for click-to-edit functionality and refresh individual elements.
 *
 * Responsibilities:
 * - Enable/disable click-to-edit overlay mode
 * - Refresh single element's content and visual state
 * - Apply saved edits from database to DOM elements
 * - Handle click events for translation editing
 * - Manage visual indicators (outlines) for translatable elements
 *
 * This module does NOT:
 * - Render translation strings (see renderer.js)
 * - Manage the element registry (see registry.js)
 * - Handle UI components (see ui/)
 */

import { getDisplayTranslation, getTranslationVersions } from './dataStore.js';
import { getAllEditedTranslations } from './db.js';
import { renderTranslation, renderEditedTemplate } from './renderer.js';
import { getCurrentLocale } from './languageDetection.js';
import { createEditPopup } from './ui/popup.js';
import { setElementOutline } from './styles.js';
import { detectActiveVariant, parseVariantStructure } from './variants.js';

/**
 * Refresh a single element's visual state and content
 * Uses the unified dataStore and renderer for consistency
 * @param {HTMLElement} element - The element to refresh
 * @param {string} locale - The locale to use (defaults to current locale)
 * @returns {boolean} - True if content was updated, false otherwise
 */
export function refreshElement(element, locale = null) {
  // IMPORTANT: Skip elements inside the edit popup
  const isInsidePopup = element.closest('#pg-edit-anchor, #pg-edit-popup');
  if (isInsidePopup) {
    return false;
  }

  const currentLocale = locale || getCurrentLocale();
  const key = element.dataset.paraglideKey;
  const params = element.dataset.paraglideParams
    ? JSON.parse(element.dataset.paraglideParams)
    : {};

  // Get both versions from data store for comparison (synchronous!)
  const versions = getTranslationVersions(currentLocale, key);

  if (versions.isEdited) {
    // Render the edited translation
    let rendered;
    if (Object.keys(params).length > 0) {
      // Has parameters - use template substitution with locale for plural evaluation
      rendered = renderEditedTemplate(versions.current, params, currentLocale);
    } else {
      // No parameters - check if it's a variant form that needs evaluation
      if (typeof versions.current === 'string' && versions.current.trim().startsWith('[{')) {
        // This is a variant form - render it
        rendered = renderEditedTemplate(versions.current, {}, currentLocale);
      } else {
        // Simple string - use as-is
        rendered = versions.current;
      }
    }

    // Only update if different (prevents infinite loop)
    const wasUpdated = element.textContent !== rendered;
    if (wasUpdated) {
      element.textContent = rendered;
    }

    // Mark as edited with visual indicator
    element.dataset.paraglideEdited = 'true';

    // Determine outline state - variant-aware for plurals/variants
    let outlineState = 'edited';

    if (versions.hasConflict) {
      outlineState = 'conflict';
    } else if (Object.keys(params).length > 0) {
      // Has params - might be a variant, check if THIS specific variant differs
      const editedVariant = parseVariantStructure(versions.edited);
      const serverVariant = parseVariantStructure(versions.server);

      if (editedVariant && serverVariant) {
        // Both are variants - compare only the active variant
        const activeVariantKey = detectActiveVariant(editedVariant, params, currentLocale);
        if (activeVariantKey) {
          const editedText = editedVariant.match[activeVariantKey];
          const serverText = serverVariant.match[activeVariantKey];

          // If this specific variant matches server, show as hoverable
          if (editedText === serverText) {
            outlineState = 'hoverable';
          }
        }
      }
    }

    setElementOutline(element, outlineState);

    return wasUpdated;
  } else {
    // No edit - render server translation
    const rendered = renderTranslation(key, params, currentLocale);

    // Only update if different
    const wasUpdated = element.textContent !== rendered;
    if (wasUpdated) {
      element.textContent = rendered;
    }

    // Clear edited state if exists
    if (element.dataset.paraglideEdited) {
      delete element.dataset.paraglideEdited;
    }

    // Apply appropriate outline based on overlay mode state
    const outlineState = window.__paraglideBrowserDebug.isOverlayEnabled?.() ? 'hoverable' : 'none';
    setElementOutline(element, outlineState);

    return wasUpdated;
  }
}

/**
 * Refresh all elements with a specific translation key
 * Used after saving edits to update all instances of a translation on the page
 *
 * @param {string} key - Translation key to refresh
 * @param {string} locale - Optional locale (defaults to current locale)
 * @returns {number} - Number of elements updated
 */
export function refreshElementsByKey(key, locale = null) {
  const currentLocale = locale || getCurrentLocale();
  const selector = `[data-paraglide-key="${key}"]`;
  const elements = document.querySelectorAll(selector);

  let updatedCount = 0;
  elements.forEach(element => {
    if (refreshElement(element, currentLocale)) {
      updatedCount++;
    }
  });

  console.log(`[paraglide-debug] Refreshed ${updatedCount}/${elements.length} elements with key: ${key}`);
  return updatedCount;
}

/**
 * Apply saved edits from database to the DOM
 * Uses the unified dataStore and renderer for consistency
 *
 * This is a synchronous version that reads from the in-memory cache.
 * Called when overlay mode initializes.
 */
function applySavedEdits() {
  try {
    // Get current locale
    const currentLocale = getCurrentLocale();
    console.log('[paraglide-debug] Applying saved edits for locale:', currentLocale);

    // Find all elements with translation keys
    const elements = document.querySelectorAll('[data-paraglide-key]');
    let appliedCount = 0;

    elements.forEach(element => {
      const wasUpdated = refreshElement(element, currentLocale);
      if (wasUpdated) {
        appliedCount++;
      }
    });

    console.log(`[paraglide-debug] ✓ Applied ${appliedCount} saved edits`);
  } catch (error) {
    console.error('[paraglide-debug] Failed to apply saved edits:', error);
  }
}

/**
 * Apply saved edits from database to DOM (async version)
 * Uses the refreshElement function which handles proper rendering with dataStore
 *
 * This is called after element registry is built, to apply any previously saved edits.
 * Also called when language changes to re-apply edits for the new locale.
 *
 * @param {string} locale - Optional locale to apply edits for (defaults to current locale)
 * @returns {Promise<void>}
 */
export async function applySavedEditsFromDB(locale = null) {
  try {
    // Get current locale
    const currentLocale = locale || getCurrentLocale();
    console.debug('[paraglide-debug] applySavedEditsFromDB: Current locale =', currentLocale);

    // Get all edited translations for current locale
    const editedTranslations = await getAllEditedTranslations(currentLocale);
    console.debug('[paraglide-debug] applySavedEditsFromDB: Loaded edits from DB:', editedTranslations);

    if (editedTranslations.length === 0) {
      console.debug('[paraglide-debug] No saved edits found for locale:', currentLocale);
      return;
    }

    console.debug(`[paraglide-debug] Applying ${editedTranslations.length} saved edits to page content`);

    // Find all elements with translation keys and update them
    const elements = document.querySelectorAll('[data-paraglide-key]');
    console.debug(`[paraglide-debug] Found ${elements.length} elements with data-paraglide-key attribute`);

    let appliedCount = 0;
    elements.forEach(element => {
      // Use refreshElement which handles proper rendering with dataStore
      const wasUpdated = refreshElement(element, currentLocale);
      if (wasUpdated) {
        appliedCount++;
      }
    });

    console.log(`[paraglide-debug] ✓ Applied ${appliedCount} saved edits to page (expected ${editedTranslations.length})`);
  } catch (error) {
    console.error('[paraglide-debug] Failed to apply saved edits:', error);
  }
}

/**
 * Initialize overlay mode
 */
export function initOverlayMode() {
  let overlayEnabled = localStorage.getItem('pg-overlay-enabled') === 'true';

  // Add click listener to document
  document.addEventListener('click', async (e) => {
    if (!overlayEnabled) return;

    // Ignore clicks inside the editor UI (modal, popup, floating button, anchor)
    if (e.target.closest('#pg-editor-modal, #pg-edit-anchor, #pg-edit-popup, #pg-editor-floating-btn')) {
      return;
    }

    // Check if clicked element has translation data
    const element = e.target.closest('[data-paraglide-key]');
    if (!element) return;

    // Prevent default action
    e.preventDefault();
    e.stopPropagation();

    // Extract translation metadata
    const key = element.dataset.paraglideKey;
    const params = element.dataset.paraglideParams
      ? JSON.parse(element.dataset.paraglideParams)
      : {};
    const currentText = element.textContent.trim();

    console.log('[paraglide-debug] Clicked translatable element:', { key, params, currentText });

    // Show edit popup (await since it's async now)
    await createEditPopup(element, key, params, currentText);
  }, true); // Use capture phase to intercept before other handlers

  // Expose API for toggling overlay mode
  window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};
  window.__paraglideBrowserDebug.setOverlayMode = (enabled) => {
    overlayEnabled = enabled;
    localStorage.setItem('pg-overlay-enabled', enabled.toString());
    console.log(`[paraglide-debug] Overlay mode ${enabled ? 'enabled' : 'disabled'}`);

    // Update visual indicators
    const elements = document.querySelectorAll('[data-paraglide-key]');
    elements.forEach(el => {
      if (enabled) {
        // Add hover effect - different colors for edited vs unedited
        const state = el.dataset.paraglideEdited === 'true' ? 'edited' : 'hoverable';
        setElementOutline(el, state);
      } else {
        // Remove hover effect (unless edited)
        const state = el.dataset.paraglideEdited === 'true' ? 'edited' : 'none';
        setElementOutline(el, state);
      }
    });
  };

  window.__paraglideBrowserDebug.isOverlayEnabled = () => overlayEnabled;

  // Expose applySavedEdits for manual refresh (e.g., after locale change)
  window.__paraglideBrowserDebug.applySavedEdits = applySavedEdits;

  // Apply saved edits when overlay mode initializes (synchronous now)
  applySavedEdits();

  // Re-apply visual indicators after edits are loaded
  if (overlayEnabled) {
    const elements = document.querySelectorAll('[data-paraglide-key]');
    elements.forEach(el => {
      const state = el.dataset.paraglideEdited === 'true' ? 'edited' : 'hoverable';
      setElementOutline(el, state);
    });
  }

  console.log('[paraglide-debug] ✓ Overlay mode initialized');
}

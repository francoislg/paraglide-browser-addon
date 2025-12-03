/**
 * Overlay mode manager for click-to-edit functionality
 */

import { getDisplayTranslation } from './dataStore.js';
import { renderTranslation, renderEditedTemplate } from './renderer.js';
import { getCurrentLocale } from './languageDetection.js';
import { createEditPopup } from './ui/popup.js';
import { setElementOutline } from './styles.js';

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

  // Get translation from unified data store (synchronous!)
  const translation = getDisplayTranslation(currentLocale, key);

  if (translation.isEdited) {
    // Render the edited translation
    let rendered;
    if (Object.keys(params).length > 0) {
      // Has parameters - use template substitution with locale for plural evaluation
      rendered = renderEditedTemplate(translation.value, params, currentLocale);
    } else {
      // No parameters - check if it's a plural form that needs evaluation
      // (some plural forms might have parameters baked in from when they were saved)
      if (typeof translation.value === 'string' && translation.value.trim().startsWith('[{')) {
        // This is a plural form - render it
        rendered = renderEditedTemplate(translation.value, {}, currentLocale);
      } else {
        // Simple string - use as-is
        rendered = translation.value;
      }
    }

    // Only update if different (prevents infinite loop)
    const wasUpdated = element.textContent !== rendered;
    if (wasUpdated) {
      element.textContent = rendered;
    }

    // Mark as edited with visual indicator
    element.dataset.paraglideEdited = 'true';

    // Show conflict indicator if needed
    const outlineState = translation.hasConflict ? 'conflict' : 'edited';
    setElementOutline(element, outlineState);

    return wasUpdated;
  } else {
    // No edit - clear edited state if it exists
    if (element.dataset.paraglideEdited) {
      delete element.dataset.paraglideEdited;
      // Apply appropriate outline based on overlay mode state
      const outlineState = window.__paraglideBrowserDebug.isOverlayEnabled?.() ? 'hoverable' : 'none';
      setElementOutline(element, outlineState);
    }
    return false;
  }
}

/**
 * Apply saved edits from database to the DOM
 * Uses the unified dataStore and renderer for consistency
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

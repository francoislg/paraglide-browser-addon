/**
 * Edit Popup - Refactored Main Module
 *
 * This is the new, clean version with all logic broken into focused modules:
 * - popupData.js: Data preparation
 * - popupHTML.js: HTML generation
 * - popupPositioning.js: Positioning logic
 * - popupHandlers.js: Event handlers
 * - dom.js: Common DOM utilities
 *
 * This file orchestrates all the pieces into a cohesive edit popup.
 *
 * Before refactoring: 795 lines, one massive function
 * After refactoring: ~100 lines, clear and maintainable
 */

import { preparePopupData } from './popupData.js';
import { generatePopupHTML } from './popupHTML.js';
import { positionPopup, setupAnchor } from './popupPositioning.js';
import { setupVariantControls, setupSaveHandler } from './popupHandlers.js';
import {
  createOrReplaceElement,
  setupEscapeKey,
  setupClickOutside,
  createCleanup,
  focusFirstInput
} from './dom.js';

/**
 * Create and show the edit popup
 * Main entry point - orchestrates all modules
 *
 * @param {HTMLElement} element - The clicked element
 * @param {string} key - Translation key
 * @param {Object} params - Translation parameters
 * @param {string} currentText - Current text content
 *
 * @example
 * await createEditPopup(element, 'greeting', {name: 'John'}, 'Hello, John!');
 */
export async function createEditPopup(element, key, params, currentText) {
  console.log('[paraglide-debug] Creating edit popup for:', { key, params, currentText });

  // ============================================================================
  // Step 1: Prepare Data
  // ============================================================================
  const popupData = await preparePopupData(key, params);
  const { languageInputs, isPlural, variantForms, activeVariantKey } = popupData;

  console.log('[paraglide-debug] Popup data prepared:', {
    languages: languageInputs.length,
    isPlural,
    variantCount: variantForms.length
  });

  // ============================================================================
  // Step 2: Create DOM Structure
  // ============================================================================

  // Create anchor element (positioned near clicked element)
  const anchor = createOrReplaceElement('div', 'pg-edit-anchor');

  // Create popup inside anchor
  const popup = document.createElement('div');
  popup.id = 'pg-edit-popup';
  anchor.appendChild(popup);

  // ============================================================================
  // Step 3: Generate and Render HTML
  // ============================================================================
  popup.innerHTML = generatePopupHTML({
    languageInputs,
    key,
    params,
    isPlural,
    variantForms,
    activeVariantKey
  });

  // ============================================================================
  // Step 4: Position Popup
  // ============================================================================

  // Setup anchor position
  setupAnchor(anchor, element);

  // Wait for next frame to get accurate dimensions, then position popup
  requestAnimationFrame(() => {
    const position = positionPopup(popup, anchor, element);
    Object.assign(popup.style, position);
  });

  // ============================================================================
  // Step 5: Setup Event Handlers
  // ============================================================================

  // Cleanup function to remove popup and event listeners
  const close = () => {
    anchor.remove();
    cleanup();
  };

  // Setup close handlers (ESC, click outside)
  const cleanupEsc = setupEscapeKey(close);
  const cleanupClickOutside = setupClickOutside(anchor, close);
  const cleanup = createCleanup(cleanupEsc, cleanupClickOutside);

  // Setup cancel button
  const cancelBtn = popup.querySelector('#pg-cancel-btn');
  cancelBtn.addEventListener('click', close);

  // Setup variant controls (if plural)
  setupVariantControls(popup, languageInputs, isPlural);

  // Setup save handler
  setupSaveHandler(popup, languageInputs, key, isPlural, close);

  // ============================================================================
  // Step 6: Final Touch - Focus First Input
  // ============================================================================
  focusFirstInput(popup, '.pg-edit-textarea');

  console.log('[paraglide-debug] ✓ Edit popup created and ready');
}

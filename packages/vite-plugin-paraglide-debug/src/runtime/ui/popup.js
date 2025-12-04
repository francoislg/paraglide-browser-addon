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

  const popupData = await preparePopupData(key, params);
  const { languageInputs, isPlural, variantForms, activeVariantKey } = popupData;

  console.log('[paraglide-debug] Popup data prepared:', {
    languages: languageInputs.length,
    isPlural,
    variantCount: variantForms.length
  });

  const anchor = createOrReplaceElement('div', 'pg-edit-anchor');
  anchor.classList.add('pg-ignore-detection');

  const popup = document.createElement('div');
  popup.id = 'pg-edit-popup';
  popup.classList.add('pg-ignore-detection');
  anchor.appendChild(popup);

  popup.innerHTML = generatePopupHTML({
    languageInputs,
    key,
    params,
    isPlural,
    variantForms,
    activeVariantKey
  });

  setupAnchor(anchor, element);

  requestAnimationFrame(() => {
    const position = positionPopup(popup, anchor, element);
    Object.assign(popup.style, position);
  });

  const close = () => {
    anchor.remove();
    cleanup();
  };

  const cleanupEsc = setupEscapeKey(close);
  const cleanupClickOutside = setupClickOutside(anchor, close);
  const cleanup = createCleanup(cleanupEsc, cleanupClickOutside);

  const cancelBtn = popup.querySelector('#pg-cancel-btn');
  cancelBtn.addEventListener('click', close);

  setupVariantControls(popup, languageInputs, isPlural);

  setupSaveHandler(popup, languageInputs, key, isPlural, close);

  focusFirstInput(popup, '.pg-edit-textarea');

  console.log('[paraglide-debug] ✓ Edit popup created and ready');
}

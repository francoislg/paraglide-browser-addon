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
 * Supports multi-slot elements (text + attributes on the same element).
 */

import { preparePopupData } from './popupData.js';
import { generatePopupHTML, generateSlotContentHTML } from './popupHTML.js';
import { positionPopup, setupAnchor } from './popupPositioning.js';
import { setupVariantControls, setupRevertButtons, setupSaveHandler, setupMultiSlotSaveHandler } from './popupHandlers.js';
import {
  createOrReplaceElement,
  setupEscapeKey,
  setupClickOutside,
  createCleanup,
  focusFirstInput,
  escapeHtml
} from './dom.js';
import { getElementSlots } from '../registry.js';

/**
 * Capture current textarea values from the DOM into the slotEdits map.
 * Called before switching away from a slot or before saving.
 *
 * @param {HTMLElement} contentContainer - The #pge-slot-content element
 * @param {string} slotName - Current slot name
 * @param {Object} slotEdits - The slotEdits map to write into
 * @param {Object} slotPopupData - The cached popup data per slot
 */
function captureSlotEdits(contentContainer, slotName, slotEdits, slotPopupData) {
  const popupData = slotPopupData[slotName];
  if (!popupData) return;

  if (popupData.isPlural) {
    // For plural, the languageInputs.pluralData is already kept in sync
    // by the variant controls handlers. We just mark that we visited this slot.
    if (!slotEdits[slotName]) slotEdits[slotName] = {};
    slotEdits[slotName].isPlural = true;
  } else {
    // For simple slots, read all textarea values
    const simple = {};
    contentContainer.querySelectorAll('.pge-edit-textarea[data-locale]').forEach(ta => {
      simple[ta.dataset.locale] = ta.value;
    });
    slotEdits[slotName] = { simple, isPlural: false };
  }
}

/**
 * Restore previously captured textarea values after re-rendering a slot's HTML.
 *
 * @param {HTMLElement} contentContainer - The #pge-slot-content element
 * @param {string} slotName - Slot being restored
 * @param {Object} slotEdits - The slotEdits map to read from
 * @param {Object} slotPopupData - The cached popup data per slot
 */
function restoreSlotEdits(contentContainer, slotName, slotEdits, slotPopupData) {
  const editData = slotEdits[slotName];
  const popupData = slotPopupData[slotName];
  if (!editData || !popupData) return;

  if (!editData.isPlural && editData.simple) {
    contentContainer.querySelectorAll('.pge-edit-textarea[data-locale]').forEach(ta => {
      const locale = ta.dataset.locale;
      if (locale in editData.simple) {
        ta.value = editData.simple[locale];
        // Update revert button visibility
        const serverValue = ta.dataset.serverValue || '';
        const revertBtn = ta.closest('.pge-textarea-wrapper')?.querySelector('.pge-revert-btn');
        if (revertBtn) {
          revertBtn.style.display = ta.value !== serverValue ? '' : 'none';
        }
      }
    });
  }
  // For plural, languageInputs.pluralData mutations persist across slot switches
  // because preparePopupData deep-clones and we cache the result.
}

/**
 * Create and show the edit popup
 * Main entry point - orchestrates all modules.
 * Supports multi-slot elements when activeSlot is provided.
 *
 * @param {HTMLElement} element - The clicked element
 * @param {string} key - Translation key (of the active slot)
 * @param {Object} params - Translation parameters (of the active slot)
 * @param {string} currentText - Current text content
 * @param {string} [initialActiveSlot] - Which slot to show first (e.g. '_text' or 'title')
 *
 * @example
 * await createEditPopup(element, 'greeting', {name: 'John'}, 'Hello, John!', '_text');
 */
export async function createEditPopup(element, key, params, currentText, initialActiveSlot) {
  console.log('[paraglide-editor] Creating edit popup for:', { key, params, currentText, initialActiveSlot });

  // Read all slots from element
  const slots = getElementSlots(element);
  const slotNames = slots ? Object.keys(slots) : [initialActiveSlot || '_text'];
  const hasMultipleSlots = slotNames.length > 1;

  // Determine initial active slot
  let activeSlotName = initialActiveSlot || '_text';
  if (slots && !slots[activeSlotName]) {
    activeSlotName = slotNames[0];
  }

  // Cache popup data per slot (lazy-loaded)
  const slotPopupData = {};
  const slotEdits = {};

  // Load data for the initial active slot
  const activeSlotData = slots ? slots[activeSlotName] : { key, params };
  const popupData = await preparePopupData(activeSlotData.key, activeSlotData.params);
  slotPopupData[activeSlotName] = { ...popupData, key: activeSlotData.key, params: activeSlotData.params };

  const { languageInputs, isPlural, variantForms, activeVariantKey } = popupData;

  console.log('[paraglide-editor] Popup data prepared:', {
    languages: languageInputs.length,
    isPlural,
    variantCount: variantForms.length,
    slots: slotNames,
    activeSlot: activeSlotName,
  });

  const anchor = createOrReplaceElement('div', 'pge-edit-anchor');
  anchor.classList.add('pge-ignore-detection');

  const popup = document.createElement('div');
  popup.id = 'pge-edit-popup';
  popup.classList.add('pge-ignore-detection');
  anchor.appendChild(popup);

  const attr = activeSlotName === '_text' ? null : activeSlotName;

  popup.innerHTML = generatePopupHTML({
    languageInputs,
    key: activeSlotData.key,
    params: activeSlotData.params,
    isPlural,
    variantForms,
    activeVariantKey,
    attr,
    slots: hasMultipleSlots ? slots : null,
    activeSlot: hasMultipleSlots ? activeSlotName : null,
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

  const cancelBtn = popup.querySelector('#pge-cancel-btn');
  cancelBtn.addEventListener('click', close);

  // Setup handlers for the initial slot's content
  const slotContentEl = popup.querySelector('#pge-slot-content');

  setupVariantControls(popup, languageInputs, isPlural);
  setupRevertButtons(popup);

  if (hasMultipleSlots) {
    // --- Multi-slot navigation ---

    /**
     * Switch to a different slot. Captures current edits, loads new slot data,
     * re-renders the body, restores any previously captured edits.
     */
    async function switchToSlot(newSlotName) {
      if (newSlotName === activeSlotName) return;

      // Capture current slot
      captureSlotEdits(slotContentEl, activeSlotName, slotEdits, slotPopupData);

      activeSlotName = newSlotName;
      const newSlotData = slots[newSlotName];

      // Lazy-load popup data for this slot
      if (!slotPopupData[newSlotName]) {
        const data = await preparePopupData(newSlotData.key, newSlotData.params);
        slotPopupData[newSlotName] = { ...data, key: newSlotData.key, params: newSlotData.params };
      }

      const newPopupData = slotPopupData[newSlotName];

      // Re-render body
      slotContentEl.innerHTML = generateSlotContentHTML({
        languageInputs: newPopupData.languageInputs,
        isPlural: newPopupData.isPlural,
        variantForms: newPopupData.variantForms,
        activeVariantKey: newPopupData.activeVariantKey,
      });

      // Restore edits if we've been to this slot before
      restoreSlotEdits(slotContentEl, newSlotName, slotEdits, slotPopupData);

      // Re-attach handlers for the new content
      setupVariantControls(popup, newPopupData.languageInputs, newPopupData.isPlural);
      setupRevertButtons(popup);

      // Update key display
      const keySpan = popup.querySelector('#pge-slot-key');
      if (keySpan) keySpan.textContent = newSlotData.key;

      // Update params display
      const paramsSpan = popup.querySelector('#pge-slot-params');
      if (paramsSpan) {
        paramsSpan.innerHTML = newSlotData.params && Object.keys(newSlotData.params).length > 0
          ? `<br><strong>Params:</strong> ${escapeHtml(JSON.stringify(newSlotData.params))}`
          : '';
      }

      // Update attr display
      const attrSpan = popup.querySelector('#pge-slot-attr');
      if (attrSpan) {
        const newAttr = newSlotName === '_text' ? null : newSlotName;
        attrSpan.innerHTML = newAttr
          ? `<br><strong>Attribute:</strong> ${escapeHtml(newAttr)}`
          : '';
      }

      // Update active chip
      popup.querySelectorAll('.pge-slot-chip').forEach(chip => {
        chip.classList.toggle('pge-slot-active', chip.dataset.slot === newSlotName);
      });

      focusFirstInput(popup, '.pge-edit-textarea');
    }

    // Chip click handlers
    popup.querySelectorAll('.pge-slot-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        switchToSlot(chip.dataset.slot);
      });
    });

    // Next button
    const nextBtn = popup.querySelector('#pge-next-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const currentIndex = slotNames.indexOf(activeSlotName);
        const nextIndex = (currentIndex + 1) % slotNames.length;
        switchToSlot(slotNames[nextIndex]);
      });
    }

    // Multi-slot save handler
    setupMultiSlotSaveHandler(
      popup,
      slotEdits,
      slotPopupData,
      () => captureSlotEdits(slotContentEl, activeSlotName, slotEdits, slotPopupData),
      close
    );
  } else {
    // Single-slot: use the simple save handler
    setupSaveHandler(popup, languageInputs, key, isPlural, close);
  }

  focusFirstInput(popup, '.pge-edit-textarea');

  console.log('[paraglide-editor] ✓ Edit popup created and ready');
}

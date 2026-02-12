/**
 * Popup Event Handlers
 *
 * Event handling logic for the edit popup
 * Variant controls, save/cancel handlers, etc.
 */

import { saveTranslationEdit, revertTranslationEdit } from '../db.js';
import { updateLocalCache } from '../dataStore.js';
import { refreshElementsByKey } from '../overlay.js';

/**
 * Get the server value for a specific variant from a language input
 */
function getServerVariantValue(input, variant) {
  if (Array.isArray(input.serverValue) && input.serverValue[0]?.match) {
    return input.serverValue[0].match[variant] || '';
  }
  return '';
}

/**
 * Setup variant selector changes
 * Updates all single textareas when selector changes
 *
 * @param {HTMLElement} popup - Popup element
 * @param {Array} languageInputs - Language input data (mutable for syncing)
 * @param {HTMLSelectElement} globalSelector - Variant selector element
 */
export function setupVariantSelector(popup, languageInputs, globalSelector) {
  globalSelector.addEventListener('change', () => {
    const selectedVariant = globalSelector.value;
    console.debug('[paraglide-editor] Variant selector changed to:', selectedVariant);

    languageInputs.forEach((input, index) => {
      const singleTextarea = popup.querySelector(`.pge-variant-single[data-lang-index="${index}"]`);
      if (singleTextarea && input.pluralData) {
        const newValue = input.pluralData.match[selectedVariant] || '';
        singleTextarea.value = newValue;

        // Update server value for revert button
        const serverVariantValue = getServerVariantValue(input, selectedVariant);
        singleTextarea.dataset.serverValue = serverVariantValue;
        const revertBtn = singleTextarea.closest('.pge-textarea-wrapper')?.querySelector('.pge-revert-btn');
        if (revertBtn) {
          revertBtn.style.display = newValue !== serverVariantValue ? '' : 'none';
        }
      }
    });
  });
}

/**
 * Setup variant sync (single textarea input → plural data)
 * Keeps pluralData in sync with single textarea edits
 *
 * @param {HTMLElement} popup - Popup element
 * @param {Array} languageInputs - Language input data (mutable for syncing)
 * @param {HTMLSelectElement} globalSelector - Variant selector element
 */
export function setupVariantSync(popup, languageInputs, globalSelector) {
  languageInputs.forEach((input, index) => {
    const singleTextarea = popup.querySelector(`.pge-variant-single[data-lang-index="${index}"]`);
    if (singleTextarea) {
      singleTextarea.addEventListener('input', () => {
        const selectedVariant = globalSelector.value;
        if (!input.pluralData) input.pluralData = { match: {} };
        input.pluralData.match[selectedVariant] = singleTextarea.value;

        const allVariantsContainer = popup.querySelector(`.pge-all-variants[data-lang-index="${index}"]`);
        if (allVariantsContainer && allVariantsContainer.style.display !== 'none') {
          const variantTextarea = allVariantsContainer.querySelector(`textarea[data-variant="${selectedVariant}"]`);
          if (variantTextarea) {
            variantTextarea.value = singleTextarea.value;
          }
        }
      });
    }
  });
}

/**
 * Setup expand/collapse functionality
 * Toggles between single textarea and all variants view
 *
 * @param {HTMLElement} popup - Popup element
 * @param {Array} languageInputs - Language input data (mutable for syncing)
 * @param {HTMLSelectElement} globalSelector - Variant selector element
 * @param {HTMLButtonElement} globalExpandBtn - Expand/collapse button
 */
export function setupExpandCollapse(popup, languageInputs, globalSelector, globalExpandBtn) {
  let isExpanded = false;

  globalExpandBtn.addEventListener('click', () => {
    const expandText = globalExpandBtn.querySelector('.expand-text');
    const collapseText = globalExpandBtn.querySelector('.collapse-text');

    if (isExpanded) {
      languageInputs.forEach((input, index) => {
        const singleTextarea = popup.querySelector(`.pge-variant-single[data-lang-index="${index}"]`);
        const allVariantsContainer = popup.querySelector(`.pge-all-variants[data-lang-index="${index}"]`);

        const variantTextareas = allVariantsContainer.querySelectorAll('.pge-variant-textarea');
        variantTextareas.forEach(ta => {
          const variant = ta.dataset.variant;
          if (!input.pluralData) input.pluralData = { match: {} };
          input.pluralData.match[variant] = ta.value;
        });

        const selectedVariant = globalSelector.value;
        if (input.pluralData.match[selectedVariant]) {
          singleTextarea.value = input.pluralData.match[selectedVariant];
        }

        allVariantsContainer.style.display = 'none';
        singleTextarea.closest('.pge-textarea-wrapper').style.display = '';
      });

      globalSelector.style.display = 'inline-block';
      expandText.style.display = 'inline';
      collapseText.style.display = 'none';
      isExpanded = false;
    } else {
      const selectedVariant = globalSelector.value;

      languageInputs.forEach((input, index) => {
        const singleTextarea = popup.querySelector(`.pge-variant-single[data-lang-index="${index}"]`);
        const allVariantsContainer = popup.querySelector(`.pge-all-variants[data-lang-index="${index}"]`);

        if (!input.pluralData) input.pluralData = { match: {} };
        input.pluralData.match[selectedVariant] = singleTextarea.value;

        const variantTextarea = allVariantsContainer.querySelector(`textarea[data-variant="${selectedVariant}"]`);
        if (variantTextarea) {
          variantTextarea.value = singleTextarea.value;
        }

        allVariantsContainer.style.display = 'flex';
        singleTextarea.closest('.pge-textarea-wrapper').style.display = 'none';

        const variantTextareas = allVariantsContainer.querySelectorAll('.pge-variant-textarea');
        variantTextareas.forEach(ta => {
          ta.addEventListener('input', () => {
            const variant = ta.dataset.variant;
            if (!input.pluralData) input.pluralData = { match: {} };
            input.pluralData.match[variant] = ta.value;
          });
        });
      });

      globalSelector.style.display = 'none';
      expandText.style.display = 'none';
      collapseText.style.display = 'inline';
      isExpanded = true;
    }
  });
}

/**
 * Setup all variant controls
 * Orchestrates variant selector, sync, and expand/collapse
 *
 * @param {HTMLElement} popup - Popup element
 * @param {Array} languageInputs - Language input data
 * @param {boolean} isPlural - Whether this is a plural translation
 */
export function setupVariantControls(popup, languageInputs, isPlural) {
  if (!isPlural) return;

  const globalSelector = popup.querySelector('.pge-variant-selector-global');
  const globalExpandBtn = popup.querySelector('.pge-variant-expand-btn-global');

  if (!globalSelector || !globalExpandBtn) {
    console.warn('[paraglide-editor] Variant controls not found');
    return;
  }

  setupVariantSelector(popup, languageInputs, globalSelector);
  setupVariantSync(popup, languageInputs, globalSelector);
  setupExpandCollapse(popup, languageInputs, globalSelector, globalExpandBtn);
}

/**
 * Setup revert buttons on all textareas
 * Shows/hides revert button based on whether value differs from server value
 * Handles click to revert textarea to original server value
 *
 * @param {HTMLElement} popup - Popup element
 */
export function setupRevertButtons(popup) {
  popup.querySelectorAll('.pge-textarea-wrapper').forEach(wrapper => {
    const textarea = wrapper.querySelector('.pge-edit-textarea');
    const revertBtn = wrapper.querySelector('.pge-revert-btn');
    if (!textarea || !revertBtn) return;

    // Show/hide on input
    textarea.addEventListener('input', () => {
      const serverValue = textarea.dataset.serverValue || '';
      revertBtn.style.display = textarea.value !== serverValue ? '' : 'none';
    });

    // Revert on click
    revertBtn.addEventListener('click', () => {
      textarea.value = textarea.dataset.serverValue || '';
      revertBtn.style.display = 'none';
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

/**
 * Setup save handler for a single slot (no multi-slot logic)
 * Saves all language translations and closes popup
 *
 * @param {HTMLElement} popup - Popup element
 * @param {Array} languageInputs - Language input data
 * @param {string} key - Translation key
 * @param {boolean} isPlural - Whether this is a plural translation
 * @param {Function} close - Function to close popup
 */
export function setupSaveHandler(popup, languageInputs, key, isPlural, close) {
  const saveBtn = popup.querySelector('#pge-save-btn');

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      let savedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < languageInputs.length; i++) {
        const input = languageInputs[i];
        const locale = input.locale;

        let valueToSave;

        if (isPlural) {
          const pluralStructure = [{
            declarations: input.pluralData.declarations || [],
            selectors: input.pluralData.selectors || [],
            match: input.pluralData.match
          }];
          valueToSave = JSON.stringify(pluralStructure);
        } else {
          const textarea = popup.querySelector(`textarea[data-locale="${locale}"][data-lang-index="${i}"]`);
          valueToSave = textarea ? textarea.value : '';
        }

        const serverValue = input.serverValue;
        const serverValueString = typeof serverValue === 'object'
          ? JSON.stringify(serverValue)
          : serverValue;

        const isReverted = valueToSave === serverValueString;

        if (isReverted) {
          console.debug(`[paraglide-editor] Reverting ${key} (${locale}) - same as server, deleting edit`);
          await revertTranslationEdit(locale, key);
          updateLocalCache(locale, key, serverValue, false, false);
          skippedCount++;
        } else {
          await saveTranslationEdit(locale, key, valueToSave);
          console.debug(`[paraglide-editor] ✓ Saved edit for ${key} (${locale})`);
          updateLocalCache(locale, key, valueToSave, true, false);
          savedCount++;
        }
      }

      console.debug(`[paraglide-editor] Save summary: ${savedCount} saved, ${skippedCount} skipped (unchanged)`);

      refreshElementsByKey(key);

      close();
    } catch (error) {
      console.error('[paraglide-editor] Failed to save edits:', error);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save All';
      alert('Failed to save translations. Check console for details.');
    }
  });
}

/**
 * Setup multi-slot save handler.
 * Captures current slot's textareas, then iterates ALL slots in slotEdits
 * to save/revert each one. Refreshes all affected keys afterwards.
 *
 * @param {HTMLElement} popup - Popup element
 * @param {Object} slotEdits - Map of slotName → { languageInputs, isPlural }
 * @param {Object} slotPopupData - Map of slotName → popupData (with languageInputs, isPlural, etc.)
 * @param {Function} captureCurrentSlot - Function that captures current textarea values into slotEdits
 * @param {Function} close - Function to close popup
 */
export function setupMultiSlotSaveHandler(popup, slotEdits, slotPopupData, captureCurrentSlot, close) {
  const saveBtn = popup.querySelector('#pge-save-btn');

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      // Capture current slot's textarea values first
      captureCurrentSlot();

      let totalSaved = 0;
      let totalSkipped = 0;
      const keysToRefresh = new Set();

      for (const [slotName, editData] of Object.entries(slotEdits)) {
        const popupData = slotPopupData[slotName];
        if (!popupData) continue;

        const { languageInputs, isPlural } = popupData;
        const key = popupData.key;
        keysToRefresh.add(key);

        for (let i = 0; i < languageInputs.length; i++) {
          const input = languageInputs[i];
          const locale = input.locale;

          let valueToSave;

          if (isPlural) {
            // For plural, editData stores the mutated pluralData on languageInputs
            const pluralStructure = [{
              declarations: input.pluralData?.declarations || [],
              selectors: input.pluralData?.selectors || [],
              match: input.pluralData?.match || {}
            }];
            valueToSave = JSON.stringify(pluralStructure);
          } else {
            // For simple, editData stores per-locale values
            valueToSave = editData.simple?.[locale] ?? '';
          }

          const serverValue = input.serverValue;
          const serverValueString = typeof serverValue === 'object'
            ? JSON.stringify(serverValue)
            : serverValue;

          const isReverted = valueToSave === serverValueString;

          if (isReverted) {
            console.debug(`[paraglide-editor] Reverting ${key} (${locale}) - same as server, deleting edit`);
            await revertTranslationEdit(locale, key);
            updateLocalCache(locale, key, serverValue, false, false);
            totalSkipped++;
          } else {
            await saveTranslationEdit(locale, key, valueToSave);
            console.debug(`[paraglide-editor] ✓ Saved edit for ${key} (${locale})`);
            updateLocalCache(locale, key, valueToSave, true, false);
            totalSaved++;
          }
        }
      }

      console.debug(`[paraglide-editor] Multi-slot save summary: ${totalSaved} saved, ${totalSkipped} skipped`);

      for (const key of keysToRefresh) {
        refreshElementsByKey(key);
      }

      close();
    } catch (error) {
      console.error('[paraglide-editor] Failed to save multi-slot edits:', error);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save All';
      alert('Failed to save translations. Check console for details.');
    }
  });
}

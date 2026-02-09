/**
 * Popup Event Handlers
 *
 * Event handling logic for the edit popup
 * Variant controls, save/cancel handlers, etc.
 */

import { saveTranslationEdit, deleteTranslationEdit } from '../db.js';
import { updateLocalCache } from '../dataStore.js';
import { refreshElementsByKey } from '../overlay.js';

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
    console.log('[paraglide-editor] Variant selector changed to:', selectedVariant);

    languageInputs.forEach((input, index) => {
      const singleTextarea = popup.querySelector(`.pge-variant-single[data-lang-index="${index}"]`);
      if (singleTextarea && input.pluralData) {
        const newValue = input.pluralData.match[selectedVariant] || '';
        singleTextarea.value = newValue;
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
        singleTextarea.style.display = 'block';
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
        singleTextarea.style.display = 'none';

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
 * Setup save handler
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
          console.log(`[paraglide-editor] Reverting ${key} (${locale}) - same as server, deleting edit`);
          await deleteTranslationEdit(locale, key);
          updateLocalCache(locale, key, serverValue, false, false);
          skippedCount++;
        } else {
          await saveTranslationEdit(locale, key, valueToSave);
          console.log(`[paraglide-editor] ✓ Saved edit for ${key} (${locale})`);
          updateLocalCache(locale, key, valueToSave, true, false);
          savedCount++;
        }
      }

      console.log(`[paraglide-editor] Save summary: ${savedCount} saved, ${skippedCount} skipped (unchanged)`);

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

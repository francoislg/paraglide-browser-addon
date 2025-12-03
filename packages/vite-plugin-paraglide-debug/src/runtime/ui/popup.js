/**
 * Edit popup component for translation editing
 */

import { saveTranslationEdit, deleteTranslationEdit } from '../db.js';
import { getTranslationVersions } from '../dataStore.js';
import { renderEditedTemplate } from '../renderer.js';
import { updateLocalCache } from '../dataStore.js';
import { getCurrentLocale } from '../languageDetection.js';
import { getSelectedLanguages, fetchTranslationsForKey } from '../helpers.js';
import { detectActiveVariant } from '../variants.js';

/**
 * Create and manage the edit popup
 */
export async function createEditPopup(element, key, params, currentText) {
  // Remove any existing popup and anchor
  const existingAnchor = document.getElementById('pg-edit-anchor');
  if (existingAnchor) {
    existingAnchor.remove();
  }

  // Create anchor element that will be positioned near the clicked element
  const anchor = document.createElement('div');
  anchor.id = 'pg-edit-anchor';

  // Create popup inside the anchor
  const popup = document.createElement('div');
  popup.id = 'pg-edit-popup';

  // Get current locale
  const currentLocale = getCurrentLocale();

  // Get selected languages and sort with current language first
  let selectedLanguages = getSelectedLanguages();
  selectedLanguages = selectedLanguages.sort((a, b) => {
    if (a === currentLocale) return -1;
    if (b === currentLocale) return 1;
    return a.localeCompare(b);
  });

  // Fetch server translations for all selected languages (still needed for context)
  const serverTranslations = await fetchTranslationsForKey(key);

  // Build language-specific data using unified dataStore
  const languageInputs = [];
  let isPlural = false;
  let variantForms = [];

  console.log('[paraglide-debug] 📦 Checking elements: Building languageInputs for key:', key, 'currentLocale:', currentLocale);

  for (const locale of selectedLanguages) {
    // Get both server and edited versions from unified dataStore (synchronous!)
    const versions = getTranslationVersions(locale, key);
    console.log(`[paraglide-debug] 🗂️ Checking elements: ${locale} versions from store:`, {
      current: versions.current,
      isEdited: versions.isEdited,
      server: versions.server
    });

    // Use current (edited if exists, otherwise server) for display
    const displayValue = versions.current;
    let pluralData = null;

    // Handle plural forms (can be array from server or JSON string from DB)
    if (Array.isArray(displayValue) && displayValue[0]?.match) {
      // Direct array from server translations
      isPlural = true;
      // IMPORTANT: Deep clone to avoid mutating the original data store
      pluralData = JSON.parse(JSON.stringify(displayValue[0]));
      if (variantForms.length === 0) {
        variantForms = Object.keys(pluralData.match);
        console.debug('[paraglide-debug] 🔢 Checking elements: Initialized variantForms from', locale, ':', variantForms);
      }
    } else if (typeof displayValue === 'string' && displayValue.startsWith('[{')) {
      // JSON string from database
      try {
        const parsed = JSON.parse(displayValue);
        if (Array.isArray(parsed) && parsed[0]?.match) {
          isPlural = true;
          // Already a fresh copy from JSON.parse
          pluralData = parsed[0];
          // Extract variant forms if not already done
          if (variantForms.length === 0) {
            variantForms = Object.keys(pluralData.match);
            console.debug('[paraglide-debug] 🔢 Checking elements: Initialized variantForms from', locale, ':', variantForms);
          }
        }
      } catch (err) {
        console.warn('[paraglide-debug] Failed to parse plural translation:', err);
      }
    }

    const entry = {
      locale,
      isCurrent: locale === currentLocale,
      pluralData,
      displayValue,
      isEdited: versions.isEdited,
      serverValue: versions.server
    };

    // Log the match object for debugging
    if (pluralData?.match) {
      console.debug(`[paraglide-debug] 🗂️ Checking elements: ${locale} pluralData.match:`, JSON.stringify(pluralData.match, null, 2));
    }

    languageInputs.push(entry);
  }

  console.log('[paraglide-debug] ✅ Checking elements: Final languageInputs array:', languageInputs.map(i => ({
    locale: i.locale,
    isCurrent: i.isCurrent,
    hasPlural: !!i.pluralData,
    isEdited: i.isEdited
  })));

  // Detect active variant if params are provided
  let activeVariantKey = null;
  if (isPlural && variantForms.length > 0 && params && Object.keys(params).length > 0) {
    // Use the first language's plural data to detect active variant
    const firstPluralData = languageInputs.find(input => input.pluralData)?.pluralData;
    if (firstPluralData) {
      activeVariantKey = detectActiveVariant(firstPluralData, params, currentLocale);
    }
  }

  // Generate HTML - with shared controls for variants
  let variantControlsHTML = '';
  if (isPlural && variantForms.length > 0) {
    const variantFormsOptions = variantForms.map(variant => {
      const isSelected = variant === activeVariantKey ? ' selected' : '';
      const displayName = variant.replace(/countPlural=|ordinal=/, '');
      return `<option value="${variant}"${isSelected}>${displayName}</option>`;
    }).join('');

    variantControlsHTML = `
      <div class="pg-variant-controls-global">
        <label style="font-size: 12px; color: #718096; margin-right: 8px; font-weight: 600;">Select variant:</label>
        <select class="pg-variant-selector-global">
          ${variantFormsOptions}
        </select>
        <button class="pg-variant-expand-btn-global" type="button">
          <span class="expand-text">Expand all variants</span>
          <span class="collapse-text" style="display:none;">Collapse</span>
        </button>
      </div>
    `;
  }

  const languageInputsHTML = languageInputs.map((input, index) => {
    if (!isPlural) {
      // Simple translation - show the RAW template (edited if exists, otherwise server)
      // This preserves {placeholders} so user can edit them
      // Ensure it's a string to avoid [object Object]
      let value = '';
      if (typeof input.displayValue === 'string') {
        value = input.displayValue;
      } else if (input.displayValue) {
        // If it's an object (shouldn't happen), try to stringify
        console.warn('[paraglide-debug] displayValue is not a string:', input.displayValue);
        value = '';
      }

      console.log(`[paraglide-debug] 🎨 Checking elements (HTML gen): ${input.locale} [index ${index}] displayValue = "${value}"`);
      console.log(`[paraglide-debug] 🎨 Checking elements (HTML gen): ${input.locale} isEdited = ${input.isEdited}`);

      // Show edit indicator if this translation has been edited
      const editIndicator = input.isEdited
        ? '<span style="color: #48bb78; font-size: 11px; margin-left: 4px;">✓ Edited</span>'
        : '';

      return `
        <div class="pg-lang-row">
          <span class="pg-lang-name ${input.isCurrent ? 'pg-lang-current' : ''}">${input.locale.toUpperCase()}${editIndicator}</span>
          <textarea
            class="pg-edit-textarea"
            data-locale="${input.locale}"
            data-lang-index="${index}"
            placeholder="Enter translation for ${input.locale}..."
            rows="1"
          >${value}</textarea>
        </div>
      `;
    } else {
      // Plural translation - all variants for this language
      const allVariantsHTML = variantForms.map(variant => {
        const value = input.pluralData?.match?.[variant] || '';
        const displayName = variant.replace(/countPlural=|ordinal=/, '');
        console.log(`[paraglide-debug] 🎨 Checking elements (HTML gen): ${input.locale} variant ${variant} = "${value}"`);
        return `
          <div class="pg-variant-row" data-variant="${variant}" data-lang-index="${index}">
            <span class="pg-variant-label">${displayName}:</span>
            <textarea
              class="pg-edit-textarea pg-variant-textarea"
              data-locale="${input.locale}"
              data-variant="${variant}"
              data-lang-index="${index}"
              placeholder="Enter ${displayName} variant..."
              rows="1"
            >${value}</textarea>
          </div>
        `;
      }).join('');

      // Use active variant if detected, otherwise first variant
      const initialVariant = activeVariantKey || variantForms[0];
      const initialValue = input.pluralData?.match?.[initialVariant] || '';
      console.log(`[paraglide-debug] 🎨 Checking elements (HTML gen): ${input.locale} single textarea (variant ${initialVariant}) = "${initialValue}"`);
      return `
        <div class="pg-lang-row pg-plural-row" data-lang-index="${index}">
          <span class="pg-lang-name ${input.isCurrent ? 'pg-lang-current' : ''}">${input.locale.toUpperCase()}</span>
          <div class="pg-plural-container">
            <textarea
              class="pg-edit-textarea pg-variant-single"
              data-locale="${input.locale}"
              data-lang-index="${index}"
              placeholder="Enter translation..."
              rows="1"
            >${initialValue}</textarea>
            <div class="pg-all-variants" data-lang-index="${index}" style="display:none;">
              ${allVariantsHTML}
            </div>
          </div>
        </div>
      `;
    }
  }).join('');

  popup.innerHTML = `
    <style>
      #pg-edit-anchor {
        position: absolute;
        z-index: 10000000;
        pointer-events: none;
      }
      #pg-edit-popup {
        position: absolute;
        pointer-events: auto;
        background: white;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.25);
        padding: 20px;
        width: 60vw;
        max-height: 80vh;
        overflow-y: auto;
        font-family: system-ui, -apple-system, sans-serif;
      }
      #pg-edit-popup h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #2d3748;
        font-weight: 600;
      }
      #pg-edit-popup .pg-meta {
        font-size: 12px;
        color: #718096;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      #pg-edit-popup .pg-meta strong {
        color: #4a5568;
      }
      #pg-edit-popup .pg-variant-controls-global {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 16px;
        padding: 12px;
        background: #f7fafc;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
      }
      #pg-edit-popup .pg-variant-selector-global {
        padding: 6px 10px;
        border: 1px solid #cbd5e0;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        background: white;
      }
      #pg-edit-popup .pg-variant-expand-btn-global {
        padding: 6px 14px;
        border: 1px solid #cbd5e0;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        background: white;
        color: #4a5568;
        transition: all 0.2s;
      }
      #pg-edit-popup .pg-variant-expand-btn-global:hover {
        background: #f7fafc;
        border-color: #667eea;
      }
      #pg-edit-popup .pg-lang-row {
        margin-bottom: 12px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      #pg-edit-popup .pg-lang-name {
        font-size: 13px;
        font-weight: 600;
        color: #4a5568;
        min-width: 40px;
        flex-shrink: 0;
        margin-top: 8px;
      }
      #pg-edit-popup .pg-lang-name.pg-lang-current {
        color: #667eea;
        font-weight: 700;
      }
      #pg-edit-popup .pg-plural-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #pg-edit-popup .pg-all-variants {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
        background: #f7fafc;
        border-radius: 4px;
      }
      #pg-edit-popup .pg-variant-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #pg-edit-popup .pg-variant-label {
        font-size: 12px;
        font-weight: 600;
        color: #718096;
        min-width: 60px;
        flex-shrink: 0;
      }
      #pg-edit-popup .pg-edit-textarea {
        flex: 1;
        min-height: 32px;
        max-height: 120px;
        padding: 6px 10px;
        border: 1px solid #cbd5e0;
        border-radius: 4px;
        font-family: inherit;
        font-size: 14px;
        resize: vertical;
        box-sizing: border-box;
        line-height: 1.4;
      }
      #pg-edit-popup .pg-edit-textarea:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
      #pg-edit-popup .pg-buttons {
        display: flex;
        gap: 8px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
      }
      #pg-edit-popup button {
        padding: 10px 24px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      #pg-edit-popup .pg-save {
        background: #667eea;
        color: white;
      }
      #pg-edit-popup .pg-save:hover {
        background: #5a67d8;
      }
      #pg-edit-popup .pg-save:disabled {
        background: #cbd5e0;
        cursor: not-allowed;
      }
      #pg-edit-popup .pg-cancel {
        background: #e2e8f0;
        color: #4a5568;
      }
      #pg-edit-popup .pg-cancel:hover {
        background: #cbd5e0;
      }
      @media (prefers-color-scheme: dark) {
        #pg-edit-popup {
          background: #2d3748;
        }
        #pg-edit-popup h4 {
          color: #f7fafc;
        }
        #pg-edit-popup .pg-meta {
          color: #a0aec0;
          border-bottom-color: #4a5568;
        }
        #pg-edit-popup .pg-meta strong {
          color: #cbd5e0;
        }
        #pg-edit-popup .pg-variant-controls-global {
          background: #1a202c;
          border-color: #4a5568;
        }
        #pg-edit-popup .pg-variant-selector-global,
        #pg-edit-popup .pg-variant-expand-btn-global {
          background: #2d3748;
          border-color: #4a5568;
          color: #f7fafc;
        }
        #pg-edit-popup .pg-lang-name {
          color: #cbd5e0;
        }
        #pg-edit-popup .pg-lang-name.pg-lang-current {
          color: #818cf8;
        }
        #pg-edit-popup .pg-edit-textarea {
          background: #1a202c;
          border-color: #4a5568;
          color: #f7fafc;
        }
        #pg-edit-popup .pg-cancel {
          background: #4a5568;
          color: #e2e8f0;
        }
        #pg-edit-popup .pg-cancel:hover {
          background: #718096;
        }
        #pg-edit-popup .pg-buttons {
          border-top-color: #4a5568;
        }
        #pg-edit-popup .pg-all-variants {
          background: #1a202c;
        }
        #pg-edit-popup .pg-variant-label {
          color: #a0aec0;
        }
      }
    </style>
    <h4>Edit Translation</h4>
    <div class="pg-meta">
      <strong>Key:</strong> ${key}
      ${params && Object.keys(params).length > 0 ? `<br><strong>Params:</strong> ${JSON.stringify(params)}` : ''}
    </div>
    ${variantControlsHTML}
    ${languageInputsHTML}
    <div class="pg-buttons">
      <button class="pg-cancel" id="pg-cancel-btn">Cancel</button>
      <button class="pg-save" id="pg-save-btn">Save All</button>
    </div>
  `;

  // Append popup to anchor
  anchor.appendChild(popup);

  // Append anchor to body
  document.body.appendChild(anchor);

  // Position anchor near the element using absolute coordinates
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  // Position anchor at the element's location in the document
  anchor.style.top = `${rect.top + scrollTop}px`;
  anchor.style.left = `${rect.left + scrollLeft}px`;

  // Wait for next frame to ensure popup is rendered and we can get accurate dimensions
  requestAnimationFrame(() => {
    const popupRect = popup.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 16; // Minimum margin from viewport edges

    // Calculate position relative to anchor (default: below the element)
    let top = rect.height + 8;
    let left = 0;

    // Horizontal positioning - ensure popup stays within left/right boundaries
    const popupLeftEdge = anchorRect.left + left;
    const popupRightEdge = anchorRect.left + left + popupRect.width;

    if (popupRightEdge > viewportWidth - margin) {
      // Popup extends beyond right edge - shift left
      left = viewportWidth - anchorRect.left - popupRect.width - margin;
    }

    if (popupLeftEdge + left < margin) {
      // Popup extends beyond left edge - shift right
      left = margin - anchorRect.left;
    }

    // Vertical positioning - prefer below, but position above if no room
    // Use viewport coordinates for all space calculations
    const elementTopInViewport = rect.top;
    const elementBottomInViewport = rect.bottom;
    const spaceBelow = viewportHeight - elementBottomInViewport;
    const spaceAbove = elementTopInViewport;
    const popupHeight = popupRect.height;

    if (spaceBelow >= popupHeight + margin) {
      // Fits below - position below the element
      top = rect.height + 8;
    } else if (spaceAbove >= popupHeight + margin) {
      // Doesn't fit below, but fits above - position above the element
      top = -popupHeight - 8;
    } else {
      // Doesn't fit well either above or below
      if (spaceBelow > spaceAbove) {
        // More space below - position below and constrain height if needed
        top = rect.height + 8;
      } else {
        // More space above - position above and constrain height if needed
        top = -popupHeight - 8;
      }
    }

    // Final boundary checks to keep popup within viewport
    // Check if popup would go off the top of viewport
    const popupTopInViewport = anchorRect.top + top;
    if (popupTopInViewport < margin) {
      // Shift down to stay within top boundary
      top = margin - anchorRect.top;
    }

    // Check if popup would go off the bottom of viewport
    const popupBottomInViewport = anchorRect.top + top + popupHeight;
    if (popupBottomInViewport > viewportHeight - margin) {
      // Shift up to stay within bottom boundary
      top = viewportHeight - margin - anchorRect.top - popupHeight;
    }

    // Apply calculated position
    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
  });

  // Handle variant selector changes (shared control)
  if (isPlural) {
    const globalSelector = popup.querySelector('.pg-variant-selector-global');
    const globalExpandBtn = popup.querySelector('.pg-variant-expand-btn-global');

    // Update all single textareas when selector changes
    globalSelector.addEventListener('change', () => {
      const selectedVariant = globalSelector.value;
      console.log('[paraglide-debug] 🔄 Checking elements (selector change): Selector changed to:', selectedVariant);

      languageInputs.forEach((input, index) => {
        const singleTextarea = popup.querySelector(`.pg-variant-single[data-lang-index="${index}"]`);
        if (singleTextarea && input.pluralData) {
          const newValue = input.pluralData.match[selectedVariant] || '';
          console.log(`[paraglide-debug] 🔄 Checking elements (selector change): Updating ${input.locale} [index ${index}] textarea to: "${newValue}"`);
          console.log(`[paraglide-debug] 🔄 Checking elements (selector change): ${input.locale} full match object:`, input.pluralData.match);
          singleTextarea.value = newValue;
        }
      });
    });

    // Sync single textarea changes back to plural data
    languageInputs.forEach((input, index) => {
      const singleTextarea = popup.querySelector(`.pg-variant-single[data-lang-index="${index}"]`);
      if (singleTextarea) {
        singleTextarea.addEventListener('input', () => {
          const selectedVariant = globalSelector.value;
          if (!input.pluralData) input.pluralData = { match: {} };
          input.pluralData.match[selectedVariant] = singleTextarea.value;

          // Also update the expanded variant textarea if visible
          const allVariantsContainer = popup.querySelector(`.pg-all-variants[data-lang-index="${index}"]`);
          if (allVariantsContainer && allVariantsContainer.style.display !== 'none') {
            const variantTextarea = allVariantsContainer.querySelector(`textarea[data-variant="${selectedVariant}"]`);
            if (variantTextarea) {
              variantTextarea.value = singleTextarea.value;
            }
          }
        });
      }
    });

    // Handle expand/collapse
    let isExpanded = false;
    globalExpandBtn.addEventListener('click', () => {
      const expandText = globalExpandBtn.querySelector('.expand-text');
      const collapseText = globalExpandBtn.querySelector('.collapse-text');

      if (isExpanded) {
        // Collapse - hide all expanded variants, show single textareas
        languageInputs.forEach((input, index) => {
          const singleTextarea = popup.querySelector(`.pg-variant-single[data-lang-index="${index}"]`);
          const allVariantsContainer = popup.querySelector(`.pg-all-variants[data-lang-index="${index}"]`);

          // Sync all variants back to pluralData
          const variantTextareas = allVariantsContainer.querySelectorAll('.pg-variant-textarea');
          variantTextareas.forEach(ta => {
            const variant = ta.dataset.variant;
            if (!input.pluralData) input.pluralData = { match: {} };
            input.pluralData.match[variant] = ta.value;
          });

          // Update single textarea with currently selected variant
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
        // Expand - show all variants, hide single textareas
        const selectedVariant = globalSelector.value;

        languageInputs.forEach((input, index) => {
          const singleTextarea = popup.querySelector(`.pg-variant-single[data-lang-index="${index}"]`);
          const allVariantsContainer = popup.querySelector(`.pg-all-variants[data-lang-index="${index}"]`);

          // Sync current single textarea value to pluralData
          if (!input.pluralData) input.pluralData = { match: {} };
          input.pluralData.match[selectedVariant] = singleTextarea.value;

          // Update the expanded textarea for current variant
          const variantTextarea = allVariantsContainer.querySelector(`textarea[data-variant="${selectedVariant}"]`);
          if (variantTextarea) {
            variantTextarea.value = singleTextarea.value;
          }

          allVariantsContainer.style.display = 'flex';
          singleTextarea.style.display = 'none';

          // Add input listeners to expanded textareas
          const variantTextareas = allVariantsContainer.querySelectorAll('.pg-variant-textarea');
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

  // Cleanup function to close popup and remove event listeners
  const close = () => {
    anchor.remove();
    document.removeEventListener('keydown', handleEsc);
    document.removeEventListener('click', handleClickOutside, true);
  };

  // Close on ESC key
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      close();
    }
  };

  // Close on click outside popup
  const handleClickOutside = (e) => {
    if (!anchor.contains(e.target)) {
      close();
    }
  };

  // Handle cancel
  document.getElementById('pg-cancel-btn').addEventListener('click', close);

  // Handle save - save all languages
  document.getElementById('pg-save-btn').addEventListener('click', async () => {
    const saveBtn = document.getElementById('pg-save-btn');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      // Save each language's translation
      let savedCount = 0;
      let skippedCount = 0;

      for (let i = 0; i < languageInputs.length; i++) {
        const input = languageInputs[i];
        const locale = input.locale;

        let valueToSave;

        if (isPlural) {
          // For plural forms, serialize the entire plural structure
          const pluralStructure = [{
            declarations: input.pluralData.declarations || [],
            selectors: input.pluralData.selectors || [],
            match: input.pluralData.match
          }];
          valueToSave = JSON.stringify(pluralStructure);
        } else {
          // For simple translations, get the textarea value
          const textarea = popup.querySelector(`textarea[data-locale="${locale}"][data-lang-index="${i}"]`);
          valueToSave = textarea ? textarea.value : '';
        }

        // Check if value differs from server translation
        const serverValue = input.serverValue;
        const serverValueString = typeof serverValue === 'object'
          ? JSON.stringify(serverValue)
          : serverValue;

        const isReverted = valueToSave === serverValueString;

        if (isReverted) {
          // Value matches server - delete the edit (revert to server value)
          console.log(`[paraglide-debug] Reverting ${key} (${locale}) - same as server, deleting edit`);
          await deleteTranslationEdit(locale, key);
          updateLocalCache(locale, key, serverValue, false, false);
          skippedCount++;
        } else {
          // Value differs - save the edit
          await saveTranslationEdit(locale, key, valueToSave);
          console.log(`[paraglide-debug] ✓ Saved edit for ${key} (${locale})`);
          updateLocalCache(locale, key, valueToSave, true, false);
          savedCount++;
        }

        // Note: DOM updates will be handled automatically by applySavedEditsFromDB()
        // when the popup closes and triggers the MutationObserver
      }

      // Log summary
      console.log(`[paraglide-debug] Save summary: ${savedCount} saved, ${skippedCount} skipped (unchanged)`);

      // Close popup
      close();
    } catch (error) {
      console.error('[paraglide-debug] Failed to save edits:', error);
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save All';
      alert('Failed to save translations. Check console for details.');
    }
  });

  // Add event listeners
  document.addEventListener('keydown', handleEsc);

  // Add slight delay to prevent immediate closure from the click that opened the popup
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside, true);
  }, 100);

  // Verify actual textarea values after DOM is ready
  console.log('[paraglide-debug] 🔍 Verifying actual textarea values in DOM:');
  const allTextareas = popup.querySelectorAll('.pg-edit-textarea:not(.pg-variant-textarea):not(.pg-variant-single)');
  allTextareas.forEach((textarea, idx) => {
    const locale = textarea.dataset.locale;
    const value = textarea.value;
    console.log(`[paraglide-debug] 🔍 Actual DOM: ${locale} textarea value = "${value}"`);
  });

  // Focus first textarea
  const firstTextarea = popup.querySelector('.pg-edit-textarea');
  if (firstTextarea) {
    firstTextarea.focus();
    firstTextarea.select();
  }
}

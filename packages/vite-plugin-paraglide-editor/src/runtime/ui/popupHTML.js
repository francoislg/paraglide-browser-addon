/**
 * Popup HTML Generation
 *
 * Functions for generating HTML for the edit popup
 * Separated from popup.js for better organization and testability
 */

import { escapeHtml } from './dom.js';

/**
 * Generate variant controls HTML (selector and expand button)
 *
 * @param {boolean} isPlural - Whether this is a plural translation
 * @param {string[]} variantForms - Array of variant form keys
 * @param {string} activeVariantKey - Currently active variant key
 * @returns {string} HTML string for variant controls
 */
export function generateVariantControls(isPlural, variantForms, activeVariantKey) {
  if (!isPlural || variantForms.length === 0) {
    return '';
  }

  const variantFormsOptions = variantForms.map(variant => {
    const isSelected = variant === activeVariantKey ? ' selected' : '';
    const displayName = variant.replace(/countPlural=|ordinal=/, '');
    return `<option value="${escapeHtml(variant)}"${isSelected}>${escapeHtml(displayName)}</option>`;
  }).join('');

  return `
    <div class="pge-variant-controls-global">
      <label style="font-size: 12px; color: #718096; margin-right: 8px; font-weight: 600;">Select variant:</label>
      <select class="pge-variant-selector-global">
        ${variantFormsOptions}
      </select>
      <button class="pge-variant-expand-btn-global" type="button">
        <span class="expand-text">Expand all variants</span>
        <span class="collapse-text" style="display:none;">Collapse</span>
      </button>
    </div>
  `;
}

/**
 * Generate HTML for a simple (non-plural) translation input
 *
 * @param {Object} input - Language input data
 * @param {number} index - Index in languageInputs array
 * @returns {string} HTML string
 */
export function generateSimpleInput(input, index) {
  // Ensure displayValue is a string to avoid [object Object]
  let value = '';
  if (typeof input.displayValue === 'string') {
    value = escapeHtml(input.displayValue);
  } else if (input.displayValue) {
    // If it's an object (shouldn't happen), log warning
    console.warn('[paraglide-editor] displayValue is not a string:', input.displayValue);
    value = '';
  }

  const serverValue = typeof input.serverValue === 'string' ? input.serverValue : '';
  const currentValue = typeof input.displayValue === 'string' ? input.displayValue : '';
  const showRevert = currentValue !== serverValue;

  const editIndicator = input.isEdited
    ? '<span style="color: #48bb78; font-size: 11px; margin-left: 4px;">✓ Edited</span>'
    : '';

  return `
    <div class="pge-lang-row">
      <span class="pge-lang-name ${input.isCurrent ? 'pge-lang-current' : ''}">${input.locale.toUpperCase()}${editIndicator}</span>
      <div class="pge-textarea-wrapper">
        <textarea
          class="pge-edit-textarea"
          data-locale="${input.locale}"
          data-lang-index="${index}"
          data-server-value="${escapeHtml(serverValue)}"
          placeholder="Enter translation for ${input.locale}..."
          rows="1"
        >${value}</textarea>
        <button class="pge-revert-btn" type="button" title="Revert to original"${showRevert ? '' : ' style="display:none;"'}>&#x21A9;</button>
      </div>
    </div>
  `;
}

/**
 * Generate HTML for a plural translation input
 *
 * @param {Object} input - Language input data
 * @param {number} index - Index in languageInputs array
 * @param {string[]} variantForms - Array of variant form keys
 * @param {string} activeVariantKey - Currently active variant key
 * @returns {string} HTML string
 */
export function generatePluralInput(input, index, variantForms, activeVariantKey) {
  // Extract server variant values for revert
  const serverMatch = Array.isArray(input.serverValue) && input.serverValue[0]?.match
    ? input.serverValue[0].match
    : {};

  const allVariantsHTML = variantForms.map(variant => {
    const value = escapeHtml(input.pluralData?.match?.[variant] || '');
    const serverVariantValue = serverMatch[variant] || '';
    const currentVariantValue = input.pluralData?.match?.[variant] || '';
    const showRevert = currentVariantValue !== serverVariantValue;
    const displayName = variant.replace(/countPlural=|ordinal=/, '');
    return `
      <div class="pge-variant-row" data-variant="${variant}" data-lang-index="${index}">
        <span class="pge-variant-label">${escapeHtml(displayName)}:</span>
        <div class="pge-textarea-wrapper">
          <textarea
            class="pge-edit-textarea pge-variant-textarea"
            data-locale="${input.locale}"
            data-variant="${variant}"
            data-lang-index="${index}"
            data-server-value="${escapeHtml(serverVariantValue)}"
            placeholder="Enter ${displayName} variant..."
            rows="1"
          >${value}</textarea>
          <button class="pge-revert-btn" type="button" title="Revert to original"${showRevert ? '' : ' style="display:none;"'}>&#x21A9;</button>
        </div>
      </div>
    `;
  }).join('');

  const initialVariant = activeVariantKey || variantForms[0];
  const initialValue = escapeHtml(input.pluralData?.match?.[initialVariant] || '');
  const initialServerValue = serverMatch[initialVariant] || '';
  const showSingleRevert = (input.pluralData?.match?.[initialVariant] || '') !== initialServerValue;

  return `
    <div class="pge-lang-row pge-plural-row" data-lang-index="${index}">
      <span class="pge-lang-name ${input.isCurrent ? 'pge-lang-current' : ''}">${input.locale.toUpperCase()}</span>
      <div class="pge-plural-container">
        <div class="pge-textarea-wrapper">
          <textarea
            class="pge-edit-textarea pge-variant-single"
            data-locale="${input.locale}"
            data-lang-index="${index}"
            data-server-value="${escapeHtml(initialServerValue)}"
            placeholder="Enter translation..."
            rows="1"
          >${initialValue}</textarea>
          <button class="pge-revert-btn" type="button" title="Revert to original"${showSingleRevert ? '' : ' style="display:none;"'}>&#x21A9;</button>
        </div>
        <div class="pge-all-variants" data-lang-index="${index}" style="display:none;">
          ${allVariantsHTML}
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate HTML for all language inputs
 *
 * @param {Array} languageInputs - Array of language input data
 * @param {boolean} isPlural - Whether this is a plural translation
 * @param {string[]} variantForms - Array of variant form keys
 * @param {string} activeVariantKey - Currently active variant key
 * @returns {string} HTML string
 */
export function generateLanguageInputsHTML(languageInputs, isPlural, variantForms, activeVariantKey) {
  return languageInputs.map((input, index) => {
    if (isPlural) {
      return generatePluralInput(input, index, variantForms, activeVariantKey);
    } else {
      return generateSimpleInput(input, index);
    }
  }).join('');
}

/**
 * Generate the slot-switchable body content (variant controls + language inputs).
 * This is extracted so it can be called again when switching slots.
 *
 * @param {Object} params
 * @param {Array} params.languageInputs
 * @param {boolean} params.isPlural
 * @param {string[]} params.variantForms
 * @param {string} params.activeVariantKey
 * @returns {string} HTML string for the body content
 */
export function generateSlotContentHTML({ languageInputs, isPlural, variantForms, activeVariantKey }) {
  const variantControlsHTML = generateVariantControls(isPlural, variantForms, activeVariantKey);
  const languageInputsHTML = generateLanguageInputsHTML(languageInputs, isPlural, variantForms, activeVariantKey);
  return variantControlsHTML + languageInputsHTML;
}

/**
 * Generate slot selector chips HTML
 *
 * @param {Object} slots - Map of slotName → { key, params }
 * @param {string} activeSlot - Currently active slot name
 * @returns {string} HTML string (empty if single slot)
 */
function generateSlotSelector(slots, activeSlot) {
  const slotNames = Object.keys(slots);
  if (slotNames.length <= 1) return '';

  const chips = slotNames.map(name => {
    const isActive = name === activeSlot ? ' pge-slot-active' : '';
    const displayName = name === '_text' ? 'text' : name;
    return `<button class="pge-slot-chip${isActive}" data-slot="${escapeHtml(name)}" type="button">${escapeHtml(displayName)}</button>`;
  }).join('');

  return `<div class="pge-slot-selector">${chips}</div>`;
}

/**
 * Get popup-specific styles
 * These are unique to the popup component
 *
 * @returns {string} CSS style block
 */
export function getPopupStyles() {
  return `
    <style>
      #pge-edit-anchor {
        position: absolute;
        z-index: 10000000;
        pointer-events: none;
      }
      #pge-edit-popup {
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
      #pge-edit-popup h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #2d3748;
        font-weight: 600;
      }
      #pge-edit-popup .pge-meta {
        font-size: 12px;
        color: #718096;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
      }
      #pge-edit-popup .pge-meta strong {
        color: #4a5568;
      }
      #pge-edit-popup .pge-variant-controls-global {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 16px;
        padding: 12px;
        background: #f7fafc;
        border-radius: 6px;
        border: 1px solid #e2e8f0;
      }
      #pge-edit-popup .pge-variant-selector-global {
        padding: 6px 10px;
        border: 1px solid #cbd5e0;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        background: white;
      }
      #pge-edit-popup .pge-variant-expand-btn-global {
        padding: 6px 14px;
        border: 1px solid #cbd5e0;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
        background: white;
        color: #4a5568;
        transition: all 0.2s;
      }
      #pge-edit-popup .pge-variant-expand-btn-global:hover {
        background: #f7fafc;
        border-color: #667eea;
      }
      #pge-edit-popup .pge-lang-row {
        margin-bottom: 12px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }
      #pge-edit-popup .pge-lang-name {
        font-size: 13px;
        font-weight: 600;
        color: #4a5568;
        min-width: 40px;
        flex-shrink: 0;
        margin-top: 8px;
      }
      #pge-edit-popup .pge-lang-name.pge-lang-current {
        color: #667eea;
        font-weight: 700;
      }
      #pge-edit-popup .pge-plural-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      #pge-edit-popup .pge-all-variants {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
        background: #f7fafc;
        border-radius: 4px;
      }
      #pge-edit-popup .pge-variant-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #pge-edit-popup .pge-variant-label {
        font-size: 12px;
        font-weight: 600;
        color: #718096;
        min-width: 60px;
        flex-shrink: 0;
      }
      #pge-edit-popup .pge-textarea-wrapper {
        position: relative;
        flex: 1;
      }
      #pge-edit-popup .pge-textarea-wrapper > .pge-edit-textarea {
        width: 100%;
        padding-right: 30px;
      }
      #pge-edit-popup .pge-revert-btn {
        position: absolute;
        right: 5px;
        top: 4px;
        width: 22px;
        height: 22px;
        padding: 0 !important;
        margin: 0;
        border: 1px solid #cbd5e0 !important;
        border-radius: 3px !important;
        background: #f7fafc !important;
        color: #718096 !important;
        font-size: 14px !important;
        line-height: 20px !important;
        text-align: center;
        cursor: pointer;
        transition: all 0.15s;
      }
      #pge-edit-popup .pge-revert-btn:hover {
        background: #edf2f7 !important;
        color: #4a5568 !important;
        border-color: #a0aec0 !important;
      }
      #pge-edit-popup .pge-edit-textarea {
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
      #pge-edit-popup .pge-edit-textarea:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }
      #pge-edit-popup .pge-buttons {
        display: flex;
        gap: 8px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
      }
      #pge-edit-popup button {
        padding: 10px 24px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      #pge-edit-popup .pge-save {
        background: #667eea;
        color: white;
      }
      #pge-edit-popup .pge-save:hover {
        background: #5a67d8;
      }
      #pge-edit-popup .pge-save:disabled {
        background: #cbd5e0;
        cursor: not-allowed;
      }
      #pge-edit-popup .pge-cancel {
        background: #e2e8f0;
        color: #4a5568;
      }
      #pge-edit-popup .pge-cancel:hover {
        background: #cbd5e0;
      }
      #pge-edit-popup .pge-next {
        background: #edf2f7;
        color: #4a5568;
        margin-left: auto;
      }
      #pge-edit-popup .pge-next:hover {
        background: #e2e8f0;
      }
      /* Slot selector chips */
      #pge-edit-popup .pge-slot-selector {
        display: flex;
        gap: 6px;
        margin-top: 8px;
      }
      #pge-edit-popup .pge-slot-chip {
        padding: 4px 12px !important;
        border: 1px solid #cbd5e0 !important;
        border-radius: 16px !important;
        background: #f7fafc !important;
        color: #4a5568 !important;
        font-size: 12px !important;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s;
      }
      #pge-edit-popup .pge-slot-chip:hover {
        border-color: #667eea !important;
        color: #667eea !important;
      }
      #pge-edit-popup .pge-slot-chip.pge-slot-active {
        background: #667eea !important;
        color: white !important;
        border-color: #667eea !important;
      }
      @media (prefers-color-scheme: dark) {
        #pge-edit-popup {
          background: #2d3748;
        }
        #pge-edit-popup h4 {
          color: #f7fafc;
        }
        #pge-edit-popup .pge-meta {
          color: #a0aec0;
          border-bottom-color: #4a5568;
        }
        #pge-edit-popup .pge-meta strong {
          color: #cbd5e0;
        }
        #pge-edit-popup .pge-variant-controls-global {
          background: #1a202c;
          border-color: #4a5568;
        }
        #pge-edit-popup .pge-variant-selector-global,
        #pge-edit-popup .pge-variant-expand-btn-global {
          background: #2d3748;
          border-color: #4a5568;
          color: #f7fafc;
        }
        #pge-edit-popup .pge-lang-name {
          color: #cbd5e0;
        }
        #pge-edit-popup .pge-lang-name.pge-lang-current {
          color: #818cf8;
        }
        #pge-edit-popup .pge-edit-textarea {
          background: #1a202c;
          border-color: #4a5568;
          color: #f7fafc;
        }
        #pge-edit-popup .pge-cancel {
          background: #4a5568;
          color: #e2e8f0;
        }
        #pge-edit-popup .pge-cancel:hover {
          background: #718096;
        }
        #pge-edit-popup .pge-next {
          background: #4a5568;
          color: #e2e8f0;
        }
        #pge-edit-popup .pge-next:hover {
          background: #718096;
        }
        #pge-edit-popup .pge-buttons {
          border-top-color: #4a5568;
        }
        #pge-edit-popup .pge-all-variants {
          background: #1a202c;
        }
        #pge-edit-popup .pge-variant-label {
          color: #a0aec0;
        }
        #pge-edit-popup .pge-revert-btn {
          background: #4a5568 !important;
          border-color: #718096 !important;
          color: #a0aec0 !important;
        }
        #pge-edit-popup .pge-revert-btn:hover {
          background: #718096 !important;
          color: #f7fafc !important;
        }
        #pge-edit-popup .pge-slot-chip {
          background: #4a5568 !important;
          border-color: #718096 !important;
          color: #e2e8f0 !important;
        }
        #pge-edit-popup .pge-slot-chip:hover {
          border-color: #818cf8 !important;
          color: #818cf8 !important;
        }
        #pge-edit-popup .pge-slot-chip.pge-slot-active {
          background: #667eea !important;
          color: white !important;
          border-color: #667eea !important;
        }
      }
    </style>
  `;
}

/**
 * Generate complete popup HTML
 *
 * @param {Object} params - Parameters for HTML generation
 * @param {Array} params.languageInputs - Language input data
 * @param {string} params.key - Translation key
 * @param {Object} params.params - Translation parameters
 * @param {boolean} params.isPlural - Whether this is a plural translation
 * @param {string[]} params.variantForms - Variant forms
 * @param {string} params.activeVariantKey - Active variant key
 * @param {string} [params.attr] - Attribute name if attr-based
 * @param {Object} [params.slots] - All slots map (for multi-slot elements)
 * @param {string} [params.activeSlot] - Currently active slot name
 * @returns {string} Complete HTML string
 */
export function generatePopupHTML({ languageInputs, key, params, isPlural, variantForms, activeVariantKey, attr, slots, activeSlot }) {
  const styles = getPopupStyles();
  const slotContentHTML = generateSlotContentHTML({ languageInputs, isPlural, variantForms, activeVariantKey });

  const paramsDisplay = params && Object.keys(params).length > 0
    ? `<br><strong>Params:</strong> ${escapeHtml(JSON.stringify(params))}`
    : '';

  const attrDisplay = attr
    ? `<br><strong>Attribute:</strong> ${escapeHtml(attr)}`
    : '';

  // Slot selector (only for multi-slot elements)
  const slotSelectorHTML = slots && activeSlot
    ? generateSlotSelector(slots, activeSlot)
    : '';

  // Next button (only visible for multi-slot)
  const hasMultipleSlots = slots && Object.keys(slots).length > 1;
  const nextBtnHTML = hasMultipleSlots
    ? `<button class="pge-next" id="pge-next-btn">Next &rarr;</button>`
    : '';

  return `
    ${styles}
    <h4>Edit Translation</h4>
    <div class="pge-meta">
      <strong>Key:</strong> <span id="pge-slot-key">${escapeHtml(key)}</span>
      <span id="pge-slot-params">${paramsDisplay}</span>
      <span id="pge-slot-attr">${attrDisplay}</span>
      ${slotSelectorHTML}
    </div>
    <div id="pge-slot-content">
      ${slotContentHTML}
    </div>
    <div class="pge-buttons">
      <button class="pge-cancel" id="pge-cancel-btn">Cancel</button>
      ${nextBtnHTML}
      <button class="pge-save" id="pge-save-btn">Save All</button>
    </div>
  `;
}

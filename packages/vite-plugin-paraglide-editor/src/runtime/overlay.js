/**
 * Overlay Mode and Element Refresh Management
 *
 * Purpose: Manage overlay mode for click-to-edit functionality and refresh individual elements.
 *
 * Responsibilities:
 * - Enable/disable click-to-edit overlay mode
 * - Refresh single element's content and visual state (all slots)
 * - Apply saved edits from database to DOM elements
 * - Subscribe to element pick events and manage popup lifecycle
 * - Manage visual indicators (outlines) for translatable elements
 *
 * This module does NOT:
 * - Render translation strings (see renderer.js)
 * - Manage the element registry (see registry.js)
 * - Handle UI components (see ui/)
 */

import { getTranslationVersions } from "./dataStore.js";
import { getAllEditedTranslations } from "./db.js";
import { renderTranslation, renderEditedTemplate } from "./renderer.js";
import { getCurrentLocale } from "./languageDetection.js";
import { createEditPopup } from "./ui/popup.js";
import { setElementOutline } from "./styles.js";
import { detectActiveVariant, parseVariantStructure } from "./variants.js";
import { getElementSlots } from "./registry.js";
import { initElementPicker } from "./elementPicker.js";

/** Outline state priority: higher index wins */
const OUTLINE_PRIORITY = ['none', 'hoverable', 'edited', 'conflict'];

function worstOutlineState(a, b) {
  return OUTLINE_PRIORITY.indexOf(a) >= OUTLINE_PRIORITY.indexOf(b) ? a : b;
}

/**
 * Compute the outline state for a single slot (key + params) in a given locale.
 * Does NOT touch the DOM — pure computation.
 */
function computeSlotOutlineState(key, params, currentLocale) {
  const versions = getTranslationVersions(currentLocale, key);

  if (versions.isEdited) {
    if (versions.hasConflict) return 'conflict';

    if (params && Object.keys(params).length > 0) {
      const editedVariant = parseVariantStructure(versions.edited);
      const serverVariant = parseVariantStructure(versions.server);
      if (editedVariant && serverVariant) {
        const activeVariantKey = detectActiveVariant(editedVariant, params, currentLocale);
        if (activeVariantKey) {
          const editedText = editedVariant.match[activeVariantKey];
          const serverText = serverVariant.match[activeVariantKey];
          if (editedText === serverText) return 'hoverable';
        }
      }
    }
    return 'edited';
  }
  return 'hoverable';
}

/**
 * Render a single slot's content to the DOM.
 * Returns true if the DOM was actually updated.
 */
function renderSlotToDOM(element, slotName, key, params, currentLocale) {
  const versions = getTranslationVersions(currentLocale, key);

  let rendered;
  if (versions.isEdited) {
    if (Object.keys(params).length > 0) {
      rendered = renderEditedTemplate(versions.current, params, currentLocale);
    } else if (
      typeof versions.current === "string" &&
      versions.current.trim().startsWith("[{")
    ) {
      rendered = renderEditedTemplate(versions.current, {}, currentLocale);
    } else {
      rendered = versions.current;
    }
  } else {
    rendered = renderTranslation(key, params, currentLocale);
  }

  const isAttr = slotName !== '_text';
  const currentContent = isAttr
    ? (element.getAttribute(slotName) || '')
    : element.textContent;

  if (currentContent !== rendered) {
    if (isAttr) {
      element.setAttribute(slotName, rendered);
    } else {
      element.textContent = rendered;
    }
    return true;
  }
  return false;
}

/**
 * Refresh a single element's visual state and content.
 * Handles both single-slot and multi-slot elements.
 *
 * @param {HTMLElement} element - The element to refresh
 * @param {string} locale - The locale to use (defaults to current locale)
 * @returns {boolean} - True if content was updated, false otherwise
 */
export function refreshElement(element, locale = null) {
  if (element.closest(".pge-ignore-detection")) return false;

  const currentLocale = locale || getCurrentLocale();
  const slots = getElementSlots(element);

  if (!slots) return false;

  const slotNames = Object.keys(slots);
  let anyUpdated = false;
  let anyEdited = false;
  let worstState = 'hoverable';

  for (const slotName of slotNames) {
    const { key, params } = slots[slotName];
    const versions = getTranslationVersions(currentLocale, key);

    // Render slot content
    const updated = renderSlotToDOM(element, slotName, key, params, currentLocale);
    if (updated) anyUpdated = true;

    if (versions.isEdited) anyEdited = true;

    // Compute outline state for this slot
    const slotState = computeSlotOutlineState(key, params, currentLocale);
    worstState = worstOutlineState(worstState, slotState);
  }

  // Update edited marker
  if (anyEdited) {
    element.dataset.paraglideEdited = "true";
  } else {
    delete element.dataset.paraglideEdited;
  }

  // Apply outline — 'selected' if popup is open for this element
  const overlayEnabled = window.__paraglideEditor.isOverlayEnabled?.();
  if (!overlayEnabled) {
    setElementOutline(element, "none");
  } else if (element === window.__paraglideEditor.popupElement) {
    setElementOutline(element, "selected");
  } else {
    setElementOutline(element, worstState);
  }

  return anyUpdated;
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
  // Also match elements that have this key in their slots JSON
  const allElements = document.querySelectorAll("[data-paraglide-key]");

  let updatedCount = 0;
  allElements.forEach((element) => {
    const slots = getElementSlots(element);
    if (!slots) return;

    // Check if any slot uses this key
    const usesKey = Object.values(slots).some(s => s.key === key);
    if (!usesKey) return;

    if (refreshElement(element, currentLocale)) {
      updatedCount++;
    }
  });

  console.debug(
    `[paraglide-editor] Refreshed ${updatedCount} elements with key: ${key}`
  );
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
    const currentLocale = getCurrentLocale();
    console.debug(
      "[paraglide-editor] Applying saved edits for locale:",
      currentLocale
    );

    const elements = document.querySelectorAll("[data-paraglide-key]");
    let appliedCount = 0;

    elements.forEach((element) => {
      const wasUpdated = refreshElement(element, currentLocale);
      if (wasUpdated) {
        appliedCount++;
      }
    });

    console.debug(`[paraglide-editor] ✓ Applied ${appliedCount} saved edits`);
  } catch (error) {
    console.error("[paraglide-editor] Failed to apply saved edits:", error);
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
    const currentLocale = locale || getCurrentLocale();
    console.debug(
      "[paraglide-editor] applySavedEditsFromDB: Current locale =",
      currentLocale
    );

    const editedTranslations = await getAllEditedTranslations(currentLocale);
    console.debug(
      "[paraglide-editor] applySavedEditsFromDB: Loaded edits from DB:",
      editedTranslations
    );

    if (editedTranslations.length === 0) {
      console.debug(
        "[paraglide-editor] No saved edits found for locale:",
        currentLocale
      );
      return;
    }

    console.debug(
      `[paraglide-editor] Applying ${editedTranslations.length} saved edits to page content`
    );

    const elements = document.querySelectorAll("[data-paraglide-key]");
    console.debug(
      `[paraglide-editor] Found ${elements.length} elements with data-paraglide-key attribute`
    );

    let appliedCount = 0;
    elements.forEach((element) => {
      const wasUpdated = refreshElement(element, currentLocale);
      if (wasUpdated) {
        appliedCount++;
      }
    });

    console.debug(
      `[paraglide-editor] ✓ Applied ${appliedCount} saved edits to page (expected ${editedTranslations.length})`
    );
  } catch (error) {
    console.error("[paraglide-editor] Failed to apply saved edits:", error);
  }
}

/**
 * Apply outlines to all detected translation elements based on current state
 * This is called:
 * - After initial element detection
 * - After DOM mutations (route changes, dynamic content)
 * - When overlay mode is toggled
 *
 * Uses refreshElement() to ensure variant-aware outline logic is applied correctly.
 */
export function applyOutlinesToAllElements() {
  if (!window.__paraglideEditor.isOverlayEnabled) {
    console.debug(
      "[paraglide-editor] Overlay mode not initialized yet, skipping outline application"
    );
    return;
  }

  const elements = document.querySelectorAll("[data-paraglide-key]");
  const currentLocale = getCurrentLocale();

  elements.forEach((el) => {
    const isInsidePopup = el.closest(".pge-ignore-detection");
    if (isInsidePopup) {
      return;
    }

    // Use refreshElement which has variant-aware logic for determining outline state
    // This ensures that for variants (plurals), only the actually edited forms show as edited
    refreshElement(el, currentLocale);
  });

  console.debug(
    `[paraglide-editor] Applied outlines to ${elements.length} elements`
  );
}

/**
 * Initialize overlay mode
 */
export function initOverlayMode() {
  let overlayEnabled = localStorage.getItem("pge-overlay-enabled") === "true";
  let currentPopupElement = null;
  let popupObserver = null;

  function setPopupElement(element) {
    if (popupObserver) {
      popupObserver.disconnect();
      popupObserver = null;
    }
    const prev = currentPopupElement;
    currentPopupElement = element;
    window.__paraglideEditor.popupElement = element;
    if (prev && prev !== element) refreshElement(prev);
    if (element) refreshElement(element);
  }

  // Initialize the element picker (owns all click/keyboard handling)
  const { resetCycle } = initElementPicker({
    isOverlayEnabled: () => overlayEnabled,
    getPopupElement: () => currentPopupElement,
  });

  // Subscribe to element pick events from the picker
  document.addEventListener("pge-element-picked", async (e) => {
    const { element, cyclePosition, cycleTotal } = e.detail;

    if (!element) {
      // Deselect: close popup and clear state
      if (currentPopupElement) {
        setPopupElement(null);
        const popup = document.getElementById("pge-edit-popup");
        if (popup) popup.remove();
      }
      return;
    }

    // Read all slots for this element
    const slots = getElementSlots(element);
    const slotNames = slots ? Object.keys(slots) : [];

    let activeSlot = '_text';
    if (slots) {
      if (slots._text) {
        activeSlot = '_text';
      } else {
        activeSlot = slotNames[0];
      }
    }

    const activeSlotData = slots ? slots[activeSlot] : null;
    const key = activeSlotData ? activeSlotData.key : element.dataset.paraglideKey;
    const params = activeSlotData ? activeSlotData.params : {};
    const clickedAttr = activeSlot === '_text' ? null : activeSlot;
    const currentText = clickedAttr
      ? (element.getAttribute(clickedAttr) || '').trim()
      : element.textContent.trim();

    console.debug("[paraglide-editor] Clicked translatable element:", {
      key,
      params,
      currentText,
      slots: slotNames,
      activeSlot,
      cyclePosition: `${cyclePosition}/${cycleTotal}`,
    });

    setPopupElement(element);

    await createEditPopup(element, key, params, currentText, activeSlot);

    // Inject cycle badge if multiple candidates
    if (cycleTotal > 1) {
      const popup = document.getElementById("pge-edit-popup");
      if (popup) {
        const h4 = popup.querySelector("h4");
        if (h4) {
          h4.textContent = `Edit Translation (${cyclePosition}/${cycleTotal})`;
        }
      }
    }

    // Watch for popup removal to clear currentPopupElement (but preserve cycle state)
    const popup = document.getElementById("pge-edit-popup");
    if (popup) {
      popupObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const removed of mutation.removedNodes) {
            if (removed === popup || removed.contains?.(popup)) {
              setPopupElement(null);
              console.debug("[paraglide-editor] Popup closed, cycle state preserved");
              return;
            }
          }
        }
      });
      popupObserver.observe(document.body, { childList: true });
    } else {
      setPopupElement(null);
    }
  });

  window.__paraglideEditor = window.__paraglideEditor || {};
  window.__paraglideEditor.popupElement = null;
  window.__paraglideEditor.setOverlayMode = (enabled) => {
    overlayEnabled = enabled;
    localStorage.setItem("pge-overlay-enabled", enabled.toString());
    console.debug(
      `[paraglide-editor] Overlay mode ${enabled ? "enabled" : "disabled"}`
    );

    if (!enabled) {
      resetCycle();
    }

    applyOutlinesToAllElements();
  };

  window.__paraglideEditor.isOverlayEnabled = () => overlayEnabled;

  // Expose applySavedEdits for manual refresh (e.g., after locale change)
  window.__paraglideEditor.applySavedEdits = applySavedEdits;

  applySavedEdits();

  applyOutlinesToAllElements();

  console.debug("[paraglide-editor] ✓ Overlay mode initialized");
}

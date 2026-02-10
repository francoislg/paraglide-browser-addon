/**
 * Overlay Mode and Element Refresh Management
 *
 * Purpose: Manage overlay mode for click-to-edit functionality and refresh individual elements.
 *
 * Responsibilities:
 * - Enable/disable click-to-edit overlay mode
 * - Refresh single element's content and visual state (all slots)
 * - Apply saved edits from database to DOM elements
 * - Handle click events for translation editing
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

  console.log(
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
    console.log(
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

    console.log(`[paraglide-editor] ✓ Applied ${appliedCount} saved edits`);
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

    console.log(
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
  let mouseDownElement = null;
  let suppressNextClick = false;

  // Cycle state for overlapping elements
  let cycleCandidates = [];
  let cycleIndex = -1;
  let cyclePoint = null;

  function isSamePoint(p1, p2, threshold = 5) {
    if (!p1 || !p2) return false;
    return Math.abs(p1.x - p2.x) <= threshold && Math.abs(p1.y - p2.y) <= threshold;
  }

  function getCandidatesAtPoint(x, y) {
    const elementsAtPoint = document.elementsFromPoint(x, y);
    const seen = new Set();
    const candidates = [];
    for (const el of elementsAtPoint) {
      if (el.closest(".pge-ignore-detection")) continue;
      const candidate = el.closest("[data-paraglide-key]");
      if (candidate && !seen.has(candidate)) {
        seen.add(candidate);
        candidates.push(candidate);
      }
    }
    return candidates;
  }

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

  // Suppress the click event that fires after mouseup when we open a popup.
  // This prevents links from navigating, buttons from firing, etc.
  document.addEventListener(
    "click",
    (e) => {
      if (suppressNextClick) {
        suppressNextClick = false;
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  // Track which element received mousedown
  document.addEventListener(
    "mousedown",
    (e) => {
      if (!overlayEnabled || e.button !== 0) return;

      const element = e.target.closest("[data-paraglide-key]");
      if (element) {
        mouseDownElement = element;

        // Prevent default on mousedown when we'll intercept the click.
        // This stops link drag initiation and text selection on first click.
        // Skip preventDefault if the next click will pass through (cycle exhausted).
        const isInsidePopup = e.target.closest(".pge-ignore-detection");
        const wouldPassThrough = currentPopupElement
          && isSamePoint(cyclePoint, { x: e.clientX, y: e.clientY })
          && cycleIndex + 1 >= cycleCandidates.length;
        if (!isInsidePopup && !e.shiftKey && !wouldPassThrough) {
          e.preventDefault();
        }
      }
    },
    true
  );

  // Only open popup if mouseup is on the same element as mousedown
  document.addEventListener(
    "mouseup",
    async (e) => {
      if (!overlayEnabled || !mouseDownElement || e.button !== 0) return;

      if (e.shiftKey) {
        console.log(
          "[paraglide-editor] Shift+click detected, allowing normal interaction"
        );
        mouseDownElement = null;
        return;
      }

      if (e.target.closest(".pge-ignore-detection")) {
        mouseDownElement = null;
        return;
      }

      const clickPoint = { x: e.clientX, y: e.clientY };
      const candidates = getCandidatesAtPoint(clickPoint.x, clickPoint.y);

      // Validate mousedown target is among candidates (prevents drag-across)
      if (!candidates.includes(mouseDownElement)) {
        mouseDownElement = null;
        return;
      }

      // Reset stale reference if popup was removed (e.g. SPA navigation)
      if (currentPopupElement && !document.getElementById("pge-edit-popup")) {
        setPopupElement(null);
      }

      // Determine cycle action BEFORE calling preventDefault
      let element;
      let nextCycleIndex;

      if (!isSamePoint(cyclePoint, clickPoint) || cycleCandidates.length === 0) {
        // Fresh click at a new position
        if (currentPopupElement === candidates[0] && candidates.length > 1) {
          nextCycleIndex = 1;
        } else {
          nextCycleIndex = 0;
        }
      } else {
        // Same position — cycle or pass through
        if (currentPopupElement && candidates.length === 1) {
          // Only one candidate and popup already open — pass through
          nextCycleIndex = -1;
        } else {
          const next = cycleIndex + 1;
          if (next >= candidates.length) {
            // Cycled past last — pass through
            nextCycleIndex = -1;
          } else {
            nextCycleIndex = next;
          }
        }
      }

      // Pass through: close popup, reset cycle, let native event fire
      if (nextCycleIndex === -1) {
        if (currentPopupElement) {
          setPopupElement(null);
          const popup = document.getElementById("pge-edit-popup");
          if (popup) popup.remove();
        }
        cycleCandidates = [];
        cycleIndex = -1;
        cyclePoint = null;
        mouseDownElement = null;
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      suppressNextClick = true;
      mouseDownElement = null;

      cycleCandidates = candidates;
      cyclePoint = clickPoint;
      cycleIndex = nextCycleIndex;

      element = cycleCandidates[cycleIndex];
      if (!element) return;

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

      console.log("[paraglide-editor] Clicked translatable element:", {
        key,
        params,
        currentText,
        slots: slotNames,
        activeSlot,
        cyclePosition: `${cycleIndex + 1}/${cycleCandidates.length}`,
      });

      setPopupElement(element);

      await createEditPopup(element, key, params, currentText, activeSlot);

      // Inject cycle badge if multiple candidates
      if (cycleCandidates.length > 1) {
        const popup = document.getElementById("pge-edit-popup");
        if (popup) {
          const h4 = popup.querySelector("h4");
          if (h4) {
            h4.textContent = `Edit Translation (${cycleIndex + 1}/${cycleCandidates.length})`;
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
                // observer disconnected inside setPopupElement
                console.log("[paraglide-editor] Popup closed, cycle state preserved");
                return;
              }
            }
          }
        });
        popupObserver.observe(document.body, { childList: true });
      } else {
        setPopupElement(null);
      }
    },
    true
  );

  window.__paraglideEditor = window.__paraglideEditor || {};
  window.__paraglideEditor.popupElement = null;
  window.__paraglideEditor.setOverlayMode = (enabled) => {
    overlayEnabled = enabled;
    localStorage.setItem("pge-overlay-enabled", enabled.toString());
    console.log(
      `[paraglide-editor] Overlay mode ${enabled ? "enabled" : "disabled"}`
    );

    if (!enabled) {
      cycleCandidates = [];
      cycleIndex = -1;
      cyclePoint = null;
    }

    applyOutlinesToAllElements();
  };

  window.__paraglideEditor.isOverlayEnabled = () => overlayEnabled;

  // Expose applySavedEdits for manual refresh (e.g., after locale change)
  window.__paraglideEditor.applySavedEdits = applySavedEdits;

  applySavedEdits();

  applyOutlinesToAllElements();

  console.log("[paraglide-editor] ✓ Overlay mode initialized");
}

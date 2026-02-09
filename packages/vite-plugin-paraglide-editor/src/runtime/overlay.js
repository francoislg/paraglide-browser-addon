/**
 * Overlay Mode and Element Refresh Management
 *
 * Purpose: Manage overlay mode for click-to-edit functionality and refresh individual elements.
 *
 * Responsibilities:
 * - Enable/disable click-to-edit overlay mode
 * - Refresh single element's content and visual state
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

/**
 * Refresh a single element's visual state and content
 * Uses the unified dataStore and renderer for consistency
 * @param {HTMLElement} element - The element to refresh
 * @param {string} locale - The locale to use (defaults to current locale)
 * @returns {boolean} - True if content was updated, false otherwise
 */
export function refreshElement(element, locale = null) {
  const isInsidePopup = element.closest(".pge-ignore-detection");
  if (isInsidePopup) {
    return false;
  }

  const currentLocale = locale || getCurrentLocale();
  const key = element.dataset.paraglideKey;
  const params = element.dataset.paraglideParams
    ? JSON.parse(element.dataset.paraglideParams)
    : {};

  const versions = getTranslationVersions(currentLocale, key);

  if (versions.isEdited) {
    let rendered;
    if (Object.keys(params).length > 0) {
      rendered = renderEditedTemplate(versions.current, params, currentLocale);
    } else {
      if (
        typeof versions.current === "string" &&
        versions.current.trim().startsWith("[{")
      ) {
        rendered = renderEditedTemplate(versions.current, {}, currentLocale);
      } else {
        rendered = versions.current;
      }
    }

    const wasUpdated = element.textContent !== rendered;
    if (wasUpdated) {
      element.textContent = rendered;
    }

    element.dataset.paraglideEdited = "true";

    // Check if overlay mode is disabled - if so, don't show any outlines
    const overlayEnabled = window.__paraglideEditor.isOverlayEnabled?.();
    if (!overlayEnabled) {
      setElementOutline(element, "none");
      return wasUpdated;
    }

    let outlineState = "edited";

    if (versions.hasConflict) {
      outlineState = "conflict";
    } else if (Object.keys(params).length > 0) {
      const editedVariant = parseVariantStructure(versions.edited);
      const serverVariant = parseVariantStructure(versions.server);

      if (editedVariant && serverVariant) {
        const activeVariantKey = detectActiveVariant(
          editedVariant,
          params,
          currentLocale
        );
        if (activeVariantKey) {
          const editedText = editedVariant.match[activeVariantKey];
          const serverText = serverVariant.match[activeVariantKey];

          if (editedText === serverText) {
            outlineState = "hoverable";
          }
        }
      }
    }

    setElementOutline(element, outlineState);

    return wasUpdated;
  } else {
    const rendered = renderTranslation(key, params, currentLocale);

    const wasUpdated = element.textContent !== rendered;
    if (wasUpdated) {
      element.textContent = rendered;
    }

    if (element.dataset.paraglideEdited) {
      delete element.dataset.paraglideEdited;
    }

    const outlineState = window.__paraglideEditor.isOverlayEnabled?.()
      ? "hoverable"
      : "none";
    setElementOutline(element, outlineState);

    return wasUpdated;
  }
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
  const selector = `[data-paraglide-key="${key}"]`;
  const elements = document.querySelectorAll(selector);

  let updatedCount = 0;
  elements.forEach((element) => {
    if (refreshElement(element, currentLocale)) {
      updatedCount++;
    }
  });

  console.log(
    `[paraglide-editor] Refreshed ${updatedCount}/${elements.length} elements with key: ${key}`
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
  let mouseDownElement = null;
  let suppressNextClick = false;

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
        const isInsidePopup = e.target.closest(".pge-ignore-detection");
        if (
          !isInsidePopup &&
          !e.shiftKey &&
          currentPopupElement !== element
        ) {
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

      const upElement = e.target.closest("[data-paraglide-key]");

      // Check if mouseup is on the same element as mousedown
      if (upElement !== mouseDownElement) {
        mouseDownElement = null;
        return;
      }

      const element = upElement;

      // Reset stale reference if popup was removed (e.g. SPA navigation)
      if (currentPopupElement && !document.getElementById("pge-edit-popup")) {
        currentPopupElement = null;
      }

      if (currentPopupElement === element) {
        console.log(
          "[paraglide-editor] Popup already open for this element, allowing normal interaction"
        );
        mouseDownElement = null;
        return;
      }

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

      e.preventDefault();
      e.stopPropagation();

      // Set flag BEFORE any await so it's ready when the synchronous click event fires
      suppressNextClick = true;

      const key = element.dataset.paraglideKey;
      const params = element.dataset.paraglideParams
        ? JSON.parse(element.dataset.paraglideParams)
        : {};
      const currentText = element.textContent.trim();

      console.log("[paraglide-editor] Clicked translatable element:", {
        key,
        params,
        currentText,
      });

      currentPopupElement = element;
      mouseDownElement = null;

      await createEditPopup(element, key, params, currentText);

      // Watch for popup removal to re-enable normal clicks
      const popup = document.getElementById("pge-edit-popup");
      if (popup) {
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            for (const removed of mutation.removedNodes) {
              if (removed === popup || removed.contains?.(popup)) {
                currentPopupElement = null;
                observer.disconnect();
                console.log("[paraglide-editor] Popup closed, normal clicks enabled again");
                return;
              }
            }
          }
        });
        observer.observe(popup.parentNode, { childList: true });
      } else {
        currentPopupElement = null;
      }
    },
    true
  );

  window.__paraglideEditor = window.__paraglideEditor || {};
  window.__paraglideEditor.setOverlayMode = (enabled) => {
    overlayEnabled = enabled;
    localStorage.setItem("pge-overlay-enabled", enabled.toString());
    console.log(
      `[paraglide-editor] Overlay mode ${enabled ? "enabled" : "disabled"}`
    );

    applyOutlinesToAllElements();
  };

  window.__paraglideEditor.isOverlayEnabled = () => overlayEnabled;

  // Expose applySavedEdits for manual refresh (e.g., after locale change)
  window.__paraglideEditor.applySavedEdits = applySavedEdits;

  applySavedEdits();

  applyOutlinesToAllElements();

  console.log("[paraglide-editor] ✓ Overlay mode initialized");
}

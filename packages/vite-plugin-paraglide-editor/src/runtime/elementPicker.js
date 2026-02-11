/**
 * Element Picker — Pure element selection via click
 *
 * Purpose: Handle click events to determine which translatable element the user intended to select.
 *
 * Responsibilities:
 * - Listen for mousedown/mouseup/click and keyboard events
 * - Determine candidates at click point via document.elementsFromPoint
 * - Cycle through overlapping candidates using layer-based detection
 * - Handle Escape key to deselect the current element
 * - Emit a single `pge-element-picked` CustomEvent with { element, cyclePosition, cycleTotal }
 *
 * This module does NOT:
 * - Open popups or read translation slots
 * - Modify outlines or visual state
 * - Know about translations, locales, or the data store
 */

/**
 * @param {Element[]} a
 * @param {Element[]} b
 * @returns {boolean} True if both arrays contain the same elements in the same order
 */
function sameCandidates(a, b) {
  if (a.length !== b.length) return false;
  return a.every((el, i) => el === b[i]);
}

/**
 * Get all paraglide candidate elements at a given point, ordered by z-stacking (top first).
 * @param {number} x
 * @param {number} y
 * @returns {Element[]}
 */
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

/**
 * Initialize the element picker.
 *
 * @param {Object} options
 * @param {() => boolean} options.isOverlayEnabled - Returns whether overlay mode is currently on
 * @param {() => Element|null} options.getPopupElement - Returns the element the popup is currently open for (read-only)
 * @returns {{ resetCycle: () => void }}
 */
export function initElementPicker({ isOverlayEnabled, getPopupElement }) {
  let mouseDownElement = null;
  let suppressNextClick = false;

  // Layer-based cycle state
  let cycleCandidates = [];
  let cycleIndex = -1;

  function resetCycle() {
    cycleCandidates = [];
    cycleIndex = -1;
  }

  // Suppress the click event that fires after mouseup when we select an element.
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
      if (!isOverlayEnabled() || e.button !== 0) return;

      const element = e.target.closest("[data-paraglide-key]");
      if (element) {
        mouseDownElement = element;

        const isInsidePopup = e.target.closest(".pge-ignore-detection");
        if (isInsidePopup || e.shiftKey) return;

        // Check if the next click would pass through (cycle exhausted)
        const candidates = getCandidatesAtPoint(e.clientX, e.clientY);
        const popupElement = getPopupElement();
        let wouldPassThrough = false;

        if (sameCandidates(candidates, cycleCandidates)) {
          // Same layers — would pass through if cycle exhausted or single element already open
          if (popupElement && candidates.length === 1) {
            wouldPassThrough = true;
          } else if (cycleIndex + 1 >= candidates.length) {
            wouldPassThrough = true;
          }
        } else {
          // Different layers — would pass through only if single element already open
          if (popupElement && candidates.includes(popupElement) && candidates.length === 1) {
            wouldPassThrough = true;
          }
        }

        if (!wouldPassThrough) {
          e.preventDefault();
        }
      }
    },
    true
  );

  // Only handle selection if mouseup is on the same element as mousedown
  document.addEventListener(
    "mouseup",
    (e) => {
      if (!isOverlayEnabled() || !mouseDownElement || e.button !== 0) return;

      if (e.shiftKey) {
        console.log("[paraglide-editor] Shift+click detected, allowing normal interaction");
        mouseDownElement = null;
        return;
      }

      if (e.target.closest(".pge-ignore-detection")) {
        mouseDownElement = null;
        return;
      }

      const candidates = getCandidatesAtPoint(e.clientX, e.clientY);

      // Validate mousedown target is among candidates (prevents drag-across)
      if (!candidates.includes(mouseDownElement)) {
        mouseDownElement = null;
        return;
      }

      const popupElement = getPopupElement();

      // Reset stale reference if popup was removed (e.g. SPA navigation)
      const popupStale = popupElement && !document.getElementById("pge-edit-popup");

      let nextCycleIndex;

      if (sameCandidates(candidates, cycleCandidates) && !popupStale) {
        // Same layers — cycle or pass through
        if (popupElement && candidates.length === 1) {
          nextCycleIndex = -1; // Already open, deselect
        } else {
          const next = cycleIndex + 1;
          nextCycleIndex = next >= candidates.length ? -1 : next;
        }
      } else {
        // Different layers — fresh selection
        if (popupElement && !popupStale && candidates.includes(popupElement) && candidates.length === 1) {
          nextCycleIndex = -1; // Same single element, deselect
        } else if (popupElement && !popupStale && popupElement === candidates[0] && candidates.length > 1) {
          nextCycleIndex = 1; // Skip open, select next
        } else {
          nextCycleIndex = 0; // Select first
        }
      }

      const selectedElement = nextCycleIndex === -1 ? null : candidates[nextCycleIndex];

      if (selectedElement) {
        cycleCandidates = candidates;
        cycleIndex = nextCycleIndex;

        e.preventDefault();
        e.stopPropagation();
        suppressNextClick = true;
      } else {
        cycleCandidates = [];
        cycleIndex = -1;
        // Don't preventDefault — let native click fire through
      }

      mouseDownElement = null;

      document.dispatchEvent(
        new CustomEvent("pge-element-picked", {
          detail: {
            element: selectedElement,
            cyclePosition: selectedElement ? nextCycleIndex + 1 : 0,
            cycleTotal: candidates.length,
          },
        })
      );
    },
    true
  );

  // Escape key deselects the current element
  document.addEventListener("keydown", (e) => {
    if (!isOverlayEnabled()) return;
    if (e.key !== "Escape") return;

    const popupElement = getPopupElement();
    if (!popupElement) return;

    resetCycle();

    document.dispatchEvent(
      new CustomEvent("pge-element-picked", {
        detail: { element: null, cyclePosition: 0, cycleTotal: 0 },
      })
    );
  });

  return { resetCycle };
}

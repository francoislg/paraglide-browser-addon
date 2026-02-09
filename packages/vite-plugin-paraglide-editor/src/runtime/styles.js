/**
 * Visual Styling for Translation Elements
 *
 * Purpose: Manage visual indicators (overlays) for translation elements.
 *
 * Responsibilities:
 * - Inject global CSS for overlay styles using ::after pseudo-elements
 * - Apply overlay classes based on element state
 * - Support multiple states: edited, conflict, hoverable
 * - Provide consistent visual feedback across the application
 * - Single point of entry for all element styling
 *
 * Visual States:
 * - hoverable: Yellow dashed border (1px) via ::after - overlay mode active, not edited
 * - edited: Green solid border (2px) via ::after - translation has been edited locally
 * - conflict: Red solid border (2px) via ::after - conflict between local and server
 * - none: No overlay class - removes all overlay styling
 *
 * Implementation:
 * - Uses CSS classes with ::after pseudo-elements instead of inline styles
 * - Adds position: relative to parent element for ::after positioning
 * - ::after overlays use position: absolute + inset: 0 to cover entire element
 * - pointer-events: none on ::after to not interfere with click handling
 *
 * This module does NOT:
 * - Manage element registry (see registry.js)
 * - Render translations (see renderer.js)
 * - Handle UI components (see ui/)
 */

/**
 * Inject global CSS styles for overlays
 * Called during initialization
 */
export function injectOverlayStyles() {
  // Check if styles already injected
  if (document.getElementById('pge-overlay-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'pge-overlay-styles';
  style.textContent = `
    /* Hoverable state - yellow dashed border (overlay mode active, not edited) */
    .pge-overlay-hoverable {
      position: relative !important;
      cursor: pointer !important;
    }
    .pge-overlay-hoverable::after {
      content: '';
      position: absolute;
      inset: -3px;
      border: 2px dashed #d97706;
      background: rgba(251, 191, 36, 0.15);
      pointer-events: none;
      z-index: 999997;
      box-sizing: border-box;
      border-radius: 2px;
    }

    /* Edited state - green solid border (translation edited locally) */
    .pge-overlay-edited {
      position: relative !important;
      cursor: pointer !important;
    }
    .pge-overlay-edited::after {
      content: '';
      position: absolute;
      inset: -3px;
      border: 2px solid #16a34a;
      background: rgba(34, 197, 94, 0.15);
      pointer-events: none;
      z-index: 999997;
      box-sizing: border-box;
      border-radius: 2px;
    }

    /* Conflict state - red solid border (conflict detected) */
    .pge-overlay-conflict {
      position: relative !important;
      cursor: pointer !important;
    }
    .pge-overlay-conflict::after {
      content: '';
      position: absolute;
      inset: -3px;
      border: 2px solid #dc2626;
      background: rgba(239, 68, 68, 0.15);
      pointer-events: none;
      z-index: 999997;
      box-sizing: border-box;
      border-radius: 2px;
    }
  `;

  document.head.appendChild(style);
  console.log('[paraglide-editor] ✓ Overlay styles injected');
}

/**
 * Set the overlay style for an element based on its state
 * This is the single point of entry for modifying element overlays
 *
 * @param {HTMLElement} element - The element to style
 * @param {string} state - The state: 'edited', 'conflict', 'hoverable', 'none'
 */
export function setElementOutline(element, state) {
  // Remove all existing overlay classes
  element.classList.remove('pge-overlay-hoverable', 'pge-overlay-edited', 'pge-overlay-conflict');

  // Add appropriate class based on state
  switch (state) {
    case 'edited':
      element.classList.add('pge-overlay-edited');
      break;
    case 'conflict':
      element.classList.add('pge-overlay-conflict');
      break;
    case 'hoverable':
      element.classList.add('pge-overlay-hoverable');
      break;
    case 'none':
      // Just remove all classes (already done above)
      break;
    default:
      console.warn(`[paraglide-editor] Unknown outline state: ${state}`);
  }
}

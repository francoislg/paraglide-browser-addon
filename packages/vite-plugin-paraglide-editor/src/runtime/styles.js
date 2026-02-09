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
 * - Adds position: relative only to static elements (.pge-positioned) for ::after positioning
 * - Fixed/absolute/sticky elements are already positioned and don't need it
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
    /* Only added to elements with position:static so ::after has a positioned ancestor */
    .pge-positioned { position: relative !important; }

    /* Hoverable state - yellow dashed border (overlay mode active, not edited) */
    .pge-overlay-hoverable {
      cursor: pointer !important;
    }
    .pge-overlay-hoverable::after {
      content: '';
      position: absolute;
      inset: -3px;
      border: 2px dashed #d97706;
      background: rgba(251, 191, 36, 0.08);
      pointer-events: none;
      z-index: 999997;
      box-sizing: border-box;
      border-radius: 2px;
      transition: background 0.15s, border-color 0.15s;
    }
    .pge-overlay-hoverable:hover::after {
      background: rgba(251, 191, 36, 0.3);
      border-color: #b45309;
    }

    /* Edited state - green solid border (translation edited locally) */
    .pge-overlay-edited {
      cursor: pointer !important;
    }
    .pge-overlay-edited::after {
      content: '';
      position: absolute;
      inset: -3px;
      border: 2px solid #16a34a;
      background: rgba(34, 197, 94, 0.08);
      pointer-events: none;
      z-index: 999997;
      box-sizing: border-box;
      border-radius: 2px;
      transition: background 0.15s, border-color 0.15s;
    }
    .pge-overlay-edited:hover::after {
      background: rgba(34, 197, 94, 0.3);
      border-color: #15803d;
    }

    /* Conflict state - red solid border (conflict detected) */
    .pge-overlay-conflict {
      cursor: pointer !important;
    }
    .pge-overlay-conflict::after {
      content: '';
      position: absolute;
      inset: -3px;
      border: 2px solid #dc2626;
      background: rgba(239, 68, 68, 0.08);
      pointer-events: none;
      z-index: 999997;
      box-sizing: border-box;
      border-radius: 2px;
      transition: background 0.15s, border-color 0.15s;
    }
    .pge-overlay-conflict:hover::after {
      background: rgba(239, 68, 68, 0.3);
      border-color: #b91c1c;
    }
  `;

  document.head.appendChild(style);
  setOnTopMode(isOnTopEnabled());
  console.log('[paraglide-editor] ✓ Overlay styles injected');
}

/**
 * Check if "always on top" mode is enabled in localStorage
 */
export function isOnTopEnabled() {
  return localStorage.getItem('pge-on-top') === 'true';
}

/**
 * Enable or disable the "always on top" z-index boost for overlay elements
 */
export function setOnTopMode(enabled) {
  localStorage.setItem('pge-on-top', enabled);
  const existing = document.getElementById('pge-on-top-styles');
  if (enabled && !existing) {
    const style = document.createElement('style');
    style.id = 'pge-on-top-styles';
    style.textContent = `
      .pge-overlay-hoverable,
      .pge-overlay-edited,
      .pge-overlay-conflict {
        z-index: 999997 !important;
      }
    `;
    document.head.appendChild(style);
  } else if (!enabled && existing) {
    existing.remove();
  }
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
  element.classList.remove('pge-overlay-hoverable', 'pge-overlay-edited', 'pge-overlay-conflict', 'pge-positioned');

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
      return;
    default:
      console.warn(`[paraglide-editor] Unknown outline state: ${state}`);
      return;
  }

  // Only static elements need position:relative for the ::after pseudo-element.
  // Fixed, absolute, sticky, and relative elements are already positioned.
  if (getComputedStyle(element).position === 'static') {
    element.classList.add('pge-positioned');
  }
}

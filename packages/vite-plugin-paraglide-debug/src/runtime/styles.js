/**
 * Visual Styling for Translation Elements
 *
 * Purpose: Manage visual indicators (outlines) for translation elements.
 *
 * Responsibilities:
 * - Apply outline styles based on element state
 * - Support multiple states: edited, conflict, hoverable, none
 * - Provide consistent visual feedback across the application
 * - Single point of entry for all element styling
 *
 * Visual States:
 * - edited: Green outline (2px solid) - translation has been edited locally
 * - conflict: Red outline (2px solid) - conflict between local and server
 * - hoverable: Yellow dashed outline (1px) - overlay mode active
 * - none: No outline - default state
 *
 * This module does NOT:
 * - Manage element registry (see registry.js)
 * - Render translations (see renderer.js)
 * - Handle UI components (see ui/)
 */

/**
 * Set the outline style for an element based on its state
 * This is the single point of entry for modifying element overlays
 * @param {HTMLElement} element - The element to style
 * @param {string} state - The state: 'edited', 'conflict', 'hoverable', 'none'
 */
export function setElementOutline(element, state) {
  switch (state) {
    case 'edited':
      element.style.outline = '2px solid #48bb78'; // Green for edited
      element.style.cursor = 'pointer';
      break;
    case 'conflict':
      element.style.outline = '2px solid #f56565'; // Red for conflicts
      element.style.cursor = 'pointer';
      break;
    case 'hoverable':
      element.style.outline = '1px dashed #f59e0b'; // Yellow for overlay mode
      element.style.cursor = 'pointer';
      break;
    case 'none':
      element.style.outline = '';
      element.style.cursor = '';
      break;
    default:
      console.warn(`[paraglide-debug] Unknown outline state: ${state}`);
  }
}

/**
 * Popup Positioning
 *
 * Smart positioning logic for popup elements
 * Ensures popups stay within viewport bounds
 */

/**
 * Calculate horizontal position to keep popup within viewport
 *
 * @param {DOMRect} anchorRect - Anchor element bounding rect
 * @param {number} popupWidth - Popup width
 * @param {number} viewportWidth - Viewport width
 * @param {number} margin - Minimum margin from viewport edges
 * @returns {number} Left offset (relative to anchor)
 */
function calculateHorizontalPosition(anchorRect, popupWidth, viewportWidth, margin) {
  let left = 0;

  const popupRightEdge = anchorRect.left + left + popupWidth;
  if (popupRightEdge > viewportWidth - margin) {
    left = viewportWidth - anchorRect.left - popupWidth - margin;
  }

  const popupLeftEdge = anchorRect.left + left;
  if (popupLeftEdge < margin) {
    left = margin - anchorRect.left;
  }

  return left;
}

/**
 * Calculate vertical position to keep popup within viewport
 *
 * @param {DOMRect} rect - Element bounding rect (the clicked element)
 * @param {number} popupHeight - Popup height
 * @param {number} viewportHeight - Viewport height
 * @param {number} margin - Minimum margin from viewport edges
 * @returns {number} Top offset (relative to anchor)
 */
function calculateVerticalPosition(rect, popupHeight, viewportHeight, margin) {
  const spaceBelow = viewportHeight - rect.bottom;
  const spaceAbove = rect.top;

  let top;

  if (spaceBelow >= popupHeight + margin) {
    top = rect.height + 8;
  } else if (spaceAbove >= popupHeight + margin) {
    top = -popupHeight - 8;
  } else {
    if (spaceBelow > spaceAbove) {
      top = rect.height + 8;
    } else {
      top = -popupHeight - 8;
    }
  }

  return top;
}

/**
 * Apply final boundary checks to ensure popup stays in viewport
 *
 * @param {number} top - Calculated top position
 * @param {DOMRect} anchorRect - Anchor element bounding rect
 * @param {number} popupHeight - Popup height
 * @param {number} viewportHeight - Viewport height
 * @param {number} margin - Minimum margin from viewport edges
 * @returns {number} Adjusted top position
 */
function applyBoundaryChecks(top, anchorRect, popupHeight, viewportHeight, margin) {
  const popupTopInViewport = anchorRect.top + top;
  if (popupTopInViewport < margin) {
    top = margin - anchorRect.top;
  }

  const popupBottomInViewport = anchorRect.top + top + popupHeight;
  if (popupBottomInViewport > viewportHeight - margin) {
    top = viewportHeight - margin - anchorRect.top - popupHeight;
  }

  return top;
}

/**
 * Position popup near an element with smart viewport handling
 * Ensures popup stays within viewport bounds
 *
 * @param {HTMLElement} popup - Popup element
 * @param {HTMLElement} anchor - Anchor element (positioned near clicked element)
 * @param {HTMLElement} element - The clicked element
 * @param {Object} options - Positioning options
 * @param {number} options.margin - Minimum margin from viewport edges (default: 16)
 * @param {number} options.offset - Offset from element (default: 8)
 * @returns {Object} Position {top, left}
 *
 * @example
 * const position = positionPopup(popup, anchor, clickedElement);
 * Object.assign(popup.style, position);
 */
export function positionPopup(popup, anchor, element, options = {}) {
  const { margin = 16, offset = 8 } = options;

  const rect = element.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();
  const anchorRect = anchor.getBoundingClientRect();

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const popupWidth = popupRect.width;
  const popupHeight = popupRect.height;

  const left = calculateHorizontalPosition(anchorRect, popupWidth, viewportWidth, margin);

  let top = calculateVerticalPosition(rect, popupHeight, viewportHeight, margin);

  top = applyBoundaryChecks(top, anchorRect, popupHeight, viewportHeight, margin);

  return {
    top: `${top}px`,
    left: `${left}px`
  };
}

/**
 * Setup anchor element near clicked element
 * Anchor is positioned at the element's location in the document
 *
 * @param {HTMLElement} anchor - Anchor element
 * @param {HTMLElement} element - Clicked element
 */
export function setupAnchor(anchor, element) {
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

  anchor.style.top = `${rect.top + scrollTop}px`;
  anchor.style.left = `${rect.left + scrollLeft}px`;
}

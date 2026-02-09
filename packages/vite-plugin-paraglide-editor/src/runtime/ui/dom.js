/**
 * DOM Utility Functions
 *
 * Common patterns for creating, managing, and cleaning up DOM elements
 * Used across all UI components (popup, modal, conflictList, etc.)
 */

/**
 * Create or replace an element with given ID
 * Removes existing element with same ID if present
 *
 * @param {string} tagName - Element tag name (e.g., 'div', 'button')
 * @param {string} id - Element ID
 * @param {HTMLElement} parent - Parent element (defaults to document.body)
 * @returns {HTMLElement} The created element
 *
 * @example
 * const popup = createOrReplaceElement('div', 'pge-edit-popup');
 */
export function createOrReplaceElement(tagName, id, parent = document.body) {
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }

  const element = document.createElement(tagName);
  element.id = id;
  parent.appendChild(element);

  return element;
}

/**
 * Get translation metadata from element
 * Safely parses data attributes
 *
 * @param {HTMLElement} element - Element with data-paraglide-* attributes
 * @returns {Object} Metadata object with key, params, isEdited
 *
 * @example
 * const { key, params, isEdited } = getTranslationMetadata(element);
 * // { key: 'greeting', params: {name: 'John'}, isEdited: true }
 */
export function getTranslationMetadata(element) {
  const key = element.dataset.paraglideKey;

  let params = {};
  if (element.dataset.paraglideParams) {
    try {
      params = JSON.parse(element.dataset.paraglideParams);
    } catch (e) {
      console.warn('[paraglide-editor] Failed to parse params:', e);
    }
  }

  const isEdited = element.dataset.paraglideEdited === 'true';

  return { key, params, isEdited };
}

/**
 * Set translation metadata on element
 *
 * @param {HTMLElement} element - Target element
 * @param {Object} metadata - Metadata to set
 * @param {string} metadata.key - Translation key
 * @param {Object} metadata.params - Translation parameters
 * @param {boolean} metadata.isEdited - Whether translation is edited
 *
 * @example
 * setTranslationMetadata(element, {
 *   key: 'greeting',
 *   params: {name: 'John'},
 *   isEdited: true
 * });
 */
export function setTranslationMetadata(element, { key, params, isEdited }) {
  if (key) {
    element.dataset.paraglideKey = key;
  }

  if (params && Object.keys(params).length > 0) {
    element.dataset.paraglideParams = JSON.stringify(params);
  } else {
    delete element.dataset.paraglideParams;
  }

  if (isEdited) {
    element.dataset.paraglideEdited = 'true';
  } else {
    delete element.dataset.paraglideEdited;
  }
}

/**
 * Setup ESC key handler
 * Returns cleanup function
 *
 * @param {Function} callback - Function to call when ESC is pressed
 * @returns {Function} Cleanup function to remove listener
 *
 * @example
 * const cleanup = setupEscapeKey(() => popup.remove());
 * // Later: cleanup();
 */
export function setupEscapeKey(callback) {
  const handler = (e) => {
    if (e.key === 'Escape') {
      callback();
    }
  };

  document.addEventListener('keydown', handler);

  return () => {
    document.removeEventListener('keydown', handler);
  };
}

/**
 * Setup click-outside handler
 * Returns cleanup function
 *
 * @param {HTMLElement} element - Element to check clicks against
 * @param {Function} callback - Function to call when clicking outside
 * @param {number} delay - Delay before activating handler (prevents immediate close)
 * @returns {Function} Cleanup function to remove listener
 *
 * @example
 * const cleanup = setupClickOutside(popup, () => popup.remove());
 * // Later: cleanup();
 */
export function setupClickOutside(element, callback, delay = 100) {
  let cleanupFn;

  const handler = (e) => {
    if (!element.contains(e.target)) {
      callback();
    }
  };

  // Add delay to prevent immediate closure from the click that opened the popup
  setTimeout(() => {
    document.addEventListener('click', handler, true);
    cleanupFn = () => document.removeEventListener('click', handler, true);
  }, delay);

  return () => cleanupFn?.();
}

/**
 * Create a combined cleanup function
 * Calls all cleanup functions when invoked
 *
 * @param {...Function} cleanups - Cleanup functions to combine
 * @returns {Function} Combined cleanup function
 *
 * @example
 * const cleanup = createCleanup(
 *   setupEscapeKey(() => close()),
 *   setupClickOutside(popup, () => close()),
 *   () => popup.remove()
 * );
 * // Later: cleanup(); // Calls all cleanup functions
 */
export function createCleanup(...cleanups) {
  return () => {
    cleanups.forEach(cleanup => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    });
  };
}

/**
 * Focus first input/textarea in element
 * Useful after creating popups/modals
 *
 * @param {HTMLElement} element - Container element
 * @param {string} selector - CSS selector for focusable elements
 *
 * @example
 * focusFirstInput(popup, '.pge-edit-textarea');
 */
export function focusFirstInput(element, selector = 'input, textarea, [contenteditable]') {
  const firstInput = element.querySelector(selector);
  if (firstInput) {
    firstInput.focus();
    if (typeof firstInput.select === 'function') {
      firstInput.select();
    }
  }
}

/**
 * Create element from HTML string
 * Useful for creating complex structures
 *
 * @param {string} html - HTML string
 * @returns {HTMLElement} Created element
 *
 * @example
 * const div = createElementFromHTML('<div class="foo">bar</div>');
 */
export function createElementFromHTML(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstChild;
}

/**
 * Escape HTML to prevent XSS
 *
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>') // '&lt;script&gt;...'
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Truncate text to max length
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add when truncated (default: '...')
 * @returns {string} Truncated text
 *
 * @example
 * truncate('Hello world', 5) // 'Hello...'
 */
export function truncate(text, maxLength, suffix = '...') {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + suffix;
}

/**
 * Element Registry Management
 *
 * Purpose: Track which DOM elements contain translations and maintain their metadata.
 *
 * Responsibilities:
 * - Build registry of translation elements by matching text nodes to translation keys
 * - Add data attributes to elements for tracking (data-paraglide-key, data-paraglide-params)
 * - Support multi-slot elements (text + attributes) via data-paraglide-slots
 * - Provide API to query registry and get current elements
 * - Handle registry rebuilds on DOM mutations
 *
 * This module does NOT:
 * - Render or update element content (see renderer.js and overlay.js)
 * - Manage visual styles (see styles.js)
 * - Handle translations or variants (see renderer.js and variants.js)
 */

/**
 * Read all translation slots from an element.
 * Returns a map of slotName → { key, params }.
 * Single-slot elements use data-paraglide-key/attr/params.
 * Multi-slot elements additionally have data-paraglide-slots JSON.
 *
 * @param {HTMLElement} element
 * @returns {Object|null} Map of slot name → { key, params }, or null if not a translation element
 */
export function getElementSlots(element) {
  if (element.dataset.paraglideSlots) {
    try {
      return JSON.parse(element.dataset.paraglideSlots);
    } catch (e) {
      console.warn('[paraglide-editor] Failed to parse paraglide-slots:', e);
    }
  }
  const key = element.dataset.paraglideKey;
  if (!key) return null;
  const attr = element.dataset.paraglideAttr || null;
  const params = element.dataset.paraglideParams
    ? JSON.parse(element.dataset.paraglideParams)
    : {};
  const slotName = attr || '_text';
  return { [slotName]: { key, params } };
}

/**
 * Build element registry by matching text nodes to registry
 * Adds data attributes to elements for tracking
 *
 * @returns {Promise<void>}
 */
export async function buildElementRegistry() {
  if (!window.__paraglideEditor.registry) {
    console.log("[paraglide-editor] Registry not found, waiting for __paraglideInitialized event");
    return;
  }

  const registry = [];
  // Accumulate slots per element across both passes
  const elementSlots = new Map();

  // --- Pass 1: text nodes ---
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parent = node.parentElement?.tagName;
        if (parent === "SCRIPT" || parent === "STYLE") {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  let textNode;
  while ((textNode = walker.nextNode())) {
    const text = textNode.textContent.trim();
    if (!text) continue;

    const metadata = window.__paraglideEditor.registry.get(text);
    if (metadata) {
      const element = textNode.parentElement;

      if (element && !element.closest('.pge-ignore-detection')) {
        // Add _text slot (skip if already has one — first text node wins)
        if (!elementSlots.has(element)) {
          elementSlots.set(element, {});
        }
        const slots = elementSlots.get(element);
        if (!slots._text) {
          slots._text = {
            key: metadata.key,
            params: metadata.params && Object.keys(metadata.params).length > 0
              ? metadata.params
              : {}
          };
        }

        registry.push({
          element: element,
          textNode: textNode,
          text: text,
          key: metadata.key,
          params: metadata.params,
        });
      }
    }
  }

  // --- Pass 2: translatable attributes ---
  const TRANSLATABLE_ATTRS = ['placeholder', 'title', 'alt', 'aria-label'];
  const attrElements = document.querySelectorAll(
    'input[placeholder], textarea[placeholder], [title], img[alt], [aria-label]'
  );

  attrElements.forEach((element) => {
    if (element.closest('.pge-ignore-detection')) return;

    for (const attr of TRANSLATABLE_ATTRS) {
      const value = element.getAttribute(attr);
      if (!value) continue;

      const trimmed = value.trim();
      const metadata = window.__paraglideEditor.registry.get(trimmed);
      if (metadata) {
        if (!elementSlots.has(element)) {
          elementSlots.set(element, {});
        }
        const slots = elementSlots.get(element);
        // Skip if this attr slot already exists
        if (!slots[attr]) {
          slots[attr] = {
            key: metadata.key,
            params: metadata.params && Object.keys(metadata.params).length > 0
              ? metadata.params
              : {}
          };
        }

        registry.push({
          element: element,
          textNode: null,
          text: trimmed,
          key: metadata.key,
          params: metadata.params,
          attr: attr,
        });
        break; // one attr match per element per pass (first match wins)
      }
    }
  });

  // --- Apply data attributes based on accumulated slots ---
  for (const [element, slots] of elementSlots) {
    const slotNames = Object.keys(slots);
    if (slotNames.length === 0) continue;

    // Pick primary slot: prefer _text, fallback to first attr
    const primarySlotName = slots._text ? '_text' : slotNames[0];
    const primarySlot = slots[primarySlotName];

    element.dataset.paraglideKey = primarySlot.key;

    if (primarySlotName !== '_text') {
      element.dataset.paraglideAttr = primarySlotName;
    } else {
      delete element.dataset.paraglideAttr;
    }

    if (primarySlot.params && Object.keys(primarySlot.params).length > 0) {
      element.dataset.paraglideParams = JSON.stringify(primarySlot.params);
    } else {
      delete element.dataset.paraglideParams;
    }

    // Multi-slot: set data-paraglide-slots JSON
    if (slotNames.length > 1) {
      element.dataset.paraglideSlots = JSON.stringify(slots);
    } else {
      delete element.dataset.paraglideSlots;
    }
  }

  window.__paraglideEditor.elements = registry;
  console.log(
    `[paraglide-editor] Found ${registry.length} translated elements`
  );

  if (registry.length > 0) {
    console.debug("[paraglide-editor] Sample elements:", registry.slice(0, 3));
  }
}

/**
 * Get current (fresh) elements with translations
 * Re-queries the DOM for elements with data-paraglide-key
 *
 * @returns {Array<Object>} Array of element objects with translation metadata
 */
export function getElements() {
  const elements = Array.from(
    document.querySelectorAll("[data-paraglide-key]")
  ).map((el) => {
    const attr = el.dataset.paraglideAttr || null;
    return {
      element: el,
      key: el.dataset.paraglideKey,
      params: el.dataset.paraglideParams
        ? JSON.parse(el.dataset.paraglideParams)
        : {},
      text: attr
        ? (el.getAttribute(attr) || '').trim()
        : el.textContent.trim(),
      attr,
    };
  });

  console.log(
    `[paraglide-editor] Found ${elements.length} elements via data attributes`
  );
  return elements;
}

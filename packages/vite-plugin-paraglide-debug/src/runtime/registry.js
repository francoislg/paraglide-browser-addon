/**
 * Element Registry Management
 *
 * Purpose: Track which DOM elements contain translations and maintain their metadata.
 *
 * Responsibilities:
 * - Build registry of translation elements by matching text nodes to translation keys
 * - Add data attributes to elements for tracking (data-paraglide-key, data-paraglide-params)
 * - Provide API to query registry and get current elements
 * - Handle registry rebuilds on DOM mutations
 *
 * This module does NOT:
 * - Render or update element content (see renderer.js and overlay.js)
 * - Manage visual styles (see styles.js)
 * - Handle translations or variants (see renderer.js and variants.js)
 */

/**
 * Build element registry by matching text nodes to registry
 * Adds data attributes to elements for tracking
 *
 * @returns {Promise<void>}
 */
export async function buildElementRegistry() {
  if (!window.__paraglideBrowserDebug.registry) {
    console.log("[paraglide-debug] Registry not found, waiting for __paraglideInitialized event");
    return;
  }

  const registry = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // Skip script/style tags
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

    const metadata = window.__paraglideBrowserDebug.registry.get(text);
    if (metadata) {
      const element = textNode.parentElement;

      // Add data attributes to element so we can re-find it after framework re-renders
      // IMPORTANT: Skip elements inside the edit popup to prevent interference
      if (element && !element.dataset.paraglideKey) {
        // Check if element is inside the popup
        const isInsidePopup = element.closest('#pg-edit-anchor, #pg-edit-popup');
        if (!isInsidePopup) {
          element.dataset.paraglideKey = metadata.key;
          if (metadata.params && Object.keys(metadata.params).length > 0) {
            element.dataset.paraglideParams = JSON.stringify(metadata.params);
          }

          // Don't add outline here - only add outline for edited translations or when overlay mode is enabled
        }
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

  window.__paraglideBrowserDebug.elements = registry;
  console.log(
    `[paraglide-debug] Found ${registry.length} translated elements`
  );

  // Log details for debugging
  if (registry.length > 0) {
    console.debug("[paraglide-debug] Sample elements:", registry.slice(0, 3));
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
  ).map((el) => ({
    element: el,
    key: el.dataset.paraglideKey,
    params: el.dataset.paraglideParams
      ? JSON.parse(el.dataset.paraglideParams)
      : {},
    text: el.textContent.trim(),
  }));

  console.log(
    `[paraglide-debug] Found ${elements.length} elements via data attributes`
  );
  return elements;
}

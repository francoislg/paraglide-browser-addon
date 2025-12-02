/**
 * Paraglide Browser Debug Runtime
 *
 * This script tracks translated elements in the DOM by:
 * 1. Reading from window.__paraglideBrowserDebug.registry (populated by wrapped message functions)
 * 2. Scanning text nodes to match translations
 * 3. Adding data-paraglide-key attributes to elements
 * 4. Exposing APIs for browser extensions to query elements
 */

(function() {
  // Only run if VITE_PARAGLIDE_BROWSER_DEBUG is enabled
  if (typeof window === 'undefined') return;

  console.log('[paraglide-debug] Runtime script loaded');

  // Initialize namespace
  window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};

  // Build element registry by matching text nodes to registry
  function buildElementRegistry() {
    if (!window.__paraglideBrowserDebug.registry) {
      console.log('[paraglide-debug] Registry not found');
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
          if (parent === 'SCRIPT' || parent === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let textNode;
    while (textNode = walker.nextNode()) {
      const text = textNode.textContent.trim();
      if (!text) continue;

      const metadata = window.__paraglideBrowserDebug.registry.get(text);
      if (metadata) {
        const element = textNode.parentElement;

        // Add data attributes to element so we can re-find it after framework re-renders
        if (element && !element.dataset.paraglideKey) {
          element.dataset.paraglideKey = metadata.key;
          if (metadata.params && Object.keys(metadata.params).length > 0) {
            element.dataset.paraglideParams = JSON.stringify(metadata.params);
          }

          // Add visual outline to show detected translations
          element.style.outline = '1px solid yellow';
        }

        registry.push({
          element: element,
          textNode: textNode,
          text: text,
          key: metadata.key,
          params: metadata.params
        });
      }
    }

    window.__paraglideBrowserDebug.elements = registry;
    console.log(`[paraglide-debug] Found ${registry.length} translated elements`);

    // Log details for debugging
    if (registry.length > 0) {
      console.log('[paraglide-debug] Sample elements:', registry.slice(0, 3));
    }
  }

  // Debounced re-scan on DOM mutations
  let scanTimeout;
  const observer = new MutationObserver(() => {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(buildElementRegistry, 100);
  });

  // Initial scan on page load
  function initialize() {
    console.log('[paraglide-debug] Initializing element tracking');
    buildElementRegistry();

    // Start observing DOM changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // Run on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Expose API methods
  window.__paraglideBrowserDebug.refresh = buildElementRegistry;

  // Helper: Get current (fresh) elements with translations
  // This re-queries the DOM for elements with data-paraglide-key
  window.__paraglideBrowserDebug.getElements = function() {
    const elements = Array.from(
      document.querySelectorAll('[data-paraglide-key]')
    ).map(el => ({
      element: el,
      key: el.dataset.paraglideKey,
      params: el.dataset.paraglideParams ? JSON.parse(el.dataset.paraglideParams) : {},
      text: el.textContent.trim()
    }));

    console.log(`[paraglide-debug] Found ${elements.length} elements via data attributes`);
    return elements;
  };
})();

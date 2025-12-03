/**
 * Paraglide Browser Debug Runtime
 *
 * This script provides:
 * 1. Element tracking: Match translations to DOM elements
 * 2. Translation editor: In-browser UI for editing translations
 * 3. IndexedDB storage: Persist edits locally
 * 4. Export functionality: Download modified translations
 */

// Import modular components
import { initialize } from "./runtime/initialize.js";
import { initDB, getAllEditedTranslations } from "./runtime/db.js";
import { createFloatingButton, showEditorModal } from "./runtime/ui.js";
import { initOverlayMode, refreshElement } from "./runtime/overlay.js";
import { initLanguageDetection, getCurrentLocale } from "./runtime/languageDetection.js";
import { setElementOutline } from "./runtime/styles.js";

(function () {
  // Only run if VITE_PARAGLIDE_BROWSER_DEBUG is enabled
  if (typeof window === "undefined") return;

  console.log("[paraglide-debug] Runtime script loaded");
  console.log("[paraglide-debug] Translation editor enabled");

  // Initialize namespace
  window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};

  // Initialize language detection system
  initLanguageDetection();

  // Listen for debug initialization complete event
  // This fires after DB, data store, and registry are all ready
  window.addEventListener('__paraglideDebugInitialized', async (e) => {
    console.log('[paraglide-debug] Received __paraglideDebugInitialized event, data fully loaded');
    console.log('[paraglide-debug] Initialization details:', e.detail);
    await buildElementRegistry();

    // Initialize overlay mode AFTER registry is built and elements have data attributes
    initOverlayMode();
    console.log('[paraglide-debug] ✓ Overlay mode initialized after element registry');
  });

  // Build element registry by matching text nodes to registry
  async function buildElementRegistry() {
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

    // Apply saved edits from database after building registry
    await applySavedEditsFromDB();
  }

  // Apply saved edits from database to DOM
  // This now uses the refreshElement from overlay.js which handles proper rendering
  async function applySavedEditsFromDB() {
    try {
      // Get current locale
      const currentLocale = getCurrentLocale();
      console.debug('[paraglide-debug] applySavedEditsFromDB: Current locale =', currentLocale);

      // Get all edited translations for current locale
      const editedTranslations = await getAllEditedTranslations(currentLocale);
      console.debug('[paraglide-debug] applySavedEditsFromDB: Loaded edits from DB:', editedTranslations);

      if (editedTranslations.length === 0) {
        console.debug('[paraglide-debug] No saved edits found for locale:', currentLocale);
        return;
      }

      console.debug(`[paraglide-debug] Applying ${editedTranslations.length} saved edits to page content`);

      // Find all elements with translation keys and update them
      const elements = document.querySelectorAll('[data-paraglide-key]');
      console.debug(`[paraglide-debug] Found ${elements.length} elements with data-paraglide-key attribute`);

      let appliedCount = 0;
      elements.forEach(element => {
        // Use refreshElement from overlay.js which handles proper rendering with dataStore
        const wasUpdated = refreshElement(element, currentLocale);
        if (wasUpdated) {
          appliedCount++;
        }
      });

      console.log(`[paraglide-debug] ✓ Applied ${appliedCount} saved edits to page (expected ${editedTranslations.length})`);
    } catch (error) {
      console.error('[paraglide-debug] Failed to apply saved edits:', error);
    }
  }

  // Listen for language change events and re-apply saved edits
  window.addEventListener('__paraglideDebugLanguageChange', async (e) => {
    console.log('[paraglide-debug] Handling language change event:', e.detail);
    await applySavedEditsFromDB();
  });

  // Debounced re-scan on DOM mutations
  let scanTimeout;
  const observer = new MutationObserver(() => {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(buildElementRegistry, 100);
  });

  // Start initialization on page load
  async function startInitialization() {
    console.log("[paraglide-debug] Starting initialization...");

    // Start the master initialization coordinator
    // This will load DB, data store, wait for registry, and emit __paraglideDebugInitialized
    await initialize();

    // Start observing DOM changes after initialization
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  // Run on page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startInitialization);
  } else {
    startInitialization();
  }

  // Expose API methods
  window.__paraglideBrowserDebug.refresh = buildElementRegistry;
  window.__paraglideBrowserDebug.refreshElement = refreshElement;
  window.__paraglideBrowserDebug.setElementOutline = setElementOutline;

  // Helper: Get current (fresh) elements with translations
  // This re-queries the DOM for elements with data-paraglide-key
  window.__paraglideBrowserDebug.getElements = function () {
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
  };

  // ============================================================================
  // TRANSLATION EDITOR
  // ============================================================================

  // Initialize editor UI components
  async function initEditor() {
    try {
      // Note: DB and overlay mode are initialized in the proper sequence above
      // This function just creates the UI components

      // Create floating button
      createFloatingButton(() => showEditorModal());
    } catch (error) {
      console.error("[paraglide-debug] Failed to initialize editor:", error);
    }
  }

  // Initialize editor after element tracking is set up
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEditor);
  } else {
    setTimeout(initEditor, 100); // Small delay to ensure tracking is initialized
  }
})();

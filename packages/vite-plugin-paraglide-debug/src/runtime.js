/**
 * Paraglide Browser Debug Runtime - Main Entry Point
 *
 * Purpose: Initialize and coordinate the translation debug system.
 *
 * Responsibilities:
 * - Initialize all debug subsystems in correct order
 * - Set up DOM mutation observers
 * - Listen for debug events and coordinate responses
 * - Expose public API on window.__paraglideBrowserDebug
 *
 * This module does NOT:
 * - Manage element registry (see registry.js)
 * - Render translations (see renderer.js, overlay.js)
 * - Handle UI components (see ui/)
 * - Store data (see db.js, dataStore.js)
 */

// Import modular components
import { initialize } from "./runtime/initialize.js";
import { initDB } from "./runtime/db.js";
import { createFloatingButton, showEditorModal } from "./runtime/ui.js";
import { initOverlayMode, refreshElement, applySavedEditsFromDB } from "./runtime/overlay.js";
import { initLanguageDetection, getCurrentLocale } from "./runtime/languageDetection.js";
import { setElementOutline } from "./runtime/styles.js";
import { buildElementRegistry, getElements } from "./runtime/registry.js";

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

    // Build element registry (from registry.js)
    await buildElementRegistry();

    // Apply saved edits from database (from overlay.js)
    await applySavedEditsFromDB();

    // Initialize overlay mode AFTER registry is built and elements have data attributes
    initOverlayMode();
    console.log('[paraglide-debug] ✓ Overlay mode initialized after element registry');
  });

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
  window.__paraglideBrowserDebug.getElements = getElements;

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

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
import { initialize } from "./runtime/initialize.js";
import { createFloatingButton, showEditorModal } from "./runtime/ui.js";
import {
  initOverlayMode,
  refreshElement,
  applySavedEditsFromDB,
  applyOutlinesToAllElements,
} from "./runtime/overlay.js";
import { initLanguageDetection } from "./runtime/languageDetection.js";
import { setElementOutline } from "./runtime/styles.js";
import { buildElementRegistry, getElements } from "./runtime/registry.js";
import { isPgEnabled } from "./runtime/helpers.js";

(function () {
  if (typeof window === "undefined") return;

  // Client-side gate: require explicit opt-in via localStorage
  if (!isPgEnabled()) {
    console.log("[paraglide-debug] Runtime disabled. To activate, run:  localStorage.setItem('pg-enabled', 'true')");
    return;
  }

  console.log("[paraglide-debug] Runtime script loaded");
  console.log("[paraglide-debug] Translation editor enabled");

  window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};

  initLanguageDetection();

  window.addEventListener("__paraglideDebugInitialized", async (e) => {
    console.log(
      "[paraglide-debug] Received __paraglideDebugInitialized event, data fully loaded"
    );
    console.log("[paraglide-debug] Initialization details:", e.detail);

    await buildElementRegistry();
    await applySavedEditsFromDB();
    initOverlayMode();
    console.log(
      "[paraglide-debug] ✓ Overlay mode initialized after element registry"
    );
  });

  window.addEventListener("__paraglideDebugLanguageChange", async (e) => {
    console.log("[paraglide-debug] Handling language change event:", e.detail);
    await applySavedEditsFromDB();
  });

  let scanTimeout;
  const observer = new MutationObserver(() => {
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(async () => {
      await buildElementRegistry();
      applyOutlinesToAllElements();
    }, 100);
  });

  async function startInitialization() {
    console.log("[paraglide-debug] Starting initialization...");
    await initialize();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startInitialization);
  } else {
    startInitialization();
  }

  window.__paraglideBrowserDebug.refresh = buildElementRegistry;
  window.__paraglideBrowserDebug.refreshElement = refreshElement;
  window.__paraglideBrowserDebug.setElementOutline = setElementOutline;
  window.__paraglideBrowserDebug.getElements = getElements;

  async function initEditor() {
    try {
      createFloatingButton(() => showEditorModal());
    } catch (error) {
      console.error("[paraglide-debug] Failed to initialize editor:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEditor);
  } else {
    setTimeout(initEditor, 100);
  }
})();

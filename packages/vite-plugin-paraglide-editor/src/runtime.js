/**
 * Paraglide Editor Runtime — Main Entry Point
 *
 * Flow:
 * 1. Gate check (pge-enabled localStorage)
 * 2. Init data layer (DB + server translations + local edits)
 * 3. Build element registry, apply saved edits, init overlay + UI
 * 4. MutationObserver keeps registry up-to-date on DOM changes
 * 5. __paraglideInitialized listener handles late registry population
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
import { isPgeEnabled } from "./runtime/helpers.js";

(function () {
  if (typeof window === "undefined") return;

  if (!isPgeEnabled()) {
    console.log("[paraglide-editor] Runtime disabled. To activate, run:  localStorage.setItem('pge-enabled', 'true')");
    return;
  }

  console.log("[paraglide-editor] Runtime loading");

  window.__paraglideEditor = window.__paraglideEditor || {};
  window.__paraglideEditor.refresh = buildElementRegistry;
  window.__paraglideEditor.refreshElement = refreshElement;
  window.__paraglideEditor.setElementOutline = setElementOutline;
  window.__paraglideEditor.getElements = getElements;

  initLanguageDetection();

  // Rebuild element registry when message functions first populate the registry.
  // Handles the case where hydration completes after our initial buildElementRegistry call.
  window.addEventListener("__paraglideInitialized", async () => {
    await buildElementRegistry();
    applyOutlinesToAllElements();
  });

  window.addEventListener("__paraglideEditorLanguageChange", async () => {
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

  async function start() {
    await initialize();

    await buildElementRegistry();
    await applySavedEditsFromDB();
    initOverlayMode();
    createFloatingButton(() => showEditorModal());

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'alt', 'aria-label'],
    });

    console.log("[paraglide-editor] Ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

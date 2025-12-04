/**
 * Main Translation Editor Modal UI Component
 *
 * Purpose: Provide the main modal interface for the translation editor.
 *
 * Responsibilities:
 * - Render modal with all editor sections
 * - Coordinate sub-components (language selector, conflict list)
 * - Handle modal open/close interactions
 * - Display translation statistics
 * - Provide access to export and sync functionality
 *
 * This module does NOT:
 * - Contain business logic (see helpers.js)
 * - Edit individual translations (see popup.js)
 * - Manage data storage (see db.js, dataStore.js)
 */

import { exportEdits } from '../export.js';
import { syncWithServer } from '../sync.js';
import { initLanguageSelector } from './languageSelector.js';
import { initConflictList } from './conflictList.js';

export function showEditorModal() {
  // Remove existing modal if any
  const existing = document.getElementById('pg-editor-modal');
  if (existing) {
    existing.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'pg-editor-modal';
  modal.innerHTML = `
    <style>
      #pg-editor-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, sans-serif;
      }
      #pg-editor-modal-content {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        position: relative;
      }
      #pg-editor-modal h2 {
        margin: 0 0 16px 0;
        font-size: 24px;
        color: #2d3748;
      }
      #pg-editor-modal .category-title {
        margin: 24px 0 12px 0;
        font-size: 18px;
        font-weight: 600;
        color: #4a5568;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 8px;
      }
      #pg-close-modal-x {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #e2e8f0;
        color: #2d3748;
        border: none;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        padding: 0;
        margin: 0;
      }
      #pg-close-modal-x:hover {
        background: #cbd5e0;
      }
      #pg-editor-modal button {
        background: #667eea;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        margin: 8px 8px 8px 0;
        transition: all 0.2s;
      }
      #pg-editor-modal button:hover {
        background: #5a67d8;
      }
      #pg-editor-modal button.secondary {
        background: #718096;
      }
      #pg-editor-modal button.secondary:hover {
        background: #4a5568;
      }
      #pg-editor-modal .section {
        margin: 16px 0;
        padding: 16px;
        background: #f7fafc;
        border-radius: 8px;
      }
      #pg-editor-modal .section h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: #718096;
      }
      #pg-editor-modal .info {
        font-size: 14px;
        color: #4a5568;
        margin: 8px 0;
        line-height: 1.5;
      }
      @media (prefers-color-scheme: dark) {
        #pg-editor-modal-content {
          background: #2d3748;
        }
        #pg-editor-modal h2,
        #pg-editor-modal h3,
        #pg-editor-modal .category-title {
          color: #f7fafc;
        }
        #pg-editor-modal .category-title {
          border-bottom-color: #4a5568;
        }
        #pg-close-modal-x {
          background: #4a5568;
          color: #f7fafc;
        }
        #pg-close-modal-x:hover {
          background: #718096;
        }
        #pg-editor-modal .section {
          background: #1a202c;
        }
        #pg-editor-modal .info {
          color: #cbd5e0;
        }
      }
    </style>
    <div id="pg-editor-modal-content">
      <button id="pg-close-modal-x" title="Close">×</button>
      <h2>🌐 Paraglide Translation Editor</h2>

      <div class="category-title">Settings</div>

      <div class="section">
        <h3>Overlay Mode</h3>
        <p class="info">Enable click-to-edit mode to edit translations directly on the page. Hold Shift while clicking to bypass the editor.</p>
        <button id="pg-overlay-toggle-btn">Enable Overlay Mode</button>
      </div>

      <div class="section">
        <h3>Language Selection</h3>
        <p class="info">
          <strong>Active language:</strong> <strong id="pg-current-locale" style="color: #667eea;">Loading...</strong>
        </p>
        <p class="info">
          <strong>Select languages to edit:</strong> <span id="pg-locale-checkboxes" style="display: inline-flex; gap: 12px; margin-left: 8px;"></span>
        </p>
        <p class="info">
          <strong>Currently editing:</strong> <span id="pg-selected-locales" style="color: #48bb78; font-weight: 500;">None</span>
        </p>
      </div>

      <div class="category-title">Database</div>

      <div class="section">
        <h3>Sync with Server</h3>
        <p class="info">Fetch the latest translations from the server and detect conflicts with your local edits.</p>
        <button onclick="window.__paraglideBrowserDebug.syncWithServer()">Sync Now</button>
      </div>

      <div class="section">
        <h3>Conflicts (<span id="pg-conflict-count" style="font-weight: 700;">0</span>)</h3>
        <p class="info">Review and resolve conflicts between your local edits and server translations.</p>
        <div id="pg-conflict-list" style="margin-top: 12px; max-height: 300px; overflow-y: auto;"></div>
      </div>

      <div class="section">
        <h3>Download Edits (Export)</h3>
        <p class="info">Download all your edited translations as JSON files to use in your project.</p>
        <button onclick="window.__paraglideBrowserDebug.exportEdits()">Export Edits</button>
      </div>

      <div class="category-title">About</div>

      <div class="section">
        <p class="info">
          <strong>Paraglide Browser Addon</strong><br>
          Edit translations directly in your browser. All edits are saved locally using IndexedDB.<br><br>
          <strong>Detected translations:</strong> <strong id="pg-translation-count">0</strong> elements on this page
        </p>
        <button onclick="window.__paraglideBrowserDebug.refresh()">Refresh Detection</button>
      </div>
    </div>
  `;

  // Close on ESC key
  const handleEscKey = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEscKey);
    }
  };
  document.addEventListener('keydown', handleEscKey);

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
      document.removeEventListener('keydown', handleEscKey);
    }
  });

  // Prevent clicks inside modal content from closing the modal
  const modalContent = modal.querySelector('#pg-editor-modal-content');
  if (modalContent) {
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  document.body.appendChild(modal);

  // Update translation count
  const elements = window.__paraglideBrowserDebug.getElements();
  document.getElementById('pg-translation-count').textContent = elements.length;

  // Setup overlay toggle button
  const overlayToggleBtn = modal.querySelector('#pg-overlay-toggle-btn');
  if (overlayToggleBtn && window.__paraglideBrowserDebug.isOverlayEnabled) {
    const isEnabled = window.__paraglideBrowserDebug.isOverlayEnabled();
    overlayToggleBtn.textContent = isEnabled ? 'Disable Overlay Mode' : 'Enable Overlay Mode';

    overlayToggleBtn.addEventListener('click', () => {
      const currentState = window.__paraglideBrowserDebug.isOverlayEnabled();
      const newState = !currentState;
      window.__paraglideBrowserDebug.setOverlayMode(newState);
      overlayToggleBtn.textContent = newState ? 'Disable Overlay Mode' : 'Enable Overlay Mode';
    });
  }

  // Initialize language selector
  initLanguageSelector();

  // Initialize conflict list
  initConflictList();

  // Listen for language changes and update the modal
  const handleLanguageChange = (e) => {
    console.log('[paraglide-debug] Modal detected language change:', e.detail);
    const currentLocaleEl = document.getElementById('pg-current-locale');
    if (currentLocaleEl) {
      currentLocaleEl.textContent = e.detail.newLocale.toUpperCase();
    }
    // Re-initialize language selector to update checkboxes
    initLanguageSelector();
  };

  // Add event listener
  window.addEventListener('__paraglideDebugLanguageChange', handleLanguageChange);

  // Remove listener when modal is closed
  const originalHandleEscKey = handleEscKey;
  const handleEscKeyWithCleanup = (e) => {
    if (e.key === 'Escape') {
      window.removeEventListener('__paraglideDebugLanguageChange', handleLanguageChange);
      originalHandleEscKey(e);
    }
  };

  // Replace the ESC handler
  document.removeEventListener('keydown', handleEscKey);
  document.addEventListener('keydown', handleEscKeyWithCleanup);

  // Also cleanup when modal closes via backdrop or close button
  modal.addEventListener('click', (originalE) => {
    if (originalE.target === modal) {
      window.removeEventListener('__paraglideDebugLanguageChange', handleLanguageChange);
    }
  });

  // Update close button to also cleanup language change listener
  const closeBtnWithCleanup = modal.querySelector('#pg-close-modal-x');
  if (closeBtnWithCleanup) {
    closeBtnWithCleanup.addEventListener('click', () => {
      window.removeEventListener('__paraglideDebugLanguageChange', handleLanguageChange);
      modal.remove();
      document.removeEventListener('keydown', handleEscKeyWithCleanup);
    });
  }
}

// Expose functions to window for modal buttons
if (typeof window !== 'undefined') {
  window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};
  window.__paraglideBrowserDebug.exportEdits = exportEdits;
  window.__paraglideBrowserDebug.syncWithServer = syncWithServer;
  window.__paraglideBrowserDebug.refreshConflictList = initConflictList;
}

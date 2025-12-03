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
      }
      #pg-editor-modal h2 {
        margin: 0 0 16px 0;
        font-size: 24px;
        color: #2d3748;
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
        margin: 20px 0;
        padding: 16px;
        background: #f7fafc;
        border-radius: 8px;
      }
      #pg-editor-modal .section h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        color: #2d3748;
      }
      #pg-editor-modal .info {
        font-size: 14px;
        color: #718096;
        margin: 8px 0;
      }
      @media (prefers-color-scheme: dark) {
        #pg-editor-modal-content {
          background: #2d3748;
        }
        #pg-editor-modal h2,
        #pg-editor-modal h3 {
          color: #f7fafc;
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
      <h2>🌐 Paraglide Translation Editor</h2>

      <div class="section">
        <h3>Language Selection</h3>
        <p class="info">
          Active: <strong id="pg-current-locale" style="color: #667eea;">Loading...</strong> |
          Edit languages: <span id="pg-locale-checkboxes" style="display: inline-flex; gap: 12px; margin-left: 8px;"></span> |
          Selected: <span id="pg-selected-locales" style="color: #48bb78; font-weight: 500;">None</span>
        </p>
      </div>

      <div class="section">
        <h3>Translation Tracking</h3>
        <p class="info">Detected <strong id="pg-translation-count">0</strong> translation elements on this page.</p>
        <button onclick="window.__paraglideBrowserDebug.refresh()">Refresh Detection</button>
      </div>

      <div class="section">
        <h3>Sync Translations</h3>
        <p class="info">Fetch latest translations from server and detect conflicts with local edits.</p>
        <button onclick="window.__paraglideBrowserDebug.syncWithServer()">Sync with Server</button>
      </div>

      <div class="section">
        <h3>Conflicts (<span id="pg-conflict-count" style="font-weight: 700;">0</span>)</h3>
        <p class="info">Resolve conflicts between your local edits and server changes.</p>
        <div id="pg-conflict-list" style="margin-top: 12px; max-height: 300px; overflow-y: auto;"></div>
      </div>

      <div class="section">
        <h3>Overlay Mode</h3>
        <p class="info">Click any translated element to edit it in-place.</p>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="pg-overlay-toggle" onchange="window.__paraglideBrowserDebug.setOverlayMode(this.checked)" />
          <span>Enable click-to-edit</span>
        </label>
      </div>

      <div class="section">
        <h3>Export Translations</h3>
        <p class="info">Download your edited translations as JSON files.</p>
        <button onclick="window.__paraglideBrowserDebug.exportEdits()">Export Edits</button>
      </div>

      <div class="section">
        <h3>About</h3>
        <p class="info">This tool helps you edit translations directly in the browser.<br>Edits are saved locally in IndexedDB.</p>
      </div>

      <button class="secondary" id="pg-close-modal-btn">Close</button>
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

  // Close button handler
  const closeBtn = modal.querySelector('#pg-close-modal-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      modal.remove();
      document.removeEventListener('keydown', handleEscKey);
    });
  }

  document.body.appendChild(modal);

  // Update translation count
  const elements = window.__paraglideBrowserDebug.getElements();
  document.getElementById('pg-translation-count').textContent = elements.length;

  // Sync overlay toggle checkbox with current state
  const overlayToggle = document.getElementById('pg-overlay-toggle');
  if (overlayToggle && window.__paraglideBrowserDebug.isOverlayEnabled) {
    overlayToggle.checked = window.__paraglideBrowserDebug.isOverlayEnabled();
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

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
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

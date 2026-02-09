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
  const existing = document.getElementById('pge-editor-modal');
  if (existing) {
    existing.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'pge-editor-modal';
  modal.classList.add('pge-ignore-detection');
  modal.innerHTML = `
    <style>
      #pge-editor-modal {
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
      #pge-editor-modal-content {
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
      #pge-editor-modal h2 {
        margin: 0 0 16px 0;
        font-size: 24px;
        color: #2d3748;
      }
      #pge-editor-modal .category-title {
        margin: 24px 0 12px 0;
        font-size: 18px;
        font-weight: 600;
        color: #4a5568;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 8px;
      }
      #pge-close-modal-x {
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
      #pge-close-modal-x:hover {
        background: #cbd5e0;
      }
      #pge-editor-modal button {
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
      #pge-editor-modal button:hover {
        background: #5a67d8;
      }
      #pge-editor-modal button.secondary {
        background: #718096;
      }
      #pge-editor-modal button.secondary:hover {
        background: #4a5568;
      }
      #pge-editor-modal button:disabled {
        background: #a0aec0;
        cursor: not-allowed;
        opacity: 0.7;
      }
      #pge-editor-modal button:disabled:hover {
        background: #a0aec0;
      }
      .pge-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: pge-spin 0.8s linear infinite;
        margin-right: 6px;
        vertical-align: middle;
      }
      @keyframes pge-spin {
        to { transform: rotate(360deg); }
      }
      .pge-sync-success {
        color: #38a169 !important;
      }
      .pge-sync-error {
        color: #e53e3e !important;
      }
      #pge-editor-modal .section {
        margin: 16px 0;
        padding: 16px;
        background: #f7fafc;
        border-radius: 8px;
      }
      #pge-editor-modal .section h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: #718096;
      }
      #pge-editor-modal .info {
        font-size: 14px;
        color: #4a5568;
        margin: 8px 0;
        line-height: 1.5;
      }
      #pge-locale-override {
        appearance: auto;
        background: white;
        border: 2px solid #667eea;
        border-radius: 6px;
        padding: 4px 8px;
        font-size: 14px;
        font-weight: 600;
        color: #667eea;
        cursor: pointer;
        outline: none;
        vertical-align: middle;
        margin-left: 4px;
      }
      #pge-locale-override:hover {
        border-color: #5a67d8;
        color: #5a67d8;
      }
      #pge-locale-override:focus {
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
      }
      #pge-locale-override:disabled {
        opacity: 0.6;
        cursor: default;
      }
      @media (prefers-color-scheme: dark) {
        #pge-editor-modal-content {
          background: #2d3748;
        }
        #pge-editor-modal h2,
        #pge-editor-modal h3,
        #pge-editor-modal .category-title {
          color: #f7fafc;
        }
        #pge-editor-modal .category-title {
          border-bottom-color: #4a5568;
        }
        #pge-close-modal-x {
          background: #4a5568;
          color: #f7fafc;
        }
        #pge-close-modal-x:hover {
          background: #718096;
        }
        #pge-editor-modal .section {
          background: #1a202c;
        }
        #pge-editor-modal .info {
          color: #cbd5e0;
        }
        #pge-sync-status {
          color: #a0aec0 !important;
        }
        .pge-sync-success {
          color: #68d391 !important;
        }
        .pge-sync-error {
          color: #fc8181 !important;
        }
        #pge-locale-override {
          background: #2d3748;
          border-color: #818cf8;
          color: #818cf8;
        }
        #pge-locale-override:hover {
          border-color: #a5b4fc;
          color: #a5b4fc;
        }
        #pge-locale-override:focus {
          box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.3);
        }
      }
    </style>
    <div id="pge-editor-modal-content">
      <button id="pge-close-modal-x" title="Close">×</button>
      <h2>🌐 Paraglide Translation Editor</h2>

      <div class="category-title">Settings</div>

      <div class="section">
        <h3>Overlay Mode</h3>
        <p class="info">Enable click-to-edit mode to edit translations directly on the page. Hold Shift while clicking to bypass the editor.</p>
        <button id="pge-overlay-toggle-btn">Enable Overlay Mode</button>
      </div>

      <div class="section">
        <h3>Language Selection</h3>
        <p class="info">
          <strong>Active language:</strong> <span id="pge-current-locale" style="color: #667eea; font-weight: 600;"></span>
        </p>
        <p class="info">
          <strong>Language override:</strong> <select id="pge-locale-override"></select>
        </p>
        <p class="info">
          <strong>Select languages to edit:</strong> <span id="pge-locale-checkboxes" style="display: inline-flex; gap: 12px; margin-left: 8px;"></span>
        </p>
        <p class="info">
          <strong>Currently editing:</strong> <span id="pge-selected-locales" style="color: #48bb78; font-weight: 500;">None</span>
        </p>
      </div>

      <div class="category-title">Database</div>

      <div class="section">
        <h3>Sync with Server</h3>
        <p class="info">Fetch the latest translations from the server and detect conflicts with your local edits.</p>
        <button id="pge-sync-btn">Sync Now</button>
        <div id="pge-sync-status" style="margin-top: 8px; font-size: 13px; color: #4a5568;"></div>
      </div>

      <div class="section">
        <h3>Conflicts (<span id="pge-conflict-count" style="font-weight: 700;">0</span>)</h3>
        <p class="info">Review and resolve conflicts between your local edits and server translations.</p>
        <div id="pge-conflict-list" style="margin-top: 12px; max-height: 300px; overflow-y: auto;"></div>
      </div>

      <div class="section">
        <h3>Download Edits (Export)</h3>
        <p class="info">Download all your edited translations as JSON files to use in your project.</p>
        <button onclick="window.__paraglideEditor.exportEdits()">Export Edits</button>
      </div>

      <div class="category-title">About</div>

      <div class="section">
        <p class="info">
          <strong>Paraglide Browser Addon</strong><br>
          Edit translations directly in your browser. All edits are saved locally using IndexedDB.<br><br>
          <strong>Detected translations:</strong> <strong id="pge-translation-count">0</strong> elements on this page
        </p>
        <button onclick="window.__paraglideEditor.refresh()">Refresh Detection</button>
      </div>
    </div>
  `;

  const handleLanguageChange = (e) => {
    console.log('[paraglide-editor] Modal detected language change:', e.detail);
    initLanguageSelector();
  };

  function closeModal() {
    window.removeEventListener('__paraglideEditorLanguageChange', handleLanguageChange);
    document.removeEventListener('keydown', handleEscKey);
    modal.remove();
  }

  function handleEscKey(e) {
    if (e.key === 'Escape') closeModal();
  }

  document.addEventListener('keydown', handleEscKey);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  const modalContent = modal.querySelector('#pge-editor-modal-content');
  if (modalContent) {
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  const closeBtn = modal.querySelector('#pge-close-modal-x');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }

  document.body.appendChild(modal);

  const elements = window.__paraglideEditor.getElements();
  document.getElementById('pge-translation-count').textContent = elements.length;

  const overlayToggleBtn = modal.querySelector('#pge-overlay-toggle-btn');
  if (overlayToggleBtn && window.__paraglideEditor.isOverlayEnabled) {
    const isEnabled = window.__paraglideEditor.isOverlayEnabled();
    overlayToggleBtn.textContent = isEnabled ? 'Disable Overlay Mode' : 'Enable Overlay Mode';

    overlayToggleBtn.addEventListener('click', () => {
      const currentState = window.__paraglideEditor.isOverlayEnabled();
      const newState = !currentState;
      window.__paraglideEditor.setOverlayMode(newState);
      overlayToggleBtn.textContent = newState ? 'Disable Overlay Mode' : 'Enable Overlay Mode';
    });
  }

  const syncBtn = modal.querySelector('#pge-sync-btn');
  const syncStatus = modal.querySelector('#pge-sync-status');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      syncBtn.disabled = true;
      syncBtn.innerHTML = '<span class="pge-spinner"></span>Syncing...';
      syncStatus.textContent = '';
      syncStatus.className = '';

      try {
        const stats = await syncWithServer();

        const parts = [];
        const total = (stats.newKeys || 0) + (stats.updated || 0) + (stats.unchanged || 0) + (stats.conflicts || 0);
        parts.push(`${total} items`);

        parts.push(`${stats.newKeys || 0} new`);

        const changes = (stats.updated || 0) + (stats.autoResolved || 0);
        parts.push(`${changes} changes`);

        parts.push(`${stats.conflicts || 0} conflicts`);

        syncStatus.textContent = parts.join(', ');
        syncStatus.className = stats.conflicts > 0 ? 'pge-sync-error' : 'pge-sync-success';
      } catch (error) {
        syncStatus.textContent = `Error: ${error.message}`;
        syncStatus.className = 'pge-sync-error';
      } finally {
        syncBtn.disabled = false;
        syncBtn.innerHTML = 'Sync Now';
      }
    });
  }

  initLanguageSelector();

  initConflictList();

  window.addEventListener('__paraglideEditorLanguageChange', handleLanguageChange);
}

if (typeof window !== 'undefined') {
  window.__paraglideEditor = window.__paraglideEditor || {};
  window.__paraglideEditor.exportEdits = exportEdits;
  window.__paraglideEditor.syncWithServer = syncWithServer;
  window.__paraglideEditor.refreshConflictList = initConflictList;
}

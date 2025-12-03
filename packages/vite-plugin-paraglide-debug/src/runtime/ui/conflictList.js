/**
 * Conflict List UI Component
 *
 * Purpose: Display and resolve translation conflicts.
 *
 * Responsibilities:
 * - Display list of translations with conflicts
 * - Show conflict resolution dialog
 * - Handle conflict resolution actions (keep local, keep server, merge)
 * - Update conflict count in modal
 *
 * This module does NOT:
 * - Detect conflicts (see db.js syncTranslations)
 * - Store conflict data (see db.js)
 * - Provide main editor interface (see modal.js)
 */

import { getConflicts, resolveConflict } from '../db.js';
import { getCurrentLocale } from '../languageDetection.js';

/**
 * Initialize and display the conflict list in the modal
 */
export async function initConflictList() {
  try {
    const currentLocale = getCurrentLocale();
    const conflicts = await getConflicts(currentLocale);

    console.log(`[paraglide-debug] Found ${conflicts.length} conflicts for locale ${currentLocale}`);

    // Update conflict count in UI
    const conflictCount = document.getElementById('pg-conflict-count');
    if (conflictCount) {
      conflictCount.textContent = conflicts.length;
      conflictCount.style.color = conflicts.length > 0 ? '#e53e3e' : '#48bb78';
    }

    // Get or create conflict list container
    let listContainer = document.getElementById('pg-conflict-list');
    if (!listContainer) {
      console.warn('[paraglide-debug] Conflict list container not found');
      return;
    }

    // Clear existing content
    listContainer.innerHTML = '';

    if (conflicts.length === 0) {
      listContainer.innerHTML = '<p style="color: #48bb78; font-weight: 500;">✓ No conflicts detected</p>';
      return;
    }

    // Create conflict items
    conflicts.forEach(conflict => {
      const item = createConflictItem(conflict);
      listContainer.appendChild(item);
    });

  } catch (error) {
    console.error('[paraglide-debug] Failed to load conflicts:', error);
  }
}

/**
 * Create a single conflict list item
 */
function createConflictItem(conflict) {
  const item = document.createElement('div');
  item.className = 'pg-conflict-item';
  item.style.cssText = `
    background: rgba(255, 255, 255, 0.05);
    border-left: 3px solid #e53e3e;
    padding: 12px;
    margin: 8px 0;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  `;

  // Create header with key name
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  `;

  const keyName = document.createElement('strong');
  keyName.textContent = conflict.key;
  keyName.style.cssText = `
    font-size: 14px;
    color: #e53e3e;
  `;

  const viewButton = document.createElement('button');
  viewButton.textContent = 'Resolve';
  viewButton.style.cssText = `
    background: #e53e3e;
    color: white;
    border: none;
    padding: 4px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  `;
  viewButton.onmouseover = () => viewButton.style.background = '#c53030';
  viewButton.onmouseout = () => viewButton.style.background = '#e53e3e';

  header.appendChild(keyName);
  header.appendChild(viewButton);

  // Create preview of values
  const preview = document.createElement('div');
  preview.style.cssText = `
    font-size: 12px;
    color: #cbd5e0;
    line-height: 1.4;
  `;

  // Get display values (handle plural translations)
  const localValue = getDisplayValue(conflict.editedValue);
  const serverValue = getDisplayValue(conflict.originalValue);

  preview.innerHTML = `
    <div style="margin: 4px 0;">
      <span style="color: #90cdf4;">Your version:</span> ${truncate(localValue, 60)}
    </div>
    <div style="margin: 4px 0;">
      <span style="color: #fbd38d;">Server version:</span> ${truncate(serverValue, 60)}
    </div>
  `;

  item.appendChild(header);
  item.appendChild(preview);

  // Click handler to show resolution UI
  viewButton.addEventListener('click', (e) => {
    e.stopPropagation();
    showConflictResolution(conflict);
  });

  // Hover effect
  item.addEventListener('mouseenter', () => {
    item.style.background = 'rgba(255, 255, 255, 0.1)';
  });
  item.addEventListener('mouseleave', () => {
    item.style.background = 'rgba(255, 255, 255, 0.05)';
  });

  return item;
}

/**
 * Show conflict resolution dialog
 */
async function showConflictResolution(conflict) {
  // Remove existing resolution dialog if any
  const existing = document.getElementById('pg-conflict-resolution');
  if (existing) {
    existing.remove();
  }

  const dialog = document.createElement('div');
  dialog.id = 'pg-conflict-resolution';
  dialog.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 1000001;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  const localValue = getDisplayValue(conflict.editedValue);
  const serverValue = getDisplayValue(conflict.originalValue);

  dialog.innerHTML = `
    <div style="
      background: #2d3748;
      border-radius: 12px;
      padding: 24px;
      max-width: 700px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
      color: #f7fafc;
    ">
      <h3 style="margin: 0 0 16px 0; color: #e53e3e; font-size: 20px;">
        ⚠️ Conflict: ${escapeHtml(conflict.key)}
      </h3>

      <p style="margin: 0 0 20px 0; color: #cbd5e0; font-size: 14px;">
        This translation was modified on the server while you had local edits. Choose which version to keep:
      </p>

      <div style="margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; color: #90cdf4; font-size: 14px;">Your Local Version</h4>
        <div style="
          background: rgba(144, 205, 244, 0.1);
          border: 1px solid #90cdf4;
          padding: 12px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 13px;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 150px;
          overflow-y: auto;
        ">${escapeHtml(localValue)}</div>
      </div>

      <div style="margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; color: #fbd38d; font-size: 14px;">Server Version</h4>
        <div style="
          background: rgba(251, 211, 141, 0.1);
          border: 1px solid #fbd38d;
          padding: 12px;
          border-radius: 6px;
          font-family: monospace;
          font-size: 13px;
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 150px;
          overflow-y: auto;
        ">${escapeHtml(serverValue)}</div>
      </div>

      <div style="margin: 20px 0;">
        <h4 style="margin: 0 0 8px 0; color: #f7fafc; font-size: 14px;">Or Manually Edit</h4>
        <textarea
          id="pg-conflict-merge-value"
          style="
            width: 100%;
            min-height: 80px;
            padding: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid #4a5568;
            border-radius: 6px;
            color: #f7fafc;
            font-family: monospace;
            font-size: 13px;
            resize: vertical;
            box-sizing: border-box;
          "
          placeholder="Enter custom merged value..."
        >${localValue}</textarea>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 24px; flex-wrap: wrap;">
        <button id="pg-keep-local" style="
          flex: 1;
          min-width: 120px;
          background: #90cdf4;
          color: #1a202c;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        ">Keep My Version</button>

        <button id="pg-keep-server" style="
          flex: 1;
          min-width: 120px;
          background: #fbd38d;
          color: #1a202c;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        ">Keep Server Version</button>

        <button id="pg-merge-custom" style="
          flex: 1;
          min-width: 120px;
          background: #48bb78;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        ">Save Custom</button>

        <button id="pg-cancel-resolution" style="
          background: #718096;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        ">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  // Button handlers
  const keepLocalBtn = dialog.querySelector('#pg-keep-local');
  const keepServerBtn = dialog.querySelector('#pg-keep-server');
  const mergeCustomBtn = dialog.querySelector('#pg-merge-custom');
  const cancelBtn = dialog.querySelector('#pg-cancel-resolution');
  const mergeTextarea = dialog.querySelector('#pg-conflict-merge-value');

  keepLocalBtn.addEventListener('click', async () => {
    await handleResolution(conflict, 'keep-local');
    dialog.remove();
  });

  keepServerBtn.addEventListener('click', async () => {
    await handleResolution(conflict, 'keep-server');
    dialog.remove();
  });

  mergeCustomBtn.addEventListener('click', async () => {
    const customValue = mergeTextarea.value.trim();
    if (!customValue) {
      alert('Please enter a value or cancel');
      return;
    }
    await handleResolution(conflict, customValue);
    dialog.remove();
  });

  cancelBtn.addEventListener('click', () => {
    dialog.remove();
  });

  // ESC key closes dialog
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      dialog.remove();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);

  // Backdrop click closes dialog
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) {
      dialog.remove();
      document.removeEventListener('keydown', handleEsc);
    }
  });
}

/**
 * Handle conflict resolution
 */
async function handleResolution(conflict, resolution) {
  try {
    await resolveConflict(conflict.locale, conflict.key, resolution);
    console.log(`[paraglide-debug] Resolved conflict for ${conflict.key}: ${resolution}`);

    // Refresh conflict list
    await initConflictList();

    // Show success message
    alert('Conflict resolved successfully!');
  } catch (error) {
    console.error('[paraglide-debug] Failed to resolve conflict:', error);
    alert('Failed to resolve conflict. Please try again.');
  }
}

/**
 * Get display value from translation (handle plurals)
 */
function getDisplayValue(value) {
  // Handle array (plural forms from server)
  if (Array.isArray(value) && value[0]?.match) {
    return Object.entries(value[0].match)
      .map(([form, text]) => `${form}: ${text}`)
      .join('\n');
  }

  // Handle string (might be JSON from DB)
  if (typeof value === 'string') {
    // Try to parse as plural translation
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed[0]?.match) {
        // Return all plural forms
        return Object.entries(parsed[0].match)
          .map(([form, text]) => `${form}: ${text}`)
          .join('\n');
      }
    } catch {
      // Not JSON, return as-is
    }
    return value;
  }

  // Handle other objects - stringify them
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, null, 2);
  }

  // Fallback - convert to string
  return String(value || '');
}

/**
 * Truncate text for preview
 */
function truncate(text, maxLength) {
  if (text.length <= maxLength) return escapeHtml(text);
  return escapeHtml(text.substring(0, maxLength)) + '...';
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

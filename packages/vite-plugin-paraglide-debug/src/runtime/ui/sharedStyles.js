/**
 * Shared UI Styles
 *
 * Reusable CSS styles for UI components (modals, popups, buttons)
 * Reduces duplication and ensures consistency across components
 */

/**
 * Get common CSS variables and base styles
 * Includes color palette and dark mode support
 *
 * @returns {string} CSS style block
 */
export function getCommonStyles() {
  return `
    <style>
      /* Paraglide Debug UI - Common Styles */
      .pg-ui-container {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        line-height: 1.5;
      }

      /* Color variables - light mode */
      .pg-ui-container {
        --pg-primary: #667eea;
        --pg-primary-hover: #5a67d8;
        --pg-primary-light: rgba(102, 126, 234, 0.1);

        --pg-success: #48bb78;
        --pg-success-hover: #38a169;
        --pg-danger: #f56565;
        --pg-danger-hover: #e53e3e;
        --pg-warning: #f59e0b;

        --pg-bg-primary: #ffffff;
        --pg-bg-secondary: #f7fafc;
        --pg-bg-tertiary: #e2e8f0;

        --pg-text-primary: #2d3748;
        --pg-text-secondary: #4a5568;
        --pg-text-muted: #718096;

        --pg-border-light: #e2e8f0;
        --pg-border-medium: #cbd5e0;
        --pg-border-dark: #a0aec0;

        --pg-shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
        --pg-shadow-md: 0 4px 6px rgba(0,0,0,0.1);
        --pg-shadow-lg: 0 10px 40px rgba(0,0,0,0.25);
      }

      /* Dark mode */
      @media (prefers-color-scheme: dark) {
        .pg-ui-container {
          --pg-primary: #818cf8;
          --pg-primary-hover: #a5b4fc;
          --pg-primary-light: rgba(129, 140, 248, 0.1);

          --pg-success: #48bb78;
          --pg-success-hover: #68d391;
          --pg-danger: #f56565;
          --pg-danger-hover: #fc8181;
          --pg-warning: #f59e0b;

          --pg-bg-primary: #2d3748;
          --pg-bg-secondary: #1a202c;
          --pg-bg-tertiary: #4a5568;

          --pg-text-primary: #f7fafc;
          --pg-text-secondary: #e2e8f0;
          --pg-text-muted: #a0aec0;

          --pg-border-light: #4a5568;
          --pg-border-medium: #718096;
          --pg-border-dark: #a0aec0;

          --pg-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
          --pg-shadow-md: 0 4px 6px rgba(0,0,0,0.3);
          --pg-shadow-lg: 0 10px 40px rgba(0,0,0,0.5);
        }
      }
    </style>
  `;
}

/**
 * Get button styles
 * Includes primary, secondary, and danger button variants
 *
 * @returns {string} CSS style block
 */
export function getButtonStyles() {
  return `
    <style>
      /* Button base */
      .pg-btn {
        padding: 10px 24px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }

      .pg-btn:focus {
        outline: none;
        box-shadow: 0 0 0 3px var(--pg-primary-light);
      }

      /* Primary button */
      .pg-btn-primary {
        background: var(--pg-primary);
        color: white;
      }

      .pg-btn-primary:hover {
        background: var(--pg-primary-hover);
      }

      .pg-btn-primary:disabled {
        background: var(--pg-border-medium);
        cursor: not-allowed;
        opacity: 0.6;
      }

      /* Secondary button */
      .pg-btn-secondary {
        background: var(--pg-bg-tertiary);
        color: var(--pg-text-primary);
      }

      .pg-btn-secondary:hover {
        background: var(--pg-border-medium);
      }

      /* Danger button */
      .pg-btn-danger {
        background: var(--pg-danger);
        color: white;
      }

      .pg-btn-danger:hover {
        background: var(--pg-danger-hover);
      }

      /* Small button */
      .pg-btn-sm {
        padding: 6px 14px;
        font-size: 13px;
      }
    </style>
  `;
}

/**
 * Get modal/backdrop styles
 * Includes backdrop, modal container, and common modal elements
 *
 * @returns {string} CSS style block
 */
export function getModalStyles() {
  return `
    <style>
      /* Modal backdrop */
      .pg-modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999999;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: pg-fade-in 0.2s ease-out;
      }

      @keyframes pg-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      /* Modal container */
      .pg-modal {
        background: var(--pg-bg-primary);
        border-radius: 8px;
        box-shadow: var(--pg-shadow-lg);
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        padding: 24px;
        animation: pg-slide-up 0.3s ease-out;
      }

      @keyframes pg-slide-up {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      /* Modal header */
      .pg-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--pg-border-light);
      }

      .pg-modal-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--pg-text-primary);
      }

      .pg-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        line-height: 1;
        color: var(--pg-text-muted);
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .pg-modal-close:hover {
        background: var(--pg-bg-secondary);
        color: var(--pg-text-primary);
      }

      /* Modal footer */
      .pg-modal-footer {
        display: flex;
        gap: 8px;
        margin-top: 20px;
        padding-top: 12px;
        border-top: 1px solid var(--pg-border-light);
      }
    </style>
  `;
}

/**
 * Get form input styles
 * Includes textareas, inputs, and selects
 *
 * @returns {string} CSS style block
 */
export function getFormStyles() {
  return `
    <style>
      /* Input/Textarea base */
      .pg-input,
      .pg-textarea,
      .pg-select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--pg-border-medium);
        border-radius: 4px;
        font-family: inherit;
        font-size: 14px;
        color: var(--pg-text-primary);
        background: var(--pg-bg-primary);
        transition: all 0.2s;
        box-sizing: border-box;
      }

      .pg-input:focus,
      .pg-textarea:focus,
      .pg-select:focus {
        outline: none;
        border-color: var(--pg-primary);
        box-shadow: 0 0 0 3px var(--pg-primary-light);
      }

      .pg-textarea {
        resize: vertical;
        min-height: 80px;
        line-height: 1.4;
      }

      .pg-select {
        cursor: pointer;
      }

      /* Label */
      .pg-label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--pg-text-secondary);
      }

      /* Form row */
      .pg-form-row {
        margin-bottom: 16px;
      }

      /* Helper text */
      .pg-helper-text {
        margin-top: 4px;
        font-size: 12px;
        color: var(--pg-text-muted);
      }
    </style>
  `;
}

/**
 * Get utility styles
 * Spacing, text utilities, etc.
 *
 * @returns {string} CSS style block
 */
export function getUtilityStyles() {
  return `
    <style>
      /* Text utilities */
      .pg-text-muted {
        color: var(--pg-text-muted);
      }

      .pg-text-sm {
        font-size: 12px;
      }

      .pg-text-xs {
        font-size: 11px;
      }

      .pg-font-semibold {
        font-weight: 600;
      }

      .pg-font-bold {
        font-weight: 700;
      }

      /* Spacing utilities */
      .pg-mt-2 {
        margin-top: 8px;
      }

      .pg-mt-4 {
        margin-top: 16px;
      }

      .pg-mb-2 {
        margin-bottom: 8px;
      }

      .pg-mb-4 {
        margin-bottom: 16px;
      }

      /* Flex utilities */
      .pg-flex {
        display: flex;
      }

      .pg-flex-col {
        flex-direction: column;
      }

      .pg-items-center {
        align-items: center;
      }

      .pg-justify-between {
        justify-content: space-between;
      }

      .pg-gap-2 {
        gap: 8px;
      }

      .pg-gap-4 {
        gap: 16px;
      }
    </style>
  `;
}

/**
 * Get all styles combined
 * Convenience function to include all shared styles at once
 *
 * @returns {string} Combined CSS style blocks
 */
export function getAllStyles() {
  return (
    getCommonStyles() +
    getButtonStyles() +
    getModalStyles() +
    getFormStyles() +
    getUtilityStyles()
  );
}

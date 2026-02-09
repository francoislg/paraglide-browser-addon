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
      .pge-ui-container {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        line-height: 1.5;
      }

      /* Color variables - light mode */
      .pge-ui-container {
        --pge-primary: #667eea;
        --pge-primary-hover: #5a67d8;
        --pge-primary-light: rgba(102, 126, 234, 0.1);

        --pge-success: #48bb78;
        --pge-success-hover: #38a169;
        --pge-danger: #f56565;
        --pge-danger-hover: #e53e3e;
        --pge-warning: #f59e0b;

        --pge-bg-primary: #ffffff;
        --pge-bg-secondary: #f7fafc;
        --pge-bg-tertiary: #e2e8f0;

        --pge-text-primary: #2d3748;
        --pge-text-secondary: #4a5568;
        --pge-text-muted: #718096;

        --pge-border-light: #e2e8f0;
        --pge-border-medium: #cbd5e0;
        --pge-border-dark: #a0aec0;

        --pge-shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
        --pge-shadow-md: 0 4px 6px rgba(0,0,0,0.1);
        --pge-shadow-lg: 0 10px 40px rgba(0,0,0,0.25);
      }

      /* Dark mode */
      @media (prefers-color-scheme: dark) {
        .pge-ui-container {
          --pge-primary: #818cf8;
          --pge-primary-hover: #a5b4fc;
          --pge-primary-light: rgba(129, 140, 248, 0.1);

          --pge-success: #48bb78;
          --pge-success-hover: #68d391;
          --pge-danger: #f56565;
          --pge-danger-hover: #fc8181;
          --pge-warning: #f59e0b;

          --pge-bg-primary: #2d3748;
          --pge-bg-secondary: #1a202c;
          --pge-bg-tertiary: #4a5568;

          --pge-text-primary: #f7fafc;
          --pge-text-secondary: #e2e8f0;
          --pge-text-muted: #a0aec0;

          --pge-border-light: #4a5568;
          --pge-border-medium: #718096;
          --pge-border-dark: #a0aec0;

          --pge-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
          --pge-shadow-md: 0 4px 6px rgba(0,0,0,0.3);
          --pge-shadow-lg: 0 10px 40px rgba(0,0,0,0.5);
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
      .pge-btn {
        padding: 10px 24px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }

      .pge-btn:focus {
        outline: none;
        box-shadow: 0 0 0 3px var(--pge-primary-light);
      }

      /* Primary button */
      .pge-btn-primary {
        background: var(--pge-primary);
        color: white;
      }

      .pge-btn-primary:hover {
        background: var(--pge-primary-hover);
      }

      .pge-btn-primary:disabled {
        background: var(--pge-border-medium);
        cursor: not-allowed;
        opacity: 0.6;
      }

      /* Secondary button */
      .pge-btn-secondary {
        background: var(--pge-bg-tertiary);
        color: var(--pge-text-primary);
      }

      .pge-btn-secondary:hover {
        background: var(--pge-border-medium);
      }

      /* Danger button */
      .pge-btn-danger {
        background: var(--pge-danger);
        color: white;
      }

      .pge-btn-danger:hover {
        background: var(--pge-danger-hover);
      }

      /* Small button */
      .pge-btn-sm {
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
      .pge-modal-backdrop {
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
        animation: pge-fade-in 0.2s ease-out;
      }

      @keyframes pge-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      /* Modal container */
      .pge-modal {
        background: var(--pge-bg-primary);
        border-radius: 8px;
        box-shadow: var(--pge-shadow-lg);
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        padding: 24px;
        animation: pge-slide-up 0.3s ease-out;
      }

      @keyframes pge-slide-up {
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
      .pge-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--pge-border-light);
      }

      .pge-modal-title {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--pge-text-primary);
      }

      .pge-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        line-height: 1;
        color: var(--pge-text-muted);
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

      .pge-modal-close:hover {
        background: var(--pge-bg-secondary);
        color: var(--pge-text-primary);
      }

      /* Modal footer */
      .pge-modal-footer {
        display: flex;
        gap: 8px;
        margin-top: 20px;
        padding-top: 12px;
        border-top: 1px solid var(--pge-border-light);
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
      .pge-input,
      .pge-textarea,
      .pge-select {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--pge-border-medium);
        border-radius: 4px;
        font-family: inherit;
        font-size: 14px;
        color: var(--pge-text-primary);
        background: var(--pge-bg-primary);
        transition: all 0.2s;
        box-sizing: border-box;
      }

      .pge-input:focus,
      .pge-textarea:focus,
      .pge-select:focus {
        outline: none;
        border-color: var(--pge-primary);
        box-shadow: 0 0 0 3px var(--pge-primary-light);
      }

      .pge-textarea {
        resize: vertical;
        min-height: 80px;
        line-height: 1.4;
      }

      .pge-select {
        cursor: pointer;
      }

      /* Label */
      .pge-label {
        display: block;
        margin-bottom: 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--pge-text-secondary);
      }

      /* Form row */
      .pge-form-row {
        margin-bottom: 16px;
      }

      /* Helper text */
      .pge-helper-text {
        margin-top: 4px;
        font-size: 12px;
        color: var(--pge-text-muted);
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
      .pge-text-muted {
        color: var(--pge-text-muted);
      }

      .pge-text-sm {
        font-size: 12px;
      }

      .pge-text-xs {
        font-size: 11px;
      }

      .pge-font-semibold {
        font-weight: 600;
      }

      .pge-font-bold {
        font-weight: 700;
      }

      /* Spacing utilities */
      .pge-mt-2 {
        margin-top: 8px;
      }

      .pge-mt-4 {
        margin-top: 16px;
      }

      .pge-mb-2 {
        margin-bottom: 8px;
      }

      .pge-mb-4 {
        margin-bottom: 16px;
      }

      /* Flex utilities */
      .pge-flex {
        display: flex;
      }

      .pge-flex-col {
        flex-direction: column;
      }

      .pge-items-center {
        align-items: center;
      }

      .pge-justify-between {
        justify-content: space-between;
      }

      .pge-gap-2 {
        gap: 8px;
      }

      .pge-gap-4 {
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

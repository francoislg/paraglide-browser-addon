/**
 * Floating Button UI Component
 *
 * Purpose: Provide a floating action button to open the translation editor modal.
 *
 * Responsibilities:
 * - Create and render floating button element
 * - Handle button click to open modal
 * - Apply hover effects and styling
 *
 * This module does NOT:
 * - Contain business logic (see helpers.js)
 * - Manage translations (see dataStore.js)
 * - Handle modal content (see modal.js)
 */

export function createFloatingButton(onOpenModal) {
  const button = document.createElement('div');
  button.id = 'pge-editor-floating-btn';
  button.classList.add('pge-ignore-detection');
  button.innerHTML = `
    <style>
      #pge-editor-floating-btn {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 999999;
        width: 56px;
        height: 56px;
        background: #667eea;
        border-radius: 50%;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      #pge-editor-floating-btn:hover {
        background: #5a67d8;
        transform: scale(1.05);
      }
      #pge-editor-floating-btn svg {
        width: 24px;
        height: 24px;
        color: white;
      }
    </style>
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
    </svg>
  `;

  button.addEventListener('click', () => {
    console.log('[paraglide-editor] Opening editor modal');
    onOpenModal();
  });

  document.body.appendChild(button);
  console.log('[paraglide-editor] ✓ Floating button added');
}

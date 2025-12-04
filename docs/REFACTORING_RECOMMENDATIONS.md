# Refactoring Recommendations

**Date:** 2025-12-03
**Status:** Analysis Complete
**Priority:** Medium (code works well, but maintainability could be improved)

## Executive Summary

The codebase is **functionally excellent** with the architecture fix fully implemented. However, there are opportunities to improve maintainability by:
1. Breaking down very large functions (especially `createEditPopup` - 795 lines!)
2. Extracting common HTML/DOM patterns into utilities
3. Creating reusable UI component builders
4. Reducing inline styles duplication

**Good Examples Already in Codebase:**
- ✅ `variants.js` - Excellent example of well-factored code (8 small functions, clear names, single responsibility)
- ✅ `dataStore.js` - Clean separation of concerns
- ✅ `renderer.js` - Good abstraction layer

---

## Critical Issues

### 1. `ui/popup.js` - One 795-Line Function

**Problem:** The entire file is ONE function: `createEditPopup()`

**Impact:**
- Impossible to test individual pieces
- Hard to understand flow
- Difficult to modify without breaking things
- Code review nightmare

**Current Structure:**
```javascript
export async function createEditPopup(element, key, params, currentText) {
  // Lines 32-795: EVERYTHING
  // - Create anchor element
  // - Fetch translations
  // - Build language inputs data (70 lines)
  // - Generate HTML (with 200+ lines of inline CSS)
  // - Position popup (80 lines of viewport math)
  // - Handle variant selector changes (115 lines)
  // - Handle expand/collapse (70 lines)
  // - Handle save (70 lines)
  // - Handle cancel/ESC/click-outside
}
```

**Recommended Refactoring:**

Break into focused, reusable functions:

```javascript
// === Data Preparation ===
function fetchTranslationData(key, selectedLanguages) {
  // Get server translations
  // Get edited versions from dataStore
  // Return structured data
}

function buildLanguageInputData(key, selectedLanguages, currentLocale) {
  // Loop through languages
  // Get versions from dataStore
  // Detect plural forms
  // Return languageInputs array
}

// === HTML Generation ===
function generatePopupHTML(languageInputs, key, params, isPlural, variantForms, activeVariantKey) {
  const variantControls = generateVariantControls(isPlural, variantForms, activeVariantKey);
  const languageInputsHTML = generateLanguageInputsHTML(languageInputs, isPlural, variantForms, activeVariantKey);
  const styles = getPopupStyles(); // Extract from inline

  return `
    ${styles}
    <h4>Edit Translation</h4>
    <div class="pg-meta">...</div>
    ${variantControls}
    ${languageInputsHTML}
    <div class="pg-buttons">...</div>
  `;
}

function generateVariantControls(isPlural, variantForms, activeVariantKey) {
  // Extracted from lines 144-164
}

function generateLanguageInputsHTML(languageInputs, isPlural, variantForms, activeVariantKey) {
  // Map over languageInputs
  // Call generateSimpleInput() or generatePluralInput()
}

function generateSimpleInput(input, index) {
  // Extracted from lines 167-199
}

function generatePluralInput(input, index, variantForms, activeVariantKey) {
  // Extracted from lines 200-243
}

// === Positioning ===
function positionPopup(popup, anchor, element) {
  // Extracted from lines 489-559
  // Returns {top, left}
}

function calculateHorizontalPosition(anchorRect, popupWidth, viewportWidth, margin) {
  // Extracted logic for left positioning
}

function calculateVerticalPosition(rect, popupHeight, viewportHeight, margin) {
  // Extracted logic for top positioning
}

// === Event Handlers ===
function setupVariantControls(popup, languageInputs, isPlural, globalSelector, globalExpandBtn) {
  // Extracted from lines 562-675
  setupVariantSelector(popup, languageInputs, globalSelector);
  setupVariantSync(popup, languageInputs, globalSelector);
  setupExpandCollapse(popup, languageInputs, globalSelector, globalExpandBtn);
}

function setupVariantSelector(popup, languageInputs, globalSelector) {
  // Extracted from lines 567-580
}

function setupVariantSync(popup, languageInputs, globalSelector) {
  // Extracted from lines 583-601
}

function setupExpandCollapse(popup, languageInputs, globalSelector, globalExpandBtn) {
  // Extracted from lines 604-674
}

function setupSaveHandler(popup, saveBtn, languageInputs, key, isPlural, close) {
  // Extracted from lines 702-770
}

// === Main Function (now much smaller) ===
export async function createEditPopup(element, key, params, currentText) {
  // 1. Prepare data
  const currentLocale = getCurrentLocale();
  const selectedLanguages = getSelectedLanguages().sort(...);
  const languageInputs = await buildLanguageInputData(key, selectedLanguages, currentLocale);

  // 2. Detect plural/variant info
  const { isPlural, variantForms, activeVariantKey } = detectVariantInfo(languageInputs, params, currentLocale);

  // 3. Create and render popup
  const { anchor, popup } = createPopupElements();
  popup.innerHTML = generatePopupHTML(languageInputs, key, params, isPlural, variantForms, activeVariantKey);

  // 4. Position popup
  document.body.appendChild(anchor);
  requestAnimationFrame(() => {
    const position = positionPopup(popup, anchor, element);
    Object.assign(popup.style, position);
  });

  // 5. Setup interactivity
  const close = setupCloseHandlers(anchor);
  if (isPlural) {
    setupVariantControls(popup, languageInputs, isPlural, ...);
  }
  setupSaveHandler(popup, languageInputs, key, isPlural, close);

  // 6. Focus first textarea
  focusFirstTextarea(popup);
}
```

**Benefits:**
- Each function < 50 lines
- Clear names describe purpose
- Testable in isolation
- Easy to modify one piece without breaking others
- Reusable (e.g., `positionPopup` could be used for tooltips)

---

### 2. `ui/conflictList.js` - Large Functions

**Problem:** `showConflictResolution()` is 210 lines (158-368)

**Recommended Refactoring:**

```javascript
// Break down showConflictResolution:

function createResolutionDialog(conflict) {
  // Create dialog structure (lines 158-175)
}

function generateResolutionHTML(conflict) {
  const localSection = generateValueSection('local', conflict);
  const serverSection = generateValueSection('server', conflict);
  const customSection = generateCustomEditSection(conflict);
  return `...combined HTML...`;
}

function generateValueSection(type, conflict) {
  // Either local or server section
  // Handles both simple and plural values
}

function generateCustomEditSection(conflict) {
  // Custom textarea section
}

function setupResolutionHandlers(dialog, conflict) {
  setupCloseHandlers(dialog);
  setupResolutionButtons(dialog, conflict);
}

function setupResolutionButtons(dialog, conflict) {
  setupKeepLocalButton(dialog, conflict);
  setupKeepServerButton(dialog, conflict);
  setupSaveCustomButton(dialog, conflict);
}

// Main function becomes:
async function showConflictResolution(conflict) {
  const dialog = createResolutionDialog(conflict);
  dialog.innerHTML = generateResolutionHTML(conflict);
  document.body.appendChild(dialog);
  setupResolutionHandlers(dialog, conflict);
}
```

---

## Medium Priority Issues

### 3. HTML/CSS Duplication

**Problem:** Similar style patterns repeated in `popup.js`, `modal.js`, `conflictList.js`

**Pattern:**
```javascript
// All three files have similar inline <style> tags with:
- Dark mode @media queries
- Similar button styles
- Similar modal backdrop patterns
- Similar color schemes
```

**Recommended Refactoring:**

Create `runtime/ui/styles.js` utility:

```javascript
export function getCommonStyles() {
  return `
    <style>
      /* Shared color palette */
      :root {
        --pg-primary: #667eea;
        --pg-primary-hover: #5a67d8;
        --pg-bg-light: #ffffff;
        --pg-bg-dark: #2d3748;
        --pg-border-light: #e2e8f0;
        --pg-border-dark: #4a5568;
        /* ... more variables ... */
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --pg-bg-light: #2d3748;
          --pg-bg-dark: #1a202c;
          /* ... dark overrides ... */
        }
      }
    </style>
  `;
}

export function getButtonStyles() {
  return `
    <style>
      .pg-btn {
        padding: 10px 24px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      .pg-btn-primary {
        background: var(--pg-primary);
        color: white;
      }
      .pg-btn-primary:hover {
        background: var(--pg-primary-hover);
      }
      /* ... more button styles ... */
    </style>
  `;
}

export function getModalStyles() {
  return `
    <style>
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
      }
      /* ... more modal styles ... */
    </style>
  `;
}
```

**Usage:**
```javascript
// In popup.js:
import { getCommonStyles, getButtonStyles } from '../styles.js';

popup.innerHTML = `
  ${getCommonStyles()}
  ${getButtonStyles()}
  <div class="pg-popup">
    <button class="pg-btn pg-btn-primary">Save</button>
  </div>
`;
```

---

### 4. Element Creation Patterns

**Problem:** Similar patterns for creating elements with cleanup

**Pattern Found:**
```javascript
// popup.js, conflictList.js, modal.js all do:
const element = document.createElement('div');
element.id = 'some-id';
const existing = document.getElementById('some-id');
if (existing) existing.remove();
document.body.appendChild(element);
```

**Recommended Refactoring:**

Create `runtime/ui/dom.js` utility:

```javascript
/**
 * Create or replace an element with given ID
 * Removes existing element with same ID if present
 */
export function createOrReplaceElement(tagName, id, parent = document.body) {
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const element = document.createElement(tagName);
  element.id = id;
  parent.appendChild(element);

  return element;
}

/**
 * Create cleanup function for an element
 * Returns a function that removes element and event listeners
 */
export function createCleanup(element, listeners = []) {
  return () => {
    listeners.forEach(({ target, event, handler, options }) => {
      target.removeEventListener(event, handler, options);
    });
    element.remove();
  };
}

/**
 * Setup ESC key handler with cleanup
 */
export function setupEscapeKey(callback) {
  const handler = (e) => {
    if (e.key === 'Escape') callback();
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}

/**
 * Setup click-outside handler with cleanup
 */
export function setupClickOutside(element, callback, delay = 100) {
  let cleanup;

  const handler = (e) => {
    if (!element.contains(e.target)) callback();
  };

  setTimeout(() => {
    document.addEventListener('click', handler, true);
    cleanup = () => document.removeEventListener('click', handler, true);
  }, delay);

  return () => cleanup?.();
}
```

**Usage:**
```javascript
// In popup.js:
import { createOrReplaceElement, setupEscapeKey, setupClickOutside } from '../dom.js';

export async function createEditPopup(element, key, params, currentText) {
  const anchor = createOrReplaceElement('div', 'pg-edit-anchor');
  const popup = document.createElement('div');
  popup.id = 'pg-edit-popup';

  // Setup cleanup
  const cleanupEsc = setupEscapeKey(() => anchor.remove());
  const cleanupClickOutside = setupClickOutside(anchor, () => anchor.remove());

  // ... rest of code ...
}
```

---

### 5. Parameter Extraction Pattern

**Problem:** Repeated pattern of parsing `data-paraglide-params`

**Found in:**
- `overlay.js` line 42
- `overlay.js` line 59
- `overlay.js` line 194
- `languageDetection.js` line 59

**Pattern:**
```javascript
const params = element.dataset.paraglideParams
  ? JSON.parse(element.dataset.paraglideParams)
  : {};
```

**Recommended Refactoring:**

Add to `runtime/ui/dom.js`:

```javascript
/**
 * Get translation metadata from element
 * Safely parses data attributes
 */
export function getTranslationMetadata(element) {
  const key = element.dataset.paraglideKey;

  let params = {};
  if (element.dataset.paraglideParams) {
    try {
      params = JSON.parse(element.dataset.paraglideParams);
    } catch (e) {
      console.warn('[paraglide-debug] Failed to parse params:', e);
    }
  }

  const isEdited = element.dataset.paraglideEdited === 'true';

  return { key, params, isEdited };
}

/**
 * Set translation metadata on element
 */
export function setTranslationMetadata(element, { key, params, isEdited }) {
  element.dataset.paraglideKey = key;
  if (params && Object.keys(params).length > 0) {
    element.dataset.paraglideParams = JSON.stringify(params);
  }
  if (isEdited) {
    element.dataset.paraglideEdited = 'true';
  } else {
    delete element.dataset.paraglideEdited;
  }
}
```

**Usage:**
```javascript
// Before:
const key = element.dataset.paraglideKey;
const params = element.dataset.paraglideParams
  ? JSON.parse(element.dataset.paraglideParams)
  : {};

// After:
const { key, params, isEdited } = getTranslationMetadata(element);
```

---

## Low Priority (Nice to Have)

### 6. Extract Viewport Calculations

**Location:** `popup.js` lines 489-559

**Recommendation:**
```javascript
// runtime/ui/positioning.js
export function positionNearElement(popup, element, options = {}) {
  const {
    preferredSide = 'bottom', // 'top', 'bottom', 'left', 'right'
    margin = 16,
    align = 'start' // 'start', 'center', 'end'
  } = options;

  // Implement smart positioning logic
  // Return {top, left}
}
```

### 7. Extract Form Validation

**Pattern:** Checking if translation differs from server value

**Found in:** `popup.js` lines 734-746

**Recommendation:**
```javascript
// runtime/helpers.js
export function hasTranslationChanged(editedValue, serverValue) {
  const editedString = typeof editedValue === 'object'
    ? JSON.stringify(editedValue)
    : editedValue;
  const serverString = typeof serverValue === 'object'
    ? JSON.stringify(serverValue)
    : serverValue;
  return editedString !== serverString;
}
```

---

## Implementation Priority

### Phase 1: Critical (High Impact, Low Risk)
1. ✅ Break down `createEditPopup()` into 10-15 smaller functions
2. ✅ Extract positioning logic
3. ✅ Extract HTML generation functions

### Phase 2: Important (Medium Impact, Low Risk)
4. ✅ Create `dom.js` utility for common patterns
5. ✅ Extract `getTranslationMetadata()` helper
6. ✅ Create style utilities

### Phase 3: Polish (Low Impact, Nice to Have)
7. Extract viewport calculations into reusable utility
8. Create form validation helpers
9. Add unit tests for all new utilities

---

## Testing Strategy

After refactoring:
1. **Unit tests** for each extracted function
2. **Integration tests** for popup workflow
3. **Manual testing** in all 3 example projects
4. **Visual regression** tests for UI components

---

## Expected Benefits

**Maintainability:**
- Functions under 50 lines each
- Clear single responsibility
- Easy to understand flow

**Testability:**
- Each function testable in isolation
- Mock dependencies easily
- Verify edge cases

**Reusability:**
- Position logic usable for tooltips
- DOM utilities usable across components
- Style utilities ensure consistency

**Debugging:**
- Stack traces show specific function names
- Easy to add logging to specific steps
- Easy to add breakpoints

---

## Good Patterns to Keep

These files are **well-structured** and should serve as examples:

1. ✅ **`variants.js`** - Perfect example of well-factored code
   - 8 small functions (42-62 lines each)
   - Clear names (`parseDeclarations`, `evaluateSelector`, `findBestMatch`)
   - Excellent JSDoc comments
   - Single responsibility principle

2. ✅ **`dataStore.js`** - Clean data access layer
   - Clear separation: load once, access synchronously
   - Well-named functions
   - Good comments

3. ✅ **`renderer.js`** - Good abstraction
   - Separates server rendering from template rendering
   - Clear purpose

---

## Summary

The codebase is **functionally excellent** but has **maintainability issues** due to very large functions (especially `createEditPopup` at 795 lines). The recommended refactoring:

1. **Breaks down large functions** into focused, well-named pieces
2. **Extracts common patterns** into reusable utilities
3. **Reduces code duplication** (styles, DOM patterns, data parsing)
4. **Improves testability** (each function testable in isolation)
5. **Follows the excellent patterns** already established in `variants.js`

**Priority:** Start with Phase 1 (breaking down `createEditPopup`) as it has the highest impact.

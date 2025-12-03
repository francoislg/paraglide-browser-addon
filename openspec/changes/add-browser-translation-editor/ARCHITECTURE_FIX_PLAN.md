# Architecture Fix Plan: Data Flow & Initialization

## Problems Identified

1. **Parameter Substitution Broken**: French shows `{count}` instead of actual values
2. **Popup Shows Wrong Data**: Displays server strings instead of user's edited strings
3. **Inconsistent Data Access**: No clear way to get server vs edited strings
4. **Ad-hoc Initialization**: Components load in random order, causing race conditions
5. **No Rendering Standard**: Different code paths render translations differently

## Root Causes

### 1. Data Storage Confusion
```
Current: Mixed storage between IndexedDB and runtime registry
Problem: No single source of truth for "what should be displayed"

IndexedDB stores:
- originalValue (server)
- editedValue (user's edit)
- isEdited flag

Runtime registry stores:
- Text output from wrapper function
- Already has parameters substituted
- No way to get back to template

Result: When switching languages, we can't re-render parameterized translations
```

### 2. Initialization Chaos
```
Current flow:
1. App loads → calls message functions → populates registry
2. Runtime script loads → checks registry (maybe empty, maybe not)
3. Components render → floating button, overlay
4. Database loads → async, no guaranteed order

Problem: No coordination, everything happens independently
```

### 3. No Rendering Standard
```
Current: Multiple code paths render translations
- Wrapper function: Calls Paraglide, substitutes params
- Overlay popup: Shows editedValue directly (no param substitution)
- Export: Uses editedValue or originalValue
- Language change: Re-calls Paraglide functions (works)
- Initial load: applySavedEditsFromDB tries to substitute (doesn't work for params)

Problem: Each path does it differently
```

## Solution Architecture

### Phase 1: Create Unified Rendering System

#### File: `runtime/renderer.js`
**Purpose**: Single function to render any translation with proper parameter substitution

```javascript
/**
 * Render a translation string with parameters
 * Handles both simple strings and plural translations
 *
 * @param {string|object} translationValue - Raw translation (may have {param} placeholders)
 * @param {object} params - Parameters to substitute
 * @param {string} locale - Current locale
 * @returns {string} - Rendered string with parameters substituted
 */
export function renderTranslation(translationValue, params = {}, locale = 'en') {
  // Handle plural translations: [{declarations, selectors, match}]
  if (typeof translationValue === 'string' && translationValue.startsWith('[{')) {
    const parsed = JSON.parse(translationValue);
    if (parsed[0]?.match) {
      // Determine which plural form to use based on params.count
      const form = getPluralForm(params.count, locale);
      const key = Object.keys(parsed[0].match).find(k => k.includes(form));
      translationValue = parsed[0].match[key] || Object.values(parsed[0].match)[0];
    }
  }

  // Substitute parameters: {name} → actual value
  return substitutePlaceholders(translationValue, params);
}

function substitutePlaceholders(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? params[key] : match;
  });
}

function getPluralForm(count, locale) {
  // Use Intl.PluralRules for proper pluralization
  const pr = new Intl.PluralRules(locale);
  return pr.select(count); // Returns 'one', 'other', 'few', etc.
}
```

**Usage**:
- `renderTranslation('Hello {name}', {name: 'John'})` → `'Hello John'`
- `renderTranslation('[{...}]', {count: 5})` → `'You have 5 items'`

### Phase 2: Create Unified Data Access Layer

#### File: `runtime/dataStore.js`
**Purpose**: Single source of truth for all translation data - load once, access fast

**Key Optimization**: Load server translations and local edits ONCE during initialization, store in memory for fast synchronous access.

```javascript
// In-memory cache (populated during initialization)
let serverTranslations = null; // { locale: { key: value } }
let localEdits = null;         // Map<locale:key, {editedValue, isEdited, hasConflict}>

/**
 * Initialize data store - called once during startup
 * Loads both server translations and local edits into memory
 */
export async function initDataStore() {
  console.log('[paraglide-debug] Initializing data store...');

  // Load server translations from endpoint (called ONCE)
  const response = await fetch('/@paraglide-debug/langs.json');
  if (response.ok) {
    serverTranslations = await response.json();
    console.log('[paraglide-debug] Loaded server translations:', Object.keys(serverTranslations));
  } else {
    console.error('[paraglide-debug] Failed to load server translations');
    serverTranslations = {};
  }

  // Load all local edits from IndexedDB (called ONCE)
  localEdits = new Map();
  const allEdits = await getAllTranslations(); // Get ALL from DB

  for (const edit of allEdits) {
    const cacheKey = `${edit.locale}:${edit.key}`;
    localEdits.set(cacheKey, {
      editedValue: edit.editedValue,
      isEdited: edit.isEdited,
      hasConflict: edit.hasConflict
    });
  }

  console.log('[paraglide-debug] Loaded local edits:', localEdits.size);

  // Make accessible globally
  window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};
  window.__paraglideBrowserDebug.dataStore = {
    serverTranslations,
    localEdits
  };
}

/**
 * Get the translation to display (edited if exists, otherwise server)
 * Returns the RAW template (with {param} placeholders intact)
 * SYNCHRONOUS - no await needed
 */
export function getDisplayTranslation(locale, key) {
  const cacheKey = `${locale}:${key}`;
  const localEdit = localEdits?.get(cacheKey);

  // If user has edited this translation, use their version
  if (localEdit?.isEdited) {
    return {
      value: localEdit.editedValue,
      isEdited: true,
      hasConflict: localEdit.hasConflict || false,
      source: 'local'
    };
  }

  // Otherwise, use server version
  const serverValue = serverTranslations?.[locale]?.[key];
  return {
    value: serverValue || '',
    isEdited: false,
    hasConflict: false,
    source: 'server'
  };
}

/**
 * Get both versions for comparison (edit popup, conflict resolution)
 * SYNCHRONOUS - no await needed
 */
export function getTranslationVersions(locale, key) {
  const cacheKey = `${locale}:${key}`;
  const localEdit = localEdits?.get(cacheKey);
  const serverValue = serverTranslations?.[locale]?.[key] || '';

  return {
    edited: localEdit?.editedValue || null,
    server: serverValue,
    current: localEdit?.isEdited ? localEdit.editedValue : serverValue,
    isEdited: localEdit?.isEdited || false,
    hasConflict: localEdit?.hasConflict || false
  };
}

/**
 * Check if a translation has been edited locally
 */
export function isTranslationEdited(locale, key) {
  const cacheKey = `${locale}:${key}`;
  return localEdits?.get(cacheKey)?.isEdited || false;
}

/**
 * Check if a translation has a conflict
 */
export function hasTranslationConflict(locale, key) {
  const cacheKey = `${locale}:${key}`;
  return localEdits?.get(cacheKey)?.hasConflict || false;
}

/**
 * Update local cache after editing (call after saving to DB)
 */
export function updateLocalCache(locale, key, editedValue, isEdited, hasConflict = false) {
  if (!localEdits) return;

  const cacheKey = `${locale}:${key}`;
  localEdits.set(cacheKey, {
    editedValue,
    isEdited,
    hasConflict
  });
}

/**
 * Refresh data store (call after sync to reload server data)
 */
export async function refreshDataStore() {
  await initDataStore();
}
```

### Phase 3: Create Proper Initialization System

#### File: `runtime/initialize.js`
**Purpose**: Coordinate all initialization in proper order - load data ONCE

**Key Optimization**: Single initialization that loads server translations and local edits once, making them available to all components.

```javascript
import { initDataStore } from './dataStore.js';
import { initDB } from './db.js';
import { buildElementRegistry } from './overlay.js';

/**
 * Master initialization coordinator
 * Ensures everything loads in correct order before emitting ready event
 *
 * IMPORTANT: This loads server translations and local edits ONCE
 */
export async function initialize() {
  console.log('[paraglide-debug] Starting initialization...');

  const initSteps = [
    { name: 'Database', fn: initDB },
    { name: 'Data Store (Server + Local Edits)', fn: initDataStore },
    { name: 'Registry Wait', fn: waitForRegistry },
    { name: 'Element Tracking', fn: buildElementRegistry }
  ];

  for (const step of initSteps) {
    try {
      console.log(`[paraglide-debug] Init: ${step.name}...`);
      await step.fn();
      console.log(`[paraglide-debug] Init: ${step.name} ✓`);
    } catch (error) {
      console.error(`[paraglide-debug] Init: ${step.name} failed:`, error);
      throw error;
    }
  }

  // Everything ready - emit event
  const event = new CustomEvent('__paraglideDebugInitialized', {
    detail: {
      timestamp: Date.now(),
      registrySize: window.__paraglideBrowserDebug.registry?.size || 0,
      elementsTracked: window.__paraglideBrowserDebug.elements?.length || 0,
      serverTranslationsLoaded: Object.keys(window.__paraglideBrowserDebug.dataStore?.serverTranslations || {}).length,
      localEditsLoaded: window.__paraglideBrowserDebug.dataStore?.localEdits?.size || 0
    }
  });
  window.dispatchEvent(event);
  console.log('[paraglide-debug] Initialization complete, emitted __paraglideDebugInitialized');
  console.log('[paraglide-debug] Data loaded:', event.detail);
}

/**
 * Wait for Paraglide registry to be populated by message functions
 * Registry is populated when app calls translation functions like greeting()
 */
async function waitForRegistry() {
  return new Promise((resolve) => {
    if (window.__paraglideBrowserDebug.registry?.size > 0) {
      console.log('[paraglide-debug] Registry already populated:', window.__paraglideBrowserDebug.registry.size);
      resolve();
      return;
    }

    const handler = () => {
      console.log('[paraglide-debug] Registry populated via event:', window.__paraglideBrowserDebug.registry.size);
      window.removeEventListener('__paraglideInitialized', handler);
      resolve();
    };
    window.addEventListener('__paraglideInitialized', handler);
  });
}
```

**Benefits of Single-Load Approach**:
1. **Performance**: One fetch to `/@paraglide-debug/langs.json` instead of multiple
2. **Simplicity**: Synchronous access via `getDisplayTranslation()` - no await needed
3. **Consistency**: All components work with same in-memory data
4. **Predictability**: Everything ready after `__paraglideDebugInitialized` event

### Phase 4: Update Components to Use New System

#### File: `runtime/ui/popup.js` (refactor)
```javascript
import { getTranslationVersions } from '../dataStore.js';
import { renderTranslation } from '../renderer.js';
import { getCurrentLocale } from '../languageDetection.js';

export function createEditPopup(element, key, params, currentText) {
  const locale = getCurrentLocale();
  const versions = getTranslationVersions(locale, key); // SYNCHRONOUS - no await

  // Show RAW template in edit textarea (with {param} placeholders)
  const editValue = versions.current; // Raw template: "You have {count} items"

  // Show RENDERED preview (with params substituted)
  const renderedPreview = renderTranslation(editValue, params, locale); // "You have 5 items"

  // UI shows:
  // - Textarea: "You have {count} items" (raw, editable)
  // - Preview: "You have 5 items" (rendered, read-only)
  // - Server version: "You have {count} items" (for comparison if edited)
  // - Edited indicator: Green if versions.isEdited
}
```

#### File: `runtime/overlay.js` (refactor)
```javascript
import { getDisplayTranslation } from '../dataStore.js';
import { renderTranslation } from '../renderer.js';
import { getCurrentLocale } from '../languageDetection.js';

export function applySavedEditsFromDB() {
  const locale = getCurrentLocale();
  const elements = document.querySelectorAll('[data-paraglide-key]');

  let appliedCount = 0;

  elements.forEach(element => {
    const key = element.dataset.paraglideKey;
    const params = JSON.parse(element.dataset.paraglideParams || '{}');

    const translation = getDisplayTranslation(locale, key); // SYNCHRONOUS - no await

    if (translation.isEdited) {
      // Render with current parameters
      const rendered = renderTranslation(translation.value, params, locale);

      // Only update if different (prevents infinite loop)
      if (element.textContent !== rendered) {
        element.textContent = rendered;
        appliedCount++;
      }

      // Mark as edited
      element.dataset.paraglideEdited = 'true';
      element.style.outline = '2px solid #48bb78';

      // Show conflict indicator if needed
      if (translation.hasConflict) {
        element.style.outline = '2px solid #f56565'; // Red for conflicts
      }
    }
  });

  console.log(`[paraglide-debug] Applied ${appliedCount} saved edits`);
}
```

### Phase 5: Update Language Change Handler

#### File: `runtime/languageDetection.js` (enhance)
```javascript
import { getDisplayTranslation } from '../dataStore.js';
import { renderTranslation } from '../renderer.js';

export function switchLanguage(newLocale) {
  const oldLocale = getCurrentLocale();

  // Update locale
  setLocale(newLocale);

  // Re-render ALL translations with new locale
  const elements = document.querySelectorAll('[data-paraglide-key]');
  let renderedCount = 0;

  elements.forEach(element => {
    const key = element.dataset.paraglideKey;
    const params = JSON.parse(element.dataset.paraglideParams || '{}');

    // Get translation in new locale - SYNCHRONOUS
    const translation = getDisplayTranslation(newLocale, key);

    // Render with parameters
    const rendered = renderTranslation(translation.value, params, newLocale);

    // Update element text
    if (element.textContent !== rendered) {
      element.textContent = rendered;
      renderedCount++;
    }

    // Maintain edit indicators
    if (translation.isEdited) {
      element.dataset.paraglideEdited = 'true';
      element.style.outline = translation.hasConflict
        ? '2px solid #f56565' // Red for conflicts
        : '2px solid #48bb78'; // Green for edits
    } else {
      delete element.dataset.paraglideEdited;
      element.style.outline = '';
    }
  });

  console.log(`[paraglide-debug] Switched to ${newLocale}, re-rendered ${renderedCount} elements`);

  // Emit language change event
  window.dispatchEvent(new CustomEvent('__paraglideDebugLanguageChange', {
    detail: { oldLocale, newLocale, elementsRendered: renderedCount }
  }));
}
```

## Implementation Order

### Step 1: Create Core Infrastructure (1 task)
- [ ] Create `runtime/renderer.js` with `renderTranslation()`
- [ ] Add tests for parameter substitution
- [ ] Add tests for plural form selection

### Step 2: Create Data Layer (1 task)
- [ ] Create `runtime/dataStore.js` with unified access functions
- [ ] Update database queries to use this layer
- [ ] Cache server translations in memory

### Step 3: Create Initialization System (1 task)
- [ ] Create `runtime/initialize.js` with coordinator
- [ ] Update `runtime.js` to use new initialization
- [ ] Emit `__paraglideDebugInitialized` only when truly ready

### Step 4: Update UI Components (3 tasks)
- [ ] Refactor `overlay.js` to use renderer + dataStore
- [ ] Refactor `ui/popup.js` to show raw + rendered versions
- [ ] Refactor `ui/modal.js` to wait for init event

### Step 5: Fix Language Switching (1 task)
- [ ] Update language change to re-render all elements
- [ ] Use renderer for consistent parameter substitution

### Step 6: Testing (1 task)
- [ ] Test parameterized translations work on initial load
- [ ] Test parameterized translations work on language change
- [ ] Test edited translations show in popup
- [ ] Test raw templates show in edit textarea
- [ ] Test rendered preview shows with params substituted

## Expected Results After Fix

1. **Parameter Substitution**: ✅ Always works (initial load, language change, editing)
2. **Popup Shows Edits**: ✅ Displays user's edited version, not server version
3. **Data Access**: ✅ Single consistent API (`getDisplayTranslation`, `getTranslationVersions`)
4. **Initialization**: ✅ Coordinated, predictable, one `__paraglideDebugInitialized` event
5. **Rendering**: ✅ One function (`renderTranslation`) used everywhere

## Files to Create/Modify

### New Files:
1. `runtime/renderer.js` - Rendering system
2. `runtime/dataStore.js` - Data access layer
3. `runtime/initialize.js` - Initialization coordinator

### Modified Files:
1. `runtime.js` - Use new initialization
2. `runtime/overlay.js` - Use renderer + dataStore
3. `runtime/ui/popup.js` - Show raw + rendered
4. `runtime/languageDetection.js` - Re-render on language change
5. `index.js` (plugin) - Keep `__paraglideInitialized` event

## Migration Strategy

1. **No Breaking Changes**: Keep existing APIs working during transition
2. **Incremental**: Add new files first, then migrate components one by one
3. **Testing**: Test each component after migration before moving to next
4. **Rollback Plan**: Git commits after each step for easy rollback

## Success Criteria

- [ ] Parameters work in all languages (en, es, fr)
- [ ] Plural forms work correctly (0 items, 1 item, 5 items)
- [ ] Edit popup shows user's previous edits
- [ ] Edit textarea shows raw template with `{placeholders}`
- [ ] Preview shows rendered version with actual values
- [ ] Language switching re-renders everything correctly
- [ ] Initial load works same as language change
- [ ] No race conditions or timing issues

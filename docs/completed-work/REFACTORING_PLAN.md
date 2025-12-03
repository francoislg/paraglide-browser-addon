# Runtime Codebase Refactoring Plan

**Date**: 2025-12-03
**Goal**: Reorganize runtime codebase into reusable modules with clear responsibilities

## Current Issues Found

1. **Duplication**: `getSelectedLanguages` exists in both `helpers.js` and `ui/languageSelector.js`
2. **Mixed concerns**: `runtime.js` contains business logic (buildElementRegistry, applySavedEditsFromDB) mixed with initialization
3. **UI files with helpers**: `ui/languageSelector.js` has helper functions that should be in `helpers.js`
4. **Unclear module purposes**: Missing clear purpose statements at top of files
5. **Large UI files**: `ui/popup.js` is 780 lines with business logic mixed with UI

## Module Responsibilities

### Core Modules

- **overlay.js** - Manages the overlay around a component. Has a "refreshElement" method to allow updating a single component.
- **renderer.js** - Manages which string to render.
- **styles.js** - Manages everything related to styles.
- **variants.js** - Similar to renderer, but specific to keys that have variants
- **registry.js** (NEW) - Element registry management - tracking which DOM elements contain translations

### UI Modules

- **ui/*** - Everything related to creating custom components. No helper functions in there.

## Reorganization Tasks

### ✅ All Tasks Completed

1. ✅ Created `registry.js` with clear purpose comment
2. ✅ Moved `buildElementRegistry` and `getElements` to `registry.js`
3. ✅ Moved `applySavedEditsFromDB` to `overlay.js`
4. ✅ Updated `runtime.js` imports and removed moved functions
5. ✅ Removed duplicate `getSelectedLanguages` from `ui/languageSelector.js`
6. ✅ Updated `ui/languageSelector.js` to import from `helpers.js`
7. ✅ Added clear purpose comments to all runtime files
8. ✅ Verified all imports and tested functionality (build succeeded)

## Final Status: COMPLETE ✓

**Date Completed**: 2025-12-03
**Build Status**: ✅ All builds passing
**Import Verification**: ✅ All imports correct

## Expected File Structure After Refactoring

```
runtime/
├── runtime.js          # Entry point - initialization only
├── registry.js         # NEW - Element registry management
├── overlay.js          # Overlay mode + element refresh ✅
├── renderer.js         # String rendering logic ✓
├── styles.js           # Visual styling ✓
├── variants.js         # Variant handling ✓
├── helpers.js          # Utility functions (no UI)
├── dataStore.js        # Data access layer ✓
├── db.js               # IndexedDB operations ✓
├── initialize.js       # Master coordinator ✓
├── languageDetection.js # Locale detection ✓
├── export.js           # Export functionality ✓
├── sync.js             # Sync functionality ✓
└── ui/
    ├── ui.js           # Re-exports
    ├── floatingButton.js # Floating button UI ✓
    ├── modal.js        # Main modal UI ✓
    ├── popup.js        # Edit popup UI
    ├── languageSelector.js # Language selector UI
    └── conflictList.js # Conflict list UI ✓
```

## Implementation Details

### registry.js (NEW)

**Purpose**: Element registry management - tracking which DOM elements contain translations

**Exports**:
- `buildElementRegistry()` - Build registry by matching text nodes to translation keys
- `getElements()` - Get current elements with translations

### overlay.js (UPDATED)

**Purpose**: Overlay mode for click-to-edit + single element refresh

**Added**:
- `applySavedEditsFromDB()` - Apply saved edits from database to DOM (moved from runtime.js)

**Existing**:
- `refreshElement()` - Refresh a single element's visual state and content
- `initOverlayMode()` - Initialize overlay mode

### runtime.js (TO UPDATE)

**Before**: 238 lines with mixed concerns
**After**: Clean initialization orchestrator

**Removed**:
- `buildElementRegistry()` → moved to `registry.js`
- `getElements()` → moved to `registry.js`
- `applySavedEditsFromDB()` → moved to `overlay.js`

**Imports to add**:
- `import { buildElementRegistry, getElements } from './runtime/registry.js'`
- `import { applySavedEditsFromDB } from './runtime/overlay.js'`

### ui/languageSelector.js (TO UPDATE)

**Before**: Contains duplicate `getSelectedLanguages()` function
**After**: Imports helper from `helpers.js`

**Removed**:
- Lines 10-22: `getSelectedLanguages()` function (duplicate)

**Import to add**:
- `import { getSelectedLanguages } from '../helpers.js'`

## Benefits

1. **Clear module boundaries**: Each file has a single, well-defined purpose
2. **No duplication**: Helper functions in one place (`helpers.js`)
3. **Separation of concerns**: UI files are pure UI, business logic is separate
4. **Better maintainability**: Easy to find and modify specific functionality
5. **Improved testability**: Modules can be tested in isolation

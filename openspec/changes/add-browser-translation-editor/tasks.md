# Tasks: Browser Translation Editor

**Change ID:** `add-browser-translation-editor`
**Last Reviewed:** 2025-12-03
**Status:** In Progress (~90% complete - FUNCTIONAL with conflict resolution UI)

## Current Status Summary

### ✅ Fully Completed & Working
- **Element Tracking:** Runtime system with TreeWalker, MutationObserver, data-* attributes (`runtime.js`)
- **Enhanced Database:** Full schema with conflict tracking - `originalValue`, `editedValue`, `isEdited`, `lastEditTime`, `lastSyncTime`, `hasConflict` (`runtime/db.js`)
- **Sync Logic:** Conflict detection, server sync, conflict flagging (`runtime/sync.js`) - Fixed endpoint URL
- **Modular UI Components:** Refactored into separate, focused modules
  - **Floating Button:** Bottom-right widget (`runtime/ui/floatingButton.js`)
  - **Translation Modal:** Main editor modal (`runtime/ui/modal.js`)
  - **Language Selector:** Language management (`runtime/ui/languageSelector.js`)
  - **Edit Popup:** In-place translation editor (`runtime/ui/popup.js`)
    - ✅ ESC key closes popup
    - ✅ Click outside closes popup
    - ✅ Plural translation support with shared controls
    - ✅ Proper save format `[{ declarations, selectors, match }]`
- **Overlay Mode:** Click-to-edit initialization and saved edits application (`runtime/overlay.js`)
- **Helper Utilities:** Shared functions for language selection and fetching (`runtime/helpers.js`)
- **Full File Export:** Download complete merged translation files (`runtime/export.js`)
- **Vite Plugin:** Virtual module serving with relative import resolution (`index.js`)
- **Conditional Loading (Task 2.0):** ✅ Zero footprint when editor disabled
  - Plugin checks `VITE_PARAGLIDE_EDITOR` env variable
  - Debug=false: 4.7 KB bundle (NO editor code)
  - Debug=true: 39.79 KB bundle (~35 KB editor overhead)
  - Virtual modules only served when editor enabled
- **Conflict List UI (Task 4.1):** ✅ View and resolve conflicts
  - Conflict list component displays all conflicts (`runtime/ui/conflictList.js`)
  - Shows conflict count in modal
  - Click to open resolution dialog with side-by-side diff
  - Three resolution options: Keep Local, Keep Server, Custom Merge
  - Auto-refreshes after sync operations
  - Supports plural translations in conflict view

### 🐛 Bugs Fixed
**Session 2025-12-02 AM:**
1. **Locale Detection Bug** - Fixed missing locale detection causing edits to save under wrong locale
   - Added `detectCurrentLocale()` function checking localStorage, cookies, HTML lang
2. **IndexedDB Query Error** - Fixed `DataError: The parameter is not a valid key` on `index.getAll()`
   - Changed from `index.getAll(true)` to `store.getAll()` with manual filtering
3. **Infinite Loop** - Fixed MutationObserver triggering infinite re-application of edits
   - Added `currentText !== editedValue` check before DOM updates
4. **Edits Not Persisting on Reload** - All above fixes combined to solve this issue

**Session 2025-12-02 PM:**
5. **Sync with Server Broken** - Fixed incorrect endpoint URL
   - Changed from `/paraglide-editor-langs.json` to `/@paraglide-editor/langs.json` (`sync.js:12`)
6. **Export Only Saving Changes** - Updated to export full merged files
   - Now fetches server translations and merges with edits (`export.js:17-66`)
   - Exports complete `{locale}.json` files instead of `{locale}-edits.json`
7. **Code Refactoring** - Split large files into modular components
   - Created `runtime/helpers.js` with shared utility functions
   - Created `runtime/ui/` directory with separate components:
     - `ui/popup.js` - Edit popup component (~650 lines)
     - `ui/modal.js` - Main editor modal (~240 lines)
     - `ui/floatingButton.js` - Floating button widget (~50 lines)
     - `ui/languageSelector.js` - Language selector (~200 lines)
   - Refactored `overlay.js` from ~860 to ~160 lines
   - Refactored `ui.js` from ~460 to ~8 lines (re-exports)

**Session 2025-12-03:**
8. **Plugin Breaking Build** - Fixed transform attempting to wrap re-export statements
   - Plugin was trying to wrap `export * from` statements in `_index.js`
   - Regex `export const (\w+) =` didn't match, causing empty wrapper with no exports
   - Result: Runtime error "(void 0) is not a function" when importing messages
   - Initial fix: Pass through re-exports without transformation
   - Final fix: Properly wrap re-export statements by importing each module individually (`index.js:139-192`)
   - Verified: Build works correctly with both editor=true and editor=false
9. **Preview Mode Not Serving Translations** - Added configurePreviewServer hook
   - `configureServer` only runs in dev mode, not preview mode
   - Fetch to `/@paraglide-editor/langs.json` failed in preview
   - Fix: Added `configurePreviewServer` hook to serve middleware in preview (`index.js:105-113`)
   - Result: Translation endpoint now available in both dev and preview modes
10. **Parameterized Translations Auto-Apply Issue** - Plural items all showing same text
   - Problem: `applySavedEditsFromDB()` was applying saved edits to ALL elements with same key
   - For plurals (e.g., `items_count` with `count=0,1,2,5`), all showed same edited text
   - Root cause: Didn't check `data-paraglide-params` before applying edits
   - Fix: Skip auto-apply for parameterized translations, only show green outline (`runtime.js:136-144`)
   - Result: Parameterized translations keep their original dynamic text, marked as edited with outline
11. **Initial Load Registry Empty** - Registry worked on language change but not initial load
   - Problem: Runtime script checked registry before main app populated it (timing/race condition)
   - Initial load: Runtime → checks registry → empty → returns (failed)
   - Language change: App populates → runtime checks → success (worked)
   - Fix: Implemented event-driven initialization with `__paraglideInitialized` custom event
     - Wrapper dispatches event when registry first created (`index.js:175-182`)
     - Runtime listens for event and builds on receipt (`runtime.js:30-34`)
     - Also checks if registry already populated for late-loading runtime (`runtime.js:198-200`)
   - Result: Clean event-driven pattern, works in all timing scenarios without polling/retries

### 🔨 Partially Complete
- **Task 3.5:** Parameter handling - basic display but no validation
- **Task 5.3:** File download - works but no delay for multi-locale
- **Task 6.1:** ESC key handling exists for popup, needs Ctrl+S

### ❌ Not Started
- **Task 4.2:** Diff viewer (basic diff shown in resolution dialog, could be enhanced)
- **Task 4.4:** Bulk conflict resolution
- **Task 5.2:** Export validation
- **Task 5.4:** Multi-locale sequential export with delays
- **Task 5.5:** ZIP export (optional)
- **Phase 6:** Polish (loading states, error boundaries, accessibility, mobile)
- **Phase 7:** Testing & Documentation

### Success Criteria Status (from proposal.md)
1. ✅ **Can click any translated element and edit it** - WORKING
2. ✅ **Changes persist across page reloads** - WORKING (fixed locale detection + infinite loop bugs)
3. ✅ **Can export all modified translations** - WORKING
4. ✅ **Conflict resolution works correctly** - WORKING (Task 4.1 & 4.3 complete: list view + resolution actions)
5. ✅ **No performance degradation when disabled** - WORKING (Task 2.0 complete: 4.7 KB vs 41.88 KB)
6. ✅ **Works across all three supported locales (en, es, fr)** - WORKING (language selector functional)

### Next Priorities
1. **Task 3.5 (Parameter Validation):** Add parameter highlighting and validation
2. **Phase 6 (Polish):** Loading states, error boundaries, accessibility improvements
3. **Phase 7 (Testing):** Unit tests, integration tests, manual testing checklist

---

## Implementation Tasks

### Phase 1: Foundation & Storage (Parallel-safe)

#### Task 1.1: Enhance Database Schema ✅ COMPLETED
- [x] Update `src/db.js` to include new fields: `originalValue`, `editedValue`, `isEdited`, `lastEditTime`, `lastSyncTime`, `hasConflict`
- [x] Add indices for `isEdited` and `hasConflict`
- [x] Update `saveKey()` to handle the new schema
- [x] Add `saveEdit()` method for saving user edits (implemented as `saveTranslationEdit()` in db.js:47-79)
- [x] Add `getModifiedTranslations()` method (implemented as `getAllEditedTranslations()` in db.js:108-127)
- [x] Add `getConflicts()` method (implemented in db.js:129-148)
- [ ] **Validation:** Unit test all new database methods
- **Deliverable:** Enhanced database with conflict tracking ✅

#### Task 1.2: Update Sync Logic for Conflict Detection ✅ COMPLETED
- [x] Modify `syncTranslations()` in `src/db.js` to detect conflicts (db.js:150-240)
- [x] Compare incoming server values with `editedValue` when `isEdited = true`
- [x] Set `hasConflict = true` when differences detected
- [x] Update `originalValue` with server version during sync
- [x] Preserve `editedValue` during sync
- [ ] **Validation:** Test sync with various edit states
- **Deliverable:** Conflict-aware sync functionality ✅

### Phase 2: UI Components (Sequential within phase)

#### Task 2.0: Set Up Conditional Loading ✅ COMPLETED
- [x] Implemented via Vite plugin's virtual module system
- [x] Plugin checks `VITE_PARAGLIDE_EDITOR` environment variable
- [x] Virtual modules (`/@paraglide-editor/runtime.js`) only served when editor=true
- [x] **Validation Results:**
  - Build with `VITE_PARAGLIDE_EDITOR=false` → 4.7 KB bundle (NO editor code) ✅
  - Build with `VITE_PARAGLIDE_EDITOR=true` → 39.79 KB bundle (~35 KB editor) ✅
  - Verified zero footprint in production builds
- **Deliverable:** Zero-footprint conditional loading ✅
- **Implementation:** Plugin approach (virtual modules) instead of dynamic import in app code
  - Benefits: Works across all frameworks (vanilla, React, SvelteKit) without app code changes
  - Plugin serves empty comment when editor=false, full runtime when editor=true

#### Task 2.1: Create Base Component System ⚠️ SKIPPED
- [ ] Create `src/editor/Component.js` - Simple base class for components
- [ ] Implement `render()`, `mount()`, `unmount()` lifecycle
- [ ] Add event delegation helpers
- [ ] **Validation:** Create a simple test component
- **Deliverable:** Component abstraction layer
- **Note:** Using vanilla JS functional approach instead, no class-based components needed

#### Task 2.2: Build Floating Button Widget ✅ COMPLETED
- [x] Create `src/editor/FloatingButton.js` (implemented in ui.js:8-51)
- [x] Position at bottom-right with fixed positioning
- [x] Add translation icon SVG
- [x] Implement click handler to open modal
- [x] Add CSS in `src/editor/styles/floating-button.css` (inline styles in ui.js:12-38)
- [x] **Validation:** Button appears and is clickable
- **Deliverable:** Floating button widget ✅

#### Task 2.3: Build Translation Modal ✅ COMPLETED
- [x] Create `src/editor/Modal.js` (implemented in ui.js:53-223)
- [x] Implement backdrop and modal container
- [x] Add close button and ESC key handler (ESC: ui.js:189-196, close button: ui.js:214-221)
- [x] Add backdrop click-to-close (ui.js:198-204, with stopPropagation: ui.js:206-212)
- [x] Add CSS in `src/editor/styles/modal.css` (inline styles in ui.js:64-142)
- [x] **Validation:** Modal opens/closes correctly (ESC, backdrop click, close button all work)
- **Deliverable:** Modal shell component ✅

#### Task 2.4: Add Language Selector ✅ COMPLETED
- [x] Create `src/editor/LanguageSelector.js` (implemented in ui.js:212-279)
- [x] Fetch available locales from Paraglide runtime (fetches from /paraglide-editor-langs.json)
- [x] Display current locale with highlight
- [x] Implement locale switching
- [x] Integrate with Paraglide's `setLocale()` (fallback to page reload)
- [x] **Validation:** Switching locales updates page translations
- **Deliverable:** Working language selector ✅

#### Task 2.5: Add Sync Controls ✅ COMPLETED
- [x] Create `src/editor/SyncControls.js` (implemented in ui.js:160-163 + sync.js:7-48)
- [x] Add sync button with loading states
- [x] Wire up to existing `syncTranslations()` method
- [x] Display sync results (new/updated counts) (sync.js:28-40)
- [ ] Show last sync time (not implemented in UI)
- [x] **Validation:** Sync button triggers sync and shows feedback
- **Deliverable:** Sync control UI ✅

#### Task 2.6: Add Overlay Toggle ✅ COMPLETED
- [x] Create `src/editor/OverlayToggle.js` (implemented in ui.js:166-172 + overlay.js:331-362)
- [x] Implement toggle switch UI (checkbox at ui.js:169)
- [x] Store overlay state in localStorage (overlay.js:299, 335)
- [x] Emit events when toggled (updates visual indicators)
- [x] **Validation:** Toggle persists across page reloads
- **Deliverable:** Overlay mode toggle ✅

#### Task 2.7: Add Download Button ✅ COMPLETED
- [x] Create `src/editor/DownloadControls.js` (implemented in ui.js:175-178)
- [x] Add download button to modal
- [x] Wire up to export functionality (Task 5.1)
- [x] **Validation:** Button is visible and clickable
- **Deliverable:** Download button UI ✅

### Phase 3: Overlay Mode (Sequential)

#### Task 3.1: Implement Click Detection ✅ COMPLETED
- [x] Create `src/editor/OverlayManager.js` (implemented in overlay.js:298-329)
- [x] Add document click listener (event delegation) (overlay.js:302)
- [x] Implement `extractTranslationKey()` to parse HTML comments (uses data-paraglide-key attribute)
- [x] Traverse DOM tree to find translation wrappers (overlay.js:311)
- [x] Only active when overlay is enabled (overlay.js:303)
- [x] **Validation:** Clicking translated elements extracts correct keys
- **Deliverable:** Click detection system ✅

#### Task 3.2: Build Edit Popup ✅ COMPLETED
- [x] Create `src/editor/EditPopup.js` (implemented in overlay.js:10-247)
- [x] Position near clicked element (smart viewport handling) (overlay.js:159-191)
- [x] Display translation key, locale, current value (overlay.js:144-148)
- [x] Add textarea for editing (overlay.js:149)
- [x] Add character count (overlay.js:150, 196-198)
- [x] Add Save/Cancel buttons (overlay.js:152-154)
- [x] Add CSS in `src/editor/styles/edit-popup.css` (inline styles in overlay.js:36-141)
- [x] **Validation:** Popup appears and positions correctly
- **Deliverable:** Edit popup component ✅

#### Task 3.3: Implement Edit Save Logic ✅ COMPLETED
- [x] Wire Save button to `saveEdit()` database method (overlay.js:206-233)
- [x] Update DOM immediately with new value (overlay.js:219)
- [x] Preserve HTML comment wrapper (N/A - uses data attributes)
- [x] Close popup on successful save (overlay.js:226)
- [x] Handle save errors gracefully (overlay.js:228-232)
- [x] **Validation:** Edits save and appear immediately in UI
- **Deliverable:** Working edit-save flow ✅

#### Task 3.4: Add Visual Indicators ✅ COMPLETED
- [x] Add CSS class for editable elements on hover (overlay.js:338-361)
- [x] Show "edited" badge for modified translations (green outline, overlay.js:222-223, 343-345)
- [ ] Show "conflict" badge for conflicted translations (not implemented)
- [x] Use data attributes or DOM markers (data-paraglide-edited attribute)
- [x] Add CSS in `src/editor/styles/overlay.css` (inline styles via element.style)
- [x] **Validation:** Hover and badges display correctly
- **Deliverable:** Visual feedback system ✅

#### Task 3.5: Handle Parameterized Translations ⚠️ PARTIALLY COMPLETE
- [x] Detect parameters in translation values (e.g., `{name}`) (displayed in popup at overlay.js:147)
- [ ] Highlight parameters in edit popup
- [ ] Validate parameters are preserved on save
- [ ] Warn if parameters are removed/changed
- [ ] **Validation:** Parameters remain functional after edit
- **Deliverable:** Parameter-aware editing (basic display only)

#### Task 3.6: Handle Plural Translations ✅ COMPLETED
- [x] Detect plural translation structure (overlay.js:95-102, 112-118)
- [x] Display all plural variants in edit popup (overlay.js:182-196, shared controls at 143-152)
- [x] Allow editing each variant separately (shared dropdown selector + expand/collapse)
- [x] Reconstruct plural JSON structure on save (overlay.js:646-652)
- [x] **Validation:** Plural forms edit correctly
- **Deliverable:** Plural translation editing ✅
- **Implementation Notes:**
  - Shared controls (dropdown + expand button) apply to all languages
  - Single textarea mode shows one form at a time, controlled by global selector
  - Expanded mode shows all plural forms (one, other, etc.) for all languages
  - Saves in proper Paraglide format: `[{ declarations, selectors, match }]`

### Phase 4: Conflict Resolution (Sequential)

#### Task 4.1: Build Conflict List View ✅ COMPLETED
- [x] Create `runtime/ui/conflictList.js`
- [x] Query database for `hasConflict = true` using `getConflicts()` (db.js:134-156)
- [x] Display list of conflicted translations with visual indicators
- [x] Show key, conflict count in modal header, preview of both versions
- [x] Add to modal as new "Conflicts" section (modal.js:125-129)
- [x] **Validation:** Conflict list displays all conflicts with proper formatting
- **Deliverable:** Conflict list UI ✅
- **Implementation:** Integrated with modal, auto-refreshes after sync, supports plural translations

#### Task 4.2: Build Diff Viewer ❌ NOT STARTED
- [ ] Create `src/editor/DiffViewer.js`
- [ ] Implement side-by-side comparison
- [ ] Highlight additions (green) and deletions (red)
- [ ] Use simple text diff algorithm
- [ ] Add CSS in `src/editor/styles/diff-viewer.css`
- [ ] **Validation:** Diffs show changes clearly
- **Deliverable:** Diff visualization

#### Task 4.3: Implement Resolution Actions ✅ COMPLETED
- [x] Add "Keep My Version" button (conflictList.js:183-188)
- [x] Add "Keep Server Version" button (conflictList.js:190-195)
- [x] Add "Save Custom" button with textarea for manual editing (conflictList.js:197-207)
- [x] Implement `resolveConflict()` database method (db.js:122-162)
- [x] Update database flags on resolution (clears `hasConflict`, updates `editedValue`)
- [x] Remove from conflict list after resolution (auto-refreshes list)
- [x] **Validation:** All resolution actions work correctly
- **Deliverable:** Complete conflict resolution system ✅
- **Implementation:** Modal dialog with side-by-side view, three resolution options, ESC/backdrop close

#### Task 4.4: Add Bulk Resolution ❌ NOT STARTED
- [ ] Add "Keep All Local" button
- [ ] Add "Keep All Server" button
- [ ] Add checkbox selection for conflicts
- [ ] Implement batch resolution logic
- [ ] Use database transactions for atomicity
- [ ] **Validation:** Bulk operations resolve multiple conflicts
- **Deliverable:** Bulk conflict resolution

### Phase 5: Export Functionality (Sequential)

#### Task 5.1: Implement JSON Generation ✅ COMPLETED
- [x] Create `src/editor/ExportManager.js` (implemented in export.js:7-91)
- [x] Query database for translations by locale (export.js:9)
- [x] Fetch server translations and merge with edits (export.js:16-66)
- [x] Use `editedValue` if `isEdited = true`, else server value (export.js:55-58)
- [x] Reconstruct JSON structure for plural forms (export.js:34-44)
- [x] Handle special characters and escaping (JSON.stringify with proper parsing)
- [x] **Validation:** Generated JSON matches original format and includes all keys
- **Deliverable:** Full file export with merged translations ✅

#### Task 5.2: Add Export Validation ❌ NOT STARTED
- [ ] Validate JSON is well-formed
- [ ] Check parameter consistency
- [ ] Verify plural structure integrity
- [ ] Display warnings for issues
- [ ] Allow user to proceed or cancel
- [ ] **Validation:** Validation catches common errors
- **Deliverable:** Export validation system

#### Task 5.3: Implement File Download ✅ COMPLETED
- [x] Generate Blob from JSON string (export.js:72)
- [x] Create download link with `{locale}.json` filename (export.js:76)
- [x] Trigger browser download (export.js:74-80)
- [x] Show success/error feedback (export.js:86-91)
- [x] **Validation:** Files download with correct names and complete content
- **Deliverable:** Full file download with merged translations ✅

#### Task 5.4: Add Multi-Locale Export ⚠️ PARTIALLY COMPLETE
- [x] Implement sequential downloads for all locales (export.js:26, loops over locales)
- [ ] Add delay between downloads to avoid browser blocking
- [ ] Show progress indicator
- [x] **Validation:** All locale files download successfully
- **Deliverable:** Multi-locale export (works but no delays/progress)

#### Task 5.5: Add ZIP Export (Optional) ❌ NOT STARTED
- [ ] Integrate ZIP library (e.g., JSZip)
- [ ] Bundle all locale JSON files into single ZIP
- [ ] Name ZIP file with timestamp
- [ ] Trigger ZIP download
- [ ] **Validation:** ZIP contains all expected files
- **Deliverable:** ZIP export functionality

### Phase 6: Polish & Integration (Parallel-safe)

#### Task 6.1: Add Keyboard Shortcuts ⚠️ PARTIALLY COMPLETE
- [x] ESC closes popup and modal (overlay.js:240-246)
- [ ] Ctrl/Cmd+S saves translation in popup
- [ ] Tab navigation through controls
- [ ] Document shortcuts in UI
- [ ] **Validation:** All shortcuts work as expected
- **Deliverable:** Keyboard accessibility (partial)

#### Task 6.2: Add Loading States ⚠️ PARTIALLY COMPLETE
- [ ] Show spinners during async operations
- [x] Disable buttons during processing (overlay.js:210)
- [ ] Display progress indicators
- [x] **Validation:** UI provides clear feedback (basic with alerts)
- **Deliverable:** Loading state UX (basic button disabling only)

#### Task 6.3: Error Handling ⚠️ PARTIALLY COMPLETE
- [x] Add try-catch blocks around all async operations (present in db.js, sync.js, export.js, overlay.js)
- [x] Display user-friendly error messages (uses alert(), overlay.js:231, sync.js:44)
- [x] Log detailed errors to console
- [ ] Add retry mechanisms where appropriate
- [x] **Validation:** Errors display gracefully
- **Deliverable:** Robust error handling (basic with alerts)

#### Task 6.4: Performance Optimization ⚠️ PARTIALLY COMPLETE
- [x] Implement event delegation for overlay clicks (overlay.js:302, uses capture phase)
- [ ] Debounce search/filter operations (N/A - no search yet)
- [x] Use requestAnimationFrame for animations (overlay.js:163 for popup positioning)
- [ ] Lazy-load editor components (runtime always loads)
- [ ] **Validation:** Performance tests show no degradation
- **Deliverable:** Optimized performance (some optimizations present)

#### Task 6.5: Accessibility ❌ NOT STARTED
- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure keyboard navigation works
- [ ] Test with screen readers
- [ ] Use semantic HTML
- [ ] Ensure color contrast meets WCAG guidelines
- [ ] **Validation:** Accessibility audit passes
- **Deliverable:** Accessible UI

#### Task 6.6: Mobile Responsiveness ⚠️ PARTIALLY COMPLETE
- [ ] Test on mobile viewport sizes
- [x] Adjust modal sizing for small screens (modal uses max-width: 600px, width: 90% - ui.js:82)
- [ ] Make touch targets appropriately sized
- [x] Test popup positioning on mobile (smart viewport handling exists - overlay.js:159-191)
- [ ] **Validation:** UI works on mobile devices
- **Deliverable:** Mobile-friendly interface (partially responsive)

### Phase 7: Documentation & Testing

#### Task 7.1: Write Unit Tests ❌ NOT STARTED
- [ ] Test database CRUD operations
- [ ] Test key extraction logic
- [ ] Test JSON generation
- [ ] Test conflict detection
- [ ] Aim for 80%+ code coverage
- [ ] **Validation:** All tests pass
- **Deliverable:** Unit test suite

#### Task 7.2: Write Integration Tests ❌ NOT STARTED
- [ ] Test end-to-end edit workflow
- [ ] Test sync with conflicts
- [ ] Test export functionality
- [ ] Test overlay mode enable/disable
- [ ] **Validation:** Integration tests pass
- **Deliverable:** Integration test suite

#### Task 7.3: Update Documentation ❌ NOT STARTED
- [ ] Document new database schema in CLAUDE.md
- [ ] Add usage instructions to README
- [ ] Document keyboard shortcuts
- [ ] Add architecture diagrams
- [ ] **Validation:** Documentation is clear and complete
- **Deliverable:** Updated documentation

#### Task 7.4: Create Demo Video ❌ NOT STARTED
- [ ] Record screen capture of features
- [ ] Show edit workflow
- [ ] Show conflict resolution
- [ ] Show export process
- [ ] **Validation:** Video demonstrates all features
- **Deliverable:** Demo video

## Dependencies

```
Task 1.1 (Database) ─┬─> Task 1.2 (Sync)
                     │
                     └─> Task 3.3 (Save)
                     │
                     └─> Task 4.3 (Resolve)
                     │
                     └─> Task 5.1 (Export)

Task 2.1 (Components) ─> Task 2.2 (Button) ─> Task 2.3 (Modal) ─┬─> Task 2.4 (Lang Selector)
                                                                   ├─> Task 2.5 (Sync Controls)
                                                                   ├─> Task 2.6 (Overlay Toggle)
                                                                   └─> Task 2.7 (Download Button)

Task 3.1 (Click Detection) ─> Task 3.2 (Edit Popup) ─> Task 3.3 (Save Logic) ─┬─> Task 3.4 (Visual Indicators)
                                                                                 ├─> Task 3.5 (Parameters)
                                                                                 └─> Task 3.6 (Plurals)

Task 4.1 (Conflict List) ─> Task 4.2 (Diff Viewer) ─> Task 4.3 (Resolution) ─> Task 4.4 (Bulk Resolution)

Task 5.1 (JSON Gen) ─> Task 5.2 (Validation) ─> Task 5.3 (Download) ─> Task 5.4 (Multi-Export) ─> Task 5.5 (ZIP)
```

## Estimated Timeline

- **Phase 1:** 2-3 days
- **Phase 2:** 3-4 days
- **Phase 3:** 4-5 days
- **Phase 4:** 2-3 days
- **Phase 5:** 2-3 days
- **Phase 6:** 2-3 days
- **Phase 7:** 2-3 days

**Total:** 17-24 days for full implementation

## Milestones

1. **M1: Storage Ready** - Database schema complete, sync with conflict detection works
2. **M2: UI Shell** - Floating button and modal with all controls visible
3. **M3: Basic Editing** - Can click and edit translations, changes save
4. **M4: Conflict Resolution** - Conflicts detected and resolvable
5. **M5: Export Working** - Can download modified translations
6. **M6: Polish Complete** - All UX polish, accessibility, tests done
7. **M7: Production Ready** - Documented, tested, ready to use

## Testing Strategy

- **Unit tests:** For each module (database, key extraction, JSON generation)
- **Integration tests:** For workflows (edit, sync, export)
- **Bundle size tests:** Verify 0 KB editor code when editor disabled
- **Manual testing:** For UX and edge cases
- **Accessibility testing:** With screen readers and keyboard only
- **Performance testing:** With 1000+ translations
- **Cross-browser testing:** Chrome, Firefox, Safari, Edge

### Critical Tests

**Bundle Size Verification:**
```bash
# Test 1: Production build without debug
VITE_PARAGLIDE_EDITOR=false npm run build
npm run analyze-bundle  # Should show 0 KB editor modules

# Test 2: Production build with debug
VITE_PARAGLIDE_EDITOR=true npm run build
npm run analyze-bundle  # Should show ~50-100 KB editor modules

# Test 3: Development mode
npm run dev  # Editor should load if .env has editor=true
```

## Rollout Plan

1. Develop in feature branch `feature/translation-editor`
2. Deploy to staging environment for testing
3. Gather feedback from team
4. Address feedback and bugs
5. Merge to main and deploy to production
6. Monitor for issues
7. Iterate based on usage patterns

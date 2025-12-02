# Tasks: Browser Translation Editor

**Change ID:** `add-browser-translation-editor`

## Implementation Tasks

### Phase 1: Foundation & Storage (Parallel-safe)

#### Task 1.1: Enhance Database Schema
- Update `src/db.js` to include new fields: `originalValue`, `editedValue`, `isEdited`, `lastEditTime`, `lastSyncTime`, `hasConflict`
- Add indices for `isEdited` and `hasConflict`
- Update `saveKey()` to handle the new schema
- Add `saveEdit()` method for saving user edits
- Add `getModifiedTranslations()` method
- Add `getConflicts()` method
- **Validation:** Unit test all new database methods
- **Deliverable:** Enhanced database with conflict tracking

#### Task 1.2: Update Sync Logic for Conflict Detection
- Modify `syncTranslations()` in `src/db.js` to detect conflicts
- Compare incoming server values with `editedValue` when `isEdited = true`
- Set `hasConflict = true` when differences detected
- Update `originalValue` with server version during sync
- Preserve `editedValue` during sync
- **Validation:** Test sync with various edit states
- **Deliverable:** Conflict-aware sync functionality

### Phase 2: UI Components (Sequential within phase)

#### Task 2.0: Set Up Conditional Loading
- Create `src/editor/index.js` - Main editor entry point with `initEditor()` function
- Update `src/main.js` to conditionally import editor:
  ```javascript
  if (import.meta.env.VITE_PARAGLIDE_BROWSER_DEBUG === 'true') {
    import('./editor/index.js').then(({ initEditor }) => initEditor());
  }
  ```
- **Validation:**
  - Build with `VITE_PARAGLIDE_BROWSER_DEBUG=false` → 0 KB editor in bundle
  - Build with `VITE_PARAGLIDE_BROWSER_DEBUG=true` → editor code present
  - Use `npx vite-bundle-visualizer` to verify
- **Deliverable:** Zero-footprint conditional loading

#### Task 2.1: Create Base Component System
- Create `src/editor/Component.js` - Simple base class for components
- Implement `render()`, `mount()`, `unmount()` lifecycle
- Add event delegation helpers
- **Validation:** Create a simple test component
- **Deliverable:** Component abstraction layer

#### Task 2.2: Build Floating Button Widget
- Create `src/editor/FloatingButton.js`
- Position at bottom-right with fixed positioning
- Add translation icon SVG
- Implement click handler to open modal
- Add CSS in `src/editor/styles/floating-button.css`
- **Validation:** Button appears and is clickable
- **Deliverable:** Floating button widget

#### Task 2.3: Build Translation Modal
- Create `src/editor/Modal.js`
- Implement backdrop and modal container
- Add close button and ESC key handler
- Add CSS in `src/editor/styles/modal.css`
- **Validation:** Modal opens/closes correctly
- **Deliverable:** Modal shell component

#### Task 2.4: Add Language Selector
- Create `src/editor/LanguageSelector.js`
- Fetch available locales from Paraglide runtime
- Display current locale with highlight
- Implement locale switching
- Integrate with Paraglide's `setLocale()`
- **Validation:** Switching locales updates page translations
- **Deliverable:** Working language selector

#### Task 2.5: Add Sync Controls
- Create `src/editor/SyncControls.js`
- Add sync button with loading states
- Wire up to existing `syncTranslations()` method
- Display sync results (new/updated counts)
- Show last sync time
- **Validation:** Sync button triggers sync and shows feedback
- **Deliverable:** Sync control UI

#### Task 2.6: Add Overlay Toggle
- Create `src/editor/OverlayToggle.js`
- Implement toggle switch UI
- Store overlay state in localStorage
- Emit events when toggled
- **Validation:** Toggle persists across page reloads
- **Deliverable:** Overlay mode toggle

#### Task 2.7: Add Download Button
- Create `src/editor/DownloadControls.js`
- Add download button to modal
- Wire up to export functionality (Task 5.1)
- **Validation:** Button is visible and clickable
- **Deliverable:** Download button UI

### Phase 3: Overlay Mode (Sequential)

#### Task 3.1: Implement Click Detection
- Create `src/editor/OverlayManager.js`
- Add document click listener (event delegation)
- Implement `extractTranslationKey()` to parse HTML comments
- Traverse DOM tree to find translation wrappers
- Only active when overlay is enabled
- **Validation:** Clicking translated elements extracts correct keys
- **Deliverable:** Click detection system

#### Task 3.2: Build Edit Popup
- Create `src/editor/EditPopup.js`
- Position near clicked element (smart viewport handling)
- Display translation key, locale, current value
- Add textarea for editing
- Add character count
- Add Save/Cancel buttons
- Add CSS in `src/editor/styles/edit-popup.css`
- **Validation:** Popup appears and positions correctly
- **Deliverable:** Edit popup component

#### Task 3.3: Implement Edit Save Logic
- Wire Save button to `saveEdit()` database method
- Update DOM immediately with new value
- Preserve HTML comment wrapper
- Close popup on successful save
- Handle save errors gracefully
- **Validation:** Edits save and appear immediately in UI
- **Deliverable:** Working edit-save flow

#### Task 3.4: Add Visual Indicators
- Add CSS class for editable elements on hover
- Show "edited" badge for modified translations
- Show "conflict" badge for conflicted translations
- Use data attributes or DOM markers
- Add CSS in `src/editor/styles/overlay.css`
- **Validation:** Hover and badges display correctly
- **Deliverable:** Visual feedback system

#### Task 3.5: Handle Parameterized Translations
- Detect parameters in translation values (e.g., `{name}`)
- Highlight parameters in edit popup
- Validate parameters are preserved on save
- Warn if parameters are removed/changed
- **Validation:** Parameters remain functional after edit
- **Deliverable:** Parameter-aware editing

#### Task 3.6: Handle Plural Translations
- Detect plural translation structure
- Display all plural variants in edit popup
- Allow editing each variant separately
- Reconstruct plural JSON structure on save
- **Validation:** Plural forms edit correctly
- **Deliverable:** Plural translation editing

### Phase 4: Conflict Resolution (Sequential)

#### Task 4.1: Build Conflict List View
- Create `src/editor/ConflictList.js`
- Query database for `hasConflict = true`
- Display list of conflicted translations
- Show key, locale, and conflict count
- Add to modal as a new section
- **Validation:** Conflict list displays all conflicts
- **Deliverable:** Conflict list UI

#### Task 4.2: Build Diff Viewer
- Create `src/editor/DiffViewer.js`
- Implement side-by-side comparison
- Highlight additions (green) and deletions (red)
- Use simple text diff algorithm
- Add CSS in `src/editor/styles/diff-viewer.css`
- **Validation:** Diffs show changes clearly
- **Deliverable:** Diff visualization

#### Task 4.3: Implement Resolution Actions
- Add "Keep Local" button
- Add "Keep Server" button
- Add "Merge" textarea for manual editing
- Implement `resolveConflict()` database method
- Update database flags on resolution
- Remove from conflict list after resolution
- **Validation:** All resolution actions work correctly
- **Deliverable:** Conflict resolution system

#### Task 4.4: Add Bulk Resolution
- Add "Keep All Local" button
- Add "Keep All Server" button
- Add checkbox selection for conflicts
- Implement batch resolution logic
- Use database transactions for atomicity
- **Validation:** Bulk operations resolve multiple conflicts
- **Deliverable:** Bulk conflict resolution

### Phase 5: Export Functionality (Sequential)

#### Task 5.1: Implement JSON Generation
- Create `src/editor/ExportManager.js`
- Query database for translations by locale
- Use `editedValue` if `isEdited = true`, else `value`
- Reconstruct JSON structure (simple and plural)
- Handle special characters and escaping
- **Validation:** Generated JSON matches original format
- **Deliverable:** JSON generation logic

#### Task 5.2: Add Export Validation
- Validate JSON is well-formed
- Check parameter consistency
- Verify plural structure integrity
- Display warnings for issues
- Allow user to proceed or cancel
- **Validation:** Validation catches common errors
- **Deliverable:** Export validation system

#### Task 5.3: Implement File Download
- Generate Blob from JSON string
- Create download link with `{locale}.json` filename
- Trigger browser download
- Show success/error feedback
- **Validation:** Files download with correct names and content
- **Deliverable:** Single file download

#### Task 5.4: Add Multi-Locale Export
- Implement sequential downloads for all locales
- Add delay between downloads to avoid browser blocking
- Show progress indicator
- **Validation:** All locale files download successfully
- **Deliverable:** Multi-locale export

#### Task 5.5: Add ZIP Export (Optional)
- Integrate ZIP library (e.g., JSZip)
- Bundle all locale JSON files into single ZIP
- Name ZIP file with timestamp
- Trigger ZIP download
- **Validation:** ZIP contains all expected files
- **Deliverable:** ZIP export functionality

### Phase 6: Polish & Integration (Parallel-safe)

#### Task 6.1: Add Keyboard Shortcuts
- ESC closes popup and modal
- Ctrl/Cmd+S saves translation in popup
- Tab navigation through controls
- Document shortcuts in UI
- **Validation:** All shortcuts work as expected
- **Deliverable:** Keyboard accessibility

#### Task 6.2: Add Loading States
- Show spinners during async operations
- Disable buttons during processing
- Display progress indicators
- **Validation:** UI provides clear feedback
- **Deliverable:** Loading state UX

#### Task 6.3: Error Handling
- Add try-catch blocks around all async operations
- Display user-friendly error messages
- Log detailed errors to console
- Add retry mechanisms where appropriate
- **Validation:** Errors display gracefully
- **Deliverable:** Robust error handling

#### Task 6.4: Performance Optimization
- Implement event delegation for overlay clicks
- Debounce search/filter operations
- Use requestAnimationFrame for animations
- Lazy-load editor components
- **Validation:** Performance tests show no degradation
- **Deliverable:** Optimized performance

#### Task 6.5: Accessibility
- Add ARIA labels to all interactive elements
- Ensure keyboard navigation works
- Test with screen readers
- Use semantic HTML
- Ensure color contrast meets WCAG guidelines
- **Validation:** Accessibility audit passes
- **Deliverable:** Accessible UI

#### Task 6.6: Mobile Responsiveness
- Test on mobile viewport sizes
- Adjust modal sizing for small screens
- Make touch targets appropriately sized
- Test popup positioning on mobile
- **Validation:** UI works on mobile devices
- **Deliverable:** Mobile-friendly interface

### Phase 7: Documentation & Testing

#### Task 7.1: Write Unit Tests
- Test database CRUD operations
- Test key extraction logic
- Test JSON generation
- Test conflict detection
- Aim for 80%+ code coverage
- **Validation:** All tests pass
- **Deliverable:** Unit test suite

#### Task 7.2: Write Integration Tests
- Test end-to-end edit workflow
- Test sync with conflicts
- Test export functionality
- Test overlay mode enable/disable
- **Validation:** Integration tests pass
- **Deliverable:** Integration test suite

#### Task 7.3: Update Documentation
- Document new database schema in CLAUDE.md
- Add usage instructions to README
- Document keyboard shortcuts
- Add architecture diagrams
- **Validation:** Documentation is clear and complete
- **Deliverable:** Updated documentation

#### Task 7.4: Create Demo Video
- Record screen capture of features
- Show edit workflow
- Show conflict resolution
- Show export process
- **Validation:** Video demonstrates all features
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
- **Bundle size tests:** Verify 0 KB editor code when debug disabled
- **Manual testing:** For UX and edge cases
- **Accessibility testing:** With screen readers and keyboard only
- **Performance testing:** With 1000+ translations
- **Cross-browser testing:** Chrome, Firefox, Safari, Edge

### Critical Tests

**Bundle Size Verification:**
```bash
# Test 1: Production build without debug
VITE_PARAGLIDE_BROWSER_DEBUG=false npm run build
npm run analyze-bundle  # Should show 0 KB editor modules

# Test 2: Production build with debug
VITE_PARAGLIDE_BROWSER_DEBUG=true npm run build
npm run analyze-bundle  # Should show ~50-100 KB editor modules

# Test 3: Development mode
npm run dev  # Editor should load if .env has debug=true
```

## Rollout Plan

1. Develop in feature branch `feature/translation-editor`
2. Deploy to staging environment for testing
3. Gather feedback from team
4. Address feedback and bugs
5. Merge to main and deploy to production
6. Monitor for issues
7. Iterate based on usage patterns

# Design: Browser Translation Editor

**Change ID:** `add-browser-translation-editor`

## Architecture Overview

The browser translation editor consists of four main components:

```
┌─────────────────────────────────────────┐
│         Floating UI Widget              │
│  (FloatingButton + Modal)               │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼───────┐   ┌─────▼──────┐
│  Overlay  │   │  Settings  │
│  Manager  │   │  Manager   │
└───┬───────┘   └─────┬──────┘
    │                 │
    └────────┬────────┘
             │
    ┌────────▼────────┐
    │   Translation   │
    │   Data Store    │
    │   (IndexedDB)   │
    └─────────────────┘
```

## Framework Compatibility

The editor SHALL be **framework-agnostic** and work with:
- **Vanilla JavaScript** (no framework)
- **React Router** (client-side routing)
- **SvelteKit** (server-side + client-side routing)
- **Other frameworks** using Paraglide

### Design Principles for Cross-Framework Support

1. **No Framework Dependencies**
   - Use vanilla JavaScript for all editor code
   - No React, Svelte, or framework-specific APIs
   - Interact only with standard DOM APIs

2. **Global Initialization**
   - Editor attaches to `document.body` (always available)
   - Uses Shadow DOM or isolated CSS to avoid conflicts
   - Manages its own lifecycle independently

3. **Routing Compatibility**
   - Listen for route changes via `MutationObserver` on document body
   - Re-scan for translation comments after DOM updates
   - Handle dynamic content without full page reloads

4. **Translation Persistence**
   - IndexedDB works identically across all frameworks
   - Export/import JSON works regardless of framework
   - State is independent of framework routing

## Component Details

### 1. Floating UI Widget

**Location:** `examples/vanilla/src/editor/FloatingWidget.js`

```javascript
class FloatingWidget {
  - button: HTMLElement       // Bottom-right floating button
  - modal: Modal             // Translation management modal
  - isOpen: boolean

  + render()
  + toggle()
  + show()
  + hide()
}
```

**Styling:**
- Fixed position: `bottom: 20px; right: 20px`
- z-index: 9999
- Semi-transparent when collapsed
- Smooth animations for open/close

### 2. Translation Management Modal

**Location:** `examples/vanilla/src/editor/Modal.js`

Contains four sections:

#### A. Language Selector
```javascript
class LanguageSelector {
  - currentLocale: string
  - availableLocales: string[]

  + render()
  + onChange(locale: string)
}
```

#### B. Sync Controls
```javascript
class SyncControls {
  - lastSyncTime: Date
  - syncStatus: 'idle' | 'syncing' | 'error'

  + syncTranslations()
  + showSyncResults(stats)
}
```

#### C. Overlay Toggle
```javascript
class OverlayToggle {
  - isEnabled: boolean

  + toggle()
  + enable()
  + disable()
}
```

#### D. Download Controls
```javascript
class DownloadControls {
  + downloadModifiedTranslations()
  + generateJSONFiles()
}
```

### 3. Overlay Manager

**Location:** `examples/vanilla/src/editor/OverlayManager.js`

```javascript
class OverlayManager {
  - isActive: boolean
  - clickHandler: Function
  - editPopup: EditPopup

  + enable()
  + disable()
  + handleClick(event)
  + extractTranslationKey(element)
  + showEditPopup(key, value, element)
}
```

**Click Detection Strategy:**
Uses the HTML comments injected by the editor plugin:
```html
<!-- paraglide:welcome -->Welcome!<!-- /paraglide:welcome -->
```

Algorithm:
1. Listen for clicks on document when overlay is enabled
2. For clicked element, traverse up DOM tree
3. Check if element or ancestor has translation comment
4. Parse comment to extract key
5. Show edit popup

### 4. Edit Popup

**Location:** `examples/vanilla/src/editor/EditPopup.js`

```javascript
class EditPopup {
  - key: string
  - currentValue: string
  - originalValue: string
  - locale: string
  - element: HTMLElement

  + render()
  + show(key, value, element)
  + hide()
  + save()
  + hasChanges(): boolean
  + showDiff(): void
}
```

**Features:**
- Textarea for editing translation
- Character count
- Save/Cancel buttons
- Diff indicator if value differs from server
- Position near clicked element (smart positioning to stay in viewport)

### 5. Translation Data Store

**Location:** `examples/vanilla/src/editor/TranslationStore.js`

Extends existing `db.js` with additional fields:

```javascript
// Enhanced database schema
{
  id: string,              // "{locale}:{key}"
  locale: string,
  key: string,
  value: string,           // Current value (server or edited)
  originalValue: string,   // Last synced value from server
  editedValue: string,     // User's edit (if different)
  isEdited: boolean,       // Has local edit
  lastEditTime: Date,      // When edited locally
  lastSyncTime: Date,      // When last synced from server
  hasConflict: boolean     // editedValue != originalValue after sync
}
```

**Methods:**
```javascript
+ getTranslation(locale, key)
+ saveEdit(locale, key, newValue)
+ getModifiedTranslations(locale)
+ getConflicts()
+ resolveConflict(locale, key, resolution)
+ markAsSynced(locale, key, serverValue)
```

## Data Flow

### Initial Load
```
1. Page loads → Debug plugin wraps translations with HTML comments
2. User opens editor widget
3. Editor initializes IndexedDB
4. Shows current state (if any previous edits)
```

### Sync Operation
```
1. User clicks "Sync"
2. Fetch /paraglide-editor-langs.json
3. For each translation:
   a. Check if exists in DB
   b. If new: Add with originalValue = serverValue
   c. If exists and not edited: Update originalValue
   d. If exists and edited: Mark hasConflict if serverValue differs
4. Show sync results + conflict count
```

### Edit Operation
```
1. User enables overlay
2. Clicks translated element
3. Extract key from HTML comment
4. Load current value from IndexedDB (or fallback to DOM text)
5. Show edit popup
6. User edits and saves
7. Update IndexedDB:
   - editedValue = new value
   - isEdited = true
   - lastEditTime = now
8. Update DOM immediately with new value
9. Keep HTML comment wrapper intact
```

### Export Operation
```
1. User clicks "Download"
2. For each locale:
   a. Query all translations for that locale
   b. If isEdited: use editedValue
   c. Else: use value (originalValue)
   d. Reconstruct JSON structure (including plurals)
3. Generate blob with JSON
4. Trigger download: "{locale}.json"
```

### Conflict Resolution
```
1. After sync, check for conflicts (hasConflict = true)
2. Show conflict count in UI
3. User clicks "Resolve Conflicts"
4. For each conflict, show diff UI:
   - Left: editedValue (user's change)
   - Right: originalValue (server's version)
   - Options: Keep Local | Keep Server | Merge
5. User resolves each conflict
6. Update DB and clear conflict flag
```

## Client-Side Routing Support

### Challenge
Frameworks with client-side routing (React Router, SvelteKit) update the DOM without full page reloads. New translations may appear dynamically without the editor being notified.

### Solution: MutationObserver

```javascript
class OverlayManager {
  constructor() {
    this.observer = null;
  }

  enable() {
    // Set up mutation observer to detect new translations
    this.observer = new MutationObserver((mutations) => {
      // Check if any mutations added nodes with translation comments
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          this.refreshTranslationMarkers();
        }
      }
    });

    // Observe the entire document for changes
    this.observer.observe(document.body, {
      childList: true,  // Detect added/removed nodes
      subtree: true     // Monitor entire tree
    });

    this.refreshTranslationMarkers();
  }

  disable() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  refreshTranslationMarkers() {
    // Re-scan DOM for translation comments
    // Update visual indicators for editable elements
  }
}
```

### Framework-Specific Notes

**React Router:**
- Editor initializes once on app load
- MutationObserver detects route changes automatically
- Works with React 18+ concurrent rendering

**SvelteKit:**
- Works with both SSR and CSR
- MutationObserver handles route transitions
- Compatible with `goto()` and `<a>` navigation

**Vanilla:**
- Direct initialization
- No special considerations

## Click Interception Implementation

### Approach: Comment-Based Detection

```javascript
function findTranslationKey(element) {
  let node = element;

  // Traverse up to find translation wrapper
  while (node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      // Check if this element has translation comments
      const comments = getCommentsForElement(node);
      for (const comment of comments) {
        const match = comment.textContent.match(/^paraglide:(\w+)/);
        if (match) {
          return match[1]; // Return the key
        }
      }
    }
    node = node.parentElement;
  }

  return null;
}

function getCommentsForElement(element) {
  const comments = [];
  let node = element.previousSibling;

  // Check previous sibling for opening comment
  while (node) {
    if (node.nodeType === Node.COMMENT_NODE) {
      if (node.textContent.includes('paraglide:')) {
        comments.push(node);
        break;
      }
    }
    if (node.nodeType === Node.ELEMENT_NODE) break;
    node = node.previousSibling;
  }

  return comments;
}
```

### Alternative Approach: Data Attributes

If comment parsing becomes unreliable, we could modify the editor plugin to also add data attributes:

```javascript
// In editor plugin wrapper:
function __editorWrap(text, key, params) {
  // Instead of just returning HTML comment + text
  // Return a span with data attribute
  return `<span data-paraglide-key="${key}" data-paraglide-params="${JSON.stringify(params)}">${text}</span>`;
}
```

**Decision:** Start with comment-based approach since it's already implemented and non-invasive. Fall back to data attributes if needed.

## UI Component Library Decision

### Options Considered

1. **Vanilla JavaScript** (Recommended)
   - Pros: No dependencies, lightweight, matches existing code
   - Cons: More code to write

2. **Preact**
   - Pros: Lightweight React alternative, good DX
   - Cons: Additional dependency

3. **Lit**
   - Pros: Web components, good for widgets
   - Cons: Learning curve

**Decision:** Use vanilla JavaScript with a simple component abstraction layer to keep dependencies minimal and maintain consistency with the existing codebase.

## Styling Strategy

### CSS Architecture

```
src/editor/
  ├── styles/
  │   ├── base.css          # Reset, variables
  │   ├── floating-widget.css
  │   ├── modal.css
  │   ├── edit-popup.css
  │   └── overlay.css       # Overlay mode styles
```

### CSS Variables
```css
:root {
  --editor-primary: #667eea;
  --editor-danger: #f56565;
  --editor-success: #48bb78;
  --editor-bg: rgba(255, 255, 255, 0.95);
  --editor-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  --editor-z-index: 999999;
}
```

### Dark Mode Support
Use system preference detection:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --editor-bg: rgba(30, 30, 30, 0.95);
    /* ... */
  }
}
```

## Performance Considerations

### Conditional Loading (Critical)
The editor SHALL NOT be included in builds when editor mode is disabled.

**Implementation Strategy:**
```javascript
// In main.js or app entry point
if (import.meta.env.VITE_PARAGLIDE_EDITOR === 'true') {
  // Dynamically import editor only in editor mode
  import('./editor/index.js').then(({ initEditor }) => {
    initEditor();
  });
}
```

**Vite Tree-Shaking:**
- Use dynamic imports with `import()` syntax
- Vite will tree-shake the entire editor module in production builds
- When `VITE_PARAGLIDE_EDITOR` is not 'true', the import is never executed
- Dead code elimination removes the editor from the bundle

**Bundle Analysis:**
- Production bundle (editor=false): 0 KB editor code
- Development bundle (editor=true): ~50-100 KB editor code (lazy loaded)

**Verification:**
```bash
# Production build without debug
VITE_PARAGLIDE_EDITOR=false npm run build
# Check bundle - should NOT contain editor code

# Production build with debug
VITE_PARAGLIDE_EDITOR=true npm run build
# Check bundle - should contain editor code
```

### Lazy Loading
- Editor code only loads when explicitly needed
- Floating button itself is lazily imported
- Modal and overlay components loaded on first use

### Event Delegation
- Single click listener on document (not per element)
- Only active when overlay mode is enabled
- Remove listener when overlay is disabled

### DOM Updates
- Use `requestAnimationFrame` for smooth animations
- Batch DOM updates where possible
- Virtual scrolling for large translation lists

### IndexedDB Queries
- Index on `isEdited` for quick filtering
- Index on `hasConflict` for conflict resolution
- Batch operations for sync

## Security Considerations

### XSS Prevention
- Sanitize all user input before saving
- Use `textContent` instead of `innerHTML` where possible
- Escape HTML entities in translations

### Data Validation
- Validate translation keys match expected format
- Check locale codes against allowed list
- Limit string length (e.g., max 10,000 characters)

## Testing Strategy

### Unit Tests
- TranslationStore CRUD operations
- Key extraction from HTML comments
- Conflict detection logic
- JSON export generation

### Integration Tests
- End-to-end edit workflow
- Sync with conflict resolution
- Download functionality

### Manual Testing Checklist
- [ ] Open editor widget
- [ ] Switch languages
- [ ] Sync translations
- [ ] Enable overlay mode
- [ ] Click and edit translation
- [ ] Changes reflect immediately
- [ ] Download modified files
- [ ] Create conflict and resolve
- [ ] Disable overlay mode
- [ ] Close and reopen (persistence)

## Migration Path

### Existing Database
Current schema:
```javascript
{
  id: string,
  locale: string,
  key: string,
  value: string,
  timestamp: number
}
```

New schema adds:
```javascript
{
  // ... existing fields
  originalValue: string,    // NEW
  editedValue: string,      // NEW
  isEdited: boolean,        // NEW
  lastEditTime: Date,       // NEW
  lastSyncTime: Date,       // NEW (rename from timestamp)
  hasConflict: boolean      // NEW
}
```

**Migration Strategy:**
1. Bump database version to 2
2. In `onupgradeneeded`:
   - Add new fields with default values
   - Migrate `timestamp` → `lastSyncTime`
   - Set `originalValue` = `value` for existing records
   - Set `isEdited` = false
   - Set `hasConflict` = false

## Resolved Questions

1. **Plural translations:** ✅ RESOLVED
   - When clicking on a plural translation key, show all plural variants (one, other, etc.)
   - Display separate input fields for each condition
   - Allow editing each variant independently

2. **Parameter handling:** ✅ RESOLVED
   - Keep the same parameters as the original translation
   - Display parameters clearly in the edit UI (highlight them)
   - Validate that parameters are preserved during editing

3. **Nested translations:** ✅ NOT NEEDED
   - Paraglide uses flat structure with prefixes (e.g., `ui_button_save`, not nested objects)
   - No special handling needed for nested translations

4. **Undo/Redo:** ✅ NOT FOR NOW
   - Out of scope for initial implementation
   - Can be added as future enhancement if needed

## Decision Log

| Decision | Rationale | Date |
|----------|-----------|------|
| Use HTML comments for key detection | Already implemented, non-invasive | 2025-12-02 |
| Vanilla JS for UI | Minimize dependencies, match existing code | 2025-12-02 |
| IndexedDB for storage | Already implemented, good for offline | 2025-12-02 |
| Comment-based click detection | Leverages existing editor plugin output | 2025-12-02 |
| Show all plural variants when editing | Allows editing each condition independently | 2025-12-02 |
| Preserve and validate parameters | Ensures translations remain functional | 2025-12-02 |
| No nested translation support | Paraglide uses flat structure with prefixes | 2025-12-02 |
| Defer undo/redo to future | Keep initial scope focused | 2025-12-02 |
| Dynamic import with env check | Zero code in production when editor disabled | 2025-12-02 |
| Framework-agnostic design | Works with React Router, SvelteKit, vanilla | 2025-12-02 |
| MutationObserver for routing | Detects DOM changes from client-side routing | 2025-12-02 |

## Future Enhancements (Out of Scope)

- **Undo/Redo functionality** - Edit history with undo stack
- Translation memory and suggestions
- Integration with translation services (Google Translate, DeepL)
- Real-time collaboration
- Version history
- Translation validation rules
- Batch operations (approve all, reject all)
- Search and filter translations
- Translation statistics and coverage reports

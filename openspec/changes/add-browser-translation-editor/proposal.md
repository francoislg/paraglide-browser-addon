# Proposal: Add Browser Translation Editor

**Change ID:** `add-browser-translation-editor`
**Status:** Draft
**Created:** 2025-12-02

## Overview

Add a comprehensive in-browser translation editor that allows developers and translators to edit translation strings directly in the context where they appear, without needing to modify JSON files manually.

## Problem Statement

Currently, translating strings requires:
1. Finding the translation key in the codebase
2. Opening the appropriate `{locale}.json` file
3. Editing the JSON manually
4. Reloading the page to see changes
5. No visual context for where the translation appears

This workflow is disconnected from the actual UI and makes it difficult for non-technical translators to contribute effectively.

## Proposed Solution

Create a browser-based translation editor with:

### 1. Floating UI Widget
- Small button fixed to bottom-right corner
- Opens modal with translation management tools
- Non-intrusive, can be minimized

### 2. Translation Management Modal
Contains:
- **Language selector** - Switch between available locales
- **Sync button** - Pull latest translations from `/paraglide-editor-langs.json`
- **Overlay toggle** - Enable/disable edit mode
- **Download button** - Export modified translations as JSON files

### 3. Interactive Overlay Mode
- Click any translated element to edit it in-place
- Shows popup editor with current translation
- Save button persists changes to IndexedDB
- Changes reflect immediately in the UI
- Visual indicators for edited translations

### 4. Change Tracking & Conflict Resolution
- Track when translations were last edited locally
- Detect differences between local edits and server versions
- Provide diff editor for conflict resolution
- Show which keys were added since last sync
- Prevent accidental overwrites of local changes

## Current Foundation

Already implemented:
- ✅ Debug plugin that injects HTML comments with translation keys
- ✅ IndexedDB database for storing translations
- ✅ Sync functionality to fetch from `/paraglide-editor-langs.json`
- ✅ Detection of new/updated keys

## User Workflow

1. Developer enables editor mode (`VITE_PARAGLIDE_EDITOR=true`)
2. Opens page with translations
3. Clicks floating editor button
4. Clicks "Sync" to load current translations
5. Enables overlay mode
6. Clicks on any translated text
7. Edits translation in popup
8. Saves changes (stored in IndexedDB)
9. Changes appear immediately in UI
10. Downloads modified translations when done

## Benefits

- **Contextual editing** - See translations in their actual UI context
- **Faster iteration** - No file editing or page reloads needed
- **Non-technical friendly** - Translators don't need code knowledge
- **Conflict resolution** - Clear diff UI for handling concurrent edits
- **Safe editing** - Changes stored locally until explicitly exported

## Technical Considerations

### Dependencies
- Existing editor plugin infrastructure
- IndexedDB database (already implemented)
- Click event interception
- UI component library or custom components

### Performance
- Edit mode only active when explicitly enabled
- Minimal performance impact when disabled
- Event delegation for click handling

### Data Flow
1. **Load**: Server → IndexedDB → UI
2. **Edit**: UI → IndexedDB → Immediate UI update
3. **Export**: IndexedDB → Downloaded JSON files
4. **Sync**: Detect conflicts, merge strategies

## Out of Scope

- User authentication/authorization
- Server-side persistence
- Real-time collaboration
- Translation memory/suggestions
- Automated translations

## Success Criteria

1. Can click any translated element and edit it
2. Changes persist across page reloads
3. Can export all modified translations
4. Conflict resolution works correctly
5. No performance degradation when disabled
6. Works across all three supported locales (en, es, fr)

## Next Steps

1. Create detailed design document
2. Define spec deltas for each capability
3. Break into implementation tasks
4. Validate with strict OpenSpec checks

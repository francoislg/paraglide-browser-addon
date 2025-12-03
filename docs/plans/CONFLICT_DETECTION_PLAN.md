# Smart Conflict Detection Plan

## Current Problem

The current conflict detection is too aggressive - it flags conflicts whenever:
- Server has a value for a key
- User has a local edit for that key

This creates unnecessary conflicts even when:
- The server value hasn't changed since the user's last sync
- The user's edit matches the new server value

## New Requirements

A conflict should **ONLY** be flagged when **ALL** of these conditions are true:

1. **Server value has changed** - `newServerValue !== originalValue` (from last sync)
2. **User has a local edit** - `isEdited === true`
3. **User's edit differs from new server value** - `editedValue !== newServerValue`

## Non-Conflict Scenarios

**Scenario A: Server unchanged, user edited**
```
originalValue: "Hello"
newServerValue: "Hello" (no change)
editedValue: "Hi there"
→ NO CONFLICT (server didn't change, user can keep their edit)
```

**Scenario B: Server changed, but user's edit matches**
```
originalValue: "Hello"
newServerValue: "Hi there"
editedValue: "Hi there" (matches new server)
→ NO CONFLICT (user made the same change, sync accepted)
```

**Scenario C: True conflict**
```
originalValue: "Hello"
newServerValue: "Bonjour"
editedValue: "Hi there"
→ CONFLICT (server changed, user edited differently)
```

## Current Database Schema

```javascript
{
  locale: string,
  key: string,
  editedValue: string,      // User's edit
  originalValue: string,    // Server value at time of edit OR last sync
  isEdited: boolean,
  hasConflict: boolean,
  lastEditTime: Date,
  lastSyncTime: Date
}
```

✅ Schema already supports this - `originalValue` stores the baseline!

## Implementation Plan

### Step 1: Update `syncTranslations()` in `db.js`

**Location**: `packages/vite-plugin-paraglide-debug/src/runtime/db.js`

**Current logic** (~line 200):
```javascript
if (isEdited && newValue !== editedValue) {
  hasConflict = true;
}
```

**New logic**:
```javascript
// Only flag conflict if:
// 1. Server value changed (newValue !== originalValue)
// 2. User has edit (isEdited === true)
// 3. User's edit differs from new server (editedValue !== newValue)

const serverChanged = newValue !== existingRecord.originalValue;
const userEditDiffers = editedValue !== newValue;

if (isEdited && serverChanged && userEditDiffers) {
  hasConflict = true;
} else {
  hasConflict = false;
}

// If user's edit matches new server value, we can auto-accept it
if (isEdited && !serverChanged) {
  // Server hasn't changed, keep user's edit as-is
  // Don't update originalValue
} else if (isEdited && editedValue === newValue) {
  // User made the same change as server, mark as synced
  // Could optionally clear the edit since it matches server
  hasConflict = false;
  isEdited = false; // Optional: clear edit flag since it matches server
}
```

### Step 2: Update Conflict Resolution Documentation

**Location**: `packages/vite-plugin-paraglide-debug/src/runtime/db.js` (add comments)

Add detailed comments explaining the conflict detection logic.

### Step 3: Update Sync Stats

**Location**: `packages/vite-plugin-paraglide-debug/src/runtime/sync.js`

Update the sync summary to show:
- `autoResolved` - Edits that matched new server values (conflict avoided)
- `conflicts` - True conflicts requiring user decision

### Step 4: Test Scenarios

Create test cases for:
1. ✅ Server unchanged, user edited → No conflict
2. ✅ Server changed, user's edit matches → Auto-resolve, no conflict
3. ✅ Server changed, user edited differently → Conflict
4. ✅ Server changed, no user edit → Simple update

## Files to Modify

1. **`packages/vite-plugin-paraglide-debug/src/runtime/db.js`** (~line 200)
   - Update `syncTranslations()` conflict detection logic

2. **`packages/vite-plugin-paraglide-debug/src/runtime/sync.js`**
   - Update sync stats to include auto-resolved count

3. **Documentation** (this file)
   - Explain the smart conflict detection

## Benefits

- **Fewer false positives**: Only show conflicts that actually need user decision
- **Better UX**: Users don't see conflicts when server hasn't changed
- **Auto-resolution**: Edits matching server values are automatically accepted
- **Clearer workflow**: Conflicts only appear when there's a real divergence

## Edge Cases to Handle

1. **Plural translations**: Compare JSON-stringified versions for consistency
2. **Empty values**: Handle null/undefined/empty string comparisons
3. **Whitespace**: Consider trimming for comparison (optional)
4. **Type safety**: Handle mixed types (objects vs strings)

## Testing

After implementation, test with:
```bash
cd examples/vanilla && npm run build && npm run preview
```

Scenarios to verify:
- Edit a translation → Sync (server unchanged) → Should NOT show conflict
- Edit translation to match server → Sync → Should auto-resolve
- Edit translation differently → Sync with server change → Should show conflict

## Why

The click-handling and element-cycling logic in `overlay.js` is tangled with popup creation, slot reading, and outline management. This makes the cycle detection hard to test and reason about independently. Additionally, the current cycle detection uses a pixel-based `isSamePoint()` with a 5px threshold, which causes re-opening the popup when clicking the same element at a slightly different position. Replacing it with layer-based detection (comparing the actual candidate element lists) fixes this bug and makes the behavior deterministic.

## What Changes

- **Extract `elementPicker.js`** — a new module that owns all click handling (mousedown/mouseup/click suppression) and keyboard events (Escape to deselect). It emits a single `pge-element-picked` CustomEvent with `{ element, cyclePosition, cycleTotal }` and does nothing else.
- **Replace pixel-based cycle detection with layer-based detection** — instead of comparing click coordinates with a 5px threshold (`isSamePoint`), compare the actual candidate element arrays from `document.elementsFromPoint()` using reference equality (`sameCandidates`).
- **Refactor `overlay.js`** — remove all click/keyboard handling. Subscribe to the `pge-element-picked` event to handle popup creation, slot reading, outline updates, and cycle badge injection.

## Capabilities

### New Capabilities
- `element-picker`: Pure element selection via click and keyboard. Determines which translatable element the user intended to select using layer-based cycle detection. Emits a `pge-element-picked` event.

### Modified Capabilities
_None. No existing top-level specs are affected. The overlay-mode spec under the `add-browser-translation-editor` change describes overlay behavior at a higher level; this change is an internal refactor that preserves all external behavior._

## Impact

- **Files created:** `packages/vite-plugin-paraglide-editor/src/runtime/elementPicker.js`
- **Files modified:** `packages/vite-plugin-paraglide-editor/src/runtime/overlay.js` (remove ~100 lines of click handling, add ~30 lines of event subscription)
- **No API changes:** The public API (`initOverlayMode`, `refreshElement`, `refreshElementsByKey`, etc.) is unchanged.
- **No breaking changes:** All existing behavior is preserved. The only observable difference is that clicking the same element at a different pixel position now correctly deselects instead of re-opening.

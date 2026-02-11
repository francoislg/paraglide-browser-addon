## Context

The overlay system in `overlay.js` currently handles three concerns in one function (`initOverlayMode`):

1. **Input handling** — mousedown/mouseup/click listeners, shift-click bypass, drag-across validation
2. **Cycle detection** — determining which overlapping element to select next
3. **Popup orchestration** — reading slots, creating the edit popup, injecting cycle badges, watching for popup removal

This coupling makes it hard to reason about the click behavior independently. The cycle detection also uses a pixel-based `isSamePoint()` with a 5px threshold, which fails when users click the same element at a slightly different position (>5px away), causing the popup to re-open instead of closing.

### Current state

- `overlay.js` has ~580 lines, with ~190 lines dedicated to click handling inside `initOverlayMode`
- State variables `mouseDownElement`, `suppressNextClick`, `cycleCandidates`, `cycleIndex`, `cyclePoint` are all local to `initOverlayMode`
- `isSamePoint()` compares `{x, y}` coordinates with threshold — fundamentally fragile
- `getCandidatesAtPoint()` calls `document.elementsFromPoint()` and filters for `[data-paraglide-key]` elements

## Goals / Non-Goals

**Goals:**
- Extract click/keyboard handling into a standalone `elementPicker.js` module
- Replace pixel-based cycle detection with layer-based detection (compare candidate arrays by reference)
- The picker emits a single `pge-element-picked` event and does nothing else
- `overlay.js` subscribes to this event for popup creation, outline updates, etc.
- Preserve all existing user-facing behavior (single click, cycling, shift-click bypass, drag-across rejection, Escape to close)

**Non-Goals:**
- Changing the popup UI or slot system
- Modifying how outlines are applied
- Adding new interaction modes (e.g., hover-to-preview)
- Changing the public API of `overlay.js`

## Decisions

### 1. Layer-based cycle detection replaces pixel-based

**Decision:** Compare candidate element arrays using `sameCandidates(a, b)` (reference equality per element, same order) instead of comparing click point coordinates.

**Rationale:** `document.elementsFromPoint()` returns the same ordered list for any click position that hits the same stack of elements. Two clicks on the same `<span>` at different pixel positions produce identical candidate arrays. This is deterministic and doesn't need a threshold.

**Alternative considered:** Increasing the pixel threshold (e.g., to 20px). Rejected because any threshold is fragile — large elements would still break, and small elements would false-positive with neighbors.

### 2. elementPicker.js is pure input → event

**Decision:** The picker only determines `{ element, cyclePosition, cycleTotal }` and dispatches `pge-element-picked`. It does NOT read slots, create popups, or modify outlines.

**Rationale:** Single responsibility. The picker answers "which element?" — overlay answers "what to do with it?" This makes the picker testable in isolation and reusable if we ever add keyboard navigation or other selection modes.

### 3. Communication via CustomEvent on document

**Decision:** Use `document.dispatchEvent(new CustomEvent('pge-element-picked', { detail }))` rather than a callback.

**Rationale:** Decouples the modules. The picker doesn't need a reference to overlay functions. Multiple listeners could subscribe (e.g., for analytics or debugging). The event is synchronous, so the overlay handler runs before the next frame.

**Alternative considered:** Passing a callback to `initElementPicker()`. Rejected because it creates a direct dependency and makes it harder to add additional listeners.

### 4. Escape key handled by elementPicker

**Decision:** The picker listens for Escape and emits a `pge-element-picked` with `element: null` when a popup is open.

**Rationale:** The picker owns all input events that affect element selection. Deselection is a selection action (selecting nothing). The popup's own `setupEscapeKey` in `popup.js` also fires — both removing the popup is idempotent.

### 5. Picker reads popupElement via getter, never sets it

**Decision:** `initElementPicker({ isOverlayEnabled, getPopupElement })` — the picker calls `getPopupElement()` to check if a popup is open (needed for cycle logic), but never calls `setPopupElement`.

**Rationale:** The picker should not have write access to popup state. It informs via events; the overlay decides what to do.

## Risks / Trade-offs

- **Double Escape handling** — Both elementPicker and popup.js handle Escape. The popup's handler removes the DOM element; the picker's handler emits a null pick. Both paths converge on the same result (popup closed, element deselected). The overlay's MutationObserver also catches popup removal. Risk: slight redundancy. Mitigation: idempotent operations make double-fire safe. A future cleanup can remove `setupEscapeKey` from popup.js.

- **Event ordering** — The `pge-element-picked` event is dispatched synchronously during the mouseup handler (capture phase). The overlay's listener runs in the same tick. Risk: if a future listener calls `preventDefault()` on the CustomEvent, it won't affect behavior since we don't check `defaultPrevented`. Mitigation: not a real risk given current architecture.

- **Stale popupElement reference** — The picker calls `getPopupElement()` during mousedown (to decide whether to `preventDefault`) and mouseup (for cycle logic). If the popup is removed between mousedown and mouseup (e.g., by an async operation), `getPopupElement()` returns a stale reference. Mitigation: the picker checks `document.getElementById("pge-edit-popup")` to detect stale state.

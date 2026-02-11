## 1. Create elementPicker.js

- [x] 1.1 Create `packages/vite-plugin-paraglide-editor/src/runtime/elementPicker.js` with `initElementPicker({ isOverlayEnabled, getPopupElement })` export
- [x] 1.2 Implement `getCandidatesAtPoint(x, y)` — filter `document.elementsFromPoint()` for `[data-paraglide-key]`, skip `.pge-ignore-detection`
- [x] 1.3 Implement `sameCandidates(a, b)` — compare arrays by element reference and order
- [x] 1.4 Implement mousedown handler — track `mouseDownElement`, call `preventDefault` only when selection will occur (not when pass-through)
- [x] 1.5 Implement mouseup handler — layer-based cycle logic, dispatch `pge-element-picked` event, suppress/allow native click
- [x] 1.6 Implement click suppressor — capture-phase listener that blocks the click event after a selection
- [x] 1.7 Implement Escape key handler — dispatch `pge-element-picked` with `element: null` when popup is open
- [x] 1.8 Implement shift-click bypass and drag-across rejection
- [x] 1.9 Return `{ resetCycle }` from `initElementPicker` for overlay to call on disable

## 2. Refactor overlay.js

- [x] 2.1 Remove click handling state from `initOverlayMode`: `mouseDownElement`, `suppressNextClick`, `cycleCandidates`, `cycleIndex`, `cyclePoint`
- [x] 2.2 Remove functions: `isSamePoint()`, `getCandidatesAtPoint()`
- [x] 2.3 Remove event listeners: mousedown, mouseup, click suppressor (all three)
- [x] 2.4 Import and call `initElementPicker()` inside `initOverlayMode`, passing `isOverlayEnabled` and `getPopupElement` callbacks
- [x] 2.5 Add `pge-element-picked` event listener that handles: reading slots, creating popup, injecting cycle badge, setting up MutationObserver
- [x] 2.6 On `element: null` from the event: call `setPopupElement(null)` and remove the popup element
- [x] 2.7 Call `resetCycle()` in `setOverlayMode(false)`

## 3. Verification

- [ ] 3.1 Test single element: click opens popup, click again closes and native click fires *(manual)*
- [ ] 3.2 Test overlapping elements: click cycles through layers, pass-through after last *(manual)*
- [ ] 3.3 Test different element: with popup open, click different element switches popup *(manual)*
- [ ] 3.4 Test shift-click: passes through without interception *(manual)*
- [ ] 3.5 Test drag across elements: ignored, no popup opened *(manual)*
- [ ] 3.6 Test Escape key: closes popup and deselects element *(manual)*
- [ ] 3.7 Test click at different pixel position on same element: correctly treated as same layer stack (the bug fix) *(manual)*
- [ ] 3.8 Test clicks inside editor UI (.pge-ignore-detection): ignored by picker *(manual)*

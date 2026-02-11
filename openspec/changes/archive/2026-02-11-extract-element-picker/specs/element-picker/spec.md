## ADDED Requirements

### Requirement: Element selection via click

The element picker SHALL determine which translatable element (`[data-paraglide-key]`) the user intends to select when they click in overlay mode. It SHALL emit a `pge-element-picked` CustomEvent on `document` with `detail: { element, cyclePosition, cycleTotal }`.

#### Scenario: Click on a single translatable element
- **WHEN** overlay mode is enabled and the user clicks on an element with `data-paraglide-key`
- **THEN** the picker dispatches `pge-element-picked` with `element` set to that element, `cyclePosition: 1`, `cycleTotal: 1`

#### Scenario: Click on a non-translatable area
- **WHEN** overlay mode is enabled and the user clicks on an area with no `[data-paraglide-key]` ancestor
- **THEN** the picker does NOT dispatch any event and the native click fires normally

#### Scenario: Overlay mode disabled
- **WHEN** overlay mode is disabled
- **THEN** the picker does NOT intercept any clicks, regardless of what elements are present

### Requirement: Layer-based cycle detection

When multiple translatable elements overlap at the click point, the picker SHALL cycle through them using layer-based detection. Candidates are determined by `document.elementsFromPoint()` filtered to `[data-paraglide-key]` elements, ordered by z-stacking (topmost first). Subsequent clicks on the same layer stack SHALL advance the cycle. The picker SHALL compare candidate arrays by element reference identity and order (`sameCandidates`) rather than by click coordinates.

#### Scenario: Two overlapping elements — first click selects topmost
- **WHEN** two translatable elements overlap and the user clicks in the overlapping area
- **THEN** the picker selects the topmost element (`cyclePosition: 1`, `cycleTotal: 2`)

#### Scenario: Two overlapping elements — second click cycles to next
- **WHEN** the user clicks the same overlapping area again (same candidate stack)
- **THEN** the picker selects the second element (`cyclePosition: 2`, `cycleTotal: 2`)

#### Scenario: Cycle exhausted — pass through
- **WHEN** the user clicks the same overlapping area after all candidates have been cycled through
- **THEN** the picker dispatches `pge-element-picked` with `element: null` and does NOT call `preventDefault`/`stopPropagation`, allowing the native click to fire

#### Scenario: Click at different position on same element
- **WHEN** a popup is open for an element and the user clicks the same element at a different pixel position (but `elementsFromPoint` returns the same candidates)
- **THEN** the picker treats this as the same layer stack and advances the cycle (or deselects if single element)

#### Scenario: Different candidate stack resets cycle
- **WHEN** the user clicks on a different area with a different set of candidate elements
- **THEN** the cycle resets and the picker selects the topmost candidate of the new stack

### Requirement: Single-element deselection

When only one translatable element exists at the click point and a popup is already open for that element, clicking it again SHALL deselect it.

#### Scenario: Click same single element with popup open
- **WHEN** a popup is open for element A, only element A is at the click point, and the user clicks it
- **THEN** the picker dispatches `pge-element-picked` with `element: null` and the native click fires through

### Requirement: Smart first selection when popup is open

When a popup is open for an element and the user clicks a new area, the picker SHALL skip the already-open element if it appears first in the new candidate stack.

#### Scenario: Popup open, click new area where open element is topmost
- **WHEN** a popup is open for element A, the user clicks a new area where candidates are [A, B, C]
- **THEN** the picker selects element B (`cyclePosition: 2`, `cycleTotal: 3`), skipping A

#### Scenario: Popup open, click area where open element is not present
- **WHEN** a popup is open for element A, the user clicks a new area where candidates are [D, E]
- **THEN** the picker selects element D (`cyclePosition: 1`, `cycleTotal: 2`)

### Requirement: Click suppression for selected elements

When the picker selects an element, it SHALL prevent the native click from firing (to avoid link navigation, button activation, etc.).

#### Scenario: Clicking a link element selects it without navigating
- **WHEN** the user clicks a translatable `<a>` element in overlay mode
- **THEN** the picker calls `preventDefault` and `stopPropagation` on the mouseup event and suppresses the subsequent click event

#### Scenario: Pass-through does not suppress
- **WHEN** the picker deselects (element is null)
- **THEN** the picker does NOT call `preventDefault`/`stopPropagation`, allowing the native click to fire

### Requirement: Shift-click bypass

The picker SHALL NOT intercept clicks when the Shift key is held, allowing normal browser interaction.

#### Scenario: Shift-click on translatable element
- **WHEN** overlay mode is enabled and the user shift-clicks a translatable element
- **THEN** the picker ignores the click entirely and the native event fires normally

### Requirement: Drag-across rejection

The picker SHALL only act when mousedown and mouseup occur on the same translatable element (or its descendants). If the user drags from one element to another, the picker SHALL ignore the interaction.

#### Scenario: Mousedown on element A, mouseup on element B
- **WHEN** the user presses mousedown on element A and releases on element B (different candidate stacks)
- **THEN** the picker ignores the interaction and no event is dispatched

### Requirement: Ignore clicks inside editor UI

The picker SHALL NOT intercept clicks on elements inside `.pge-ignore-detection` containers (the editor's own UI elements like popups and modals).

#### Scenario: Click inside edit popup
- **WHEN** the user clicks inside an element with `.pge-ignore-detection` ancestor
- **THEN** the picker ignores the click entirely

### Requirement: Escape key deselection

The picker SHALL listen for the Escape key and deselect the current element when a popup is open.

#### Scenario: Press Escape with popup open
- **WHEN** overlay mode is enabled, a popup is open, and the user presses Escape
- **THEN** the picker dispatches `pge-element-picked` with `element: null`, `cyclePosition: 0`, `cycleTotal: 0`

#### Scenario: Press Escape with no popup open
- **WHEN** overlay mode is enabled and no popup is open
- **THEN** the picker does nothing

### Requirement: Reset cycle on overlay disable

When overlay mode is disabled, the picker's cycle state SHALL be reset.

#### Scenario: Disable overlay mode
- **WHEN** overlay mode is disabled via `setOverlayMode(false)`
- **THEN** the picker's `resetCycle()` is called, clearing `cycleCandidates` and `cycleIndex`

### Requirement: Mousedown preventDefault for selection

The picker SHALL call `preventDefault` on mousedown when it anticipates selecting an element (to prevent text selection and link drag initiation), but SHALL NOT call it when the next click would pass through.

#### Scenario: Mousedown on element that will be selected
- **WHEN** overlay mode is enabled and the user presses mousedown on a translatable element that will be selected
- **THEN** `preventDefault` is called on the mousedown event

#### Scenario: Mousedown when cycle exhausted (will pass through)
- **WHEN** overlay mode is enabled and the next click would pass through (cycle exhausted or single element deselection)
- **THEN** `preventDefault` is NOT called on mousedown, allowing normal interaction

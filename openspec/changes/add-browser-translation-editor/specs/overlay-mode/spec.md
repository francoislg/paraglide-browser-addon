# Spec: Overlay Mode

**Capability:** `overlay-mode`
**Status:** Proposed
**Dependencies:** `floating-widget`, `translation-storage`

## ADDED Requirements

### Requirement: Framework Compatibility

The editor SHALL work seamlessly with different frameworks and routing solutions.

#### Scenario: Works with vanilla JavaScript
**Given** the application uses vanilla JavaScript with no framework
**When** the editor is initialized
**Then** the editor SHALL function correctly
**And** all features SHALL work as expected

#### Scenario: Works with React Router
**Given** the application uses React with React Router
**And** the user navigates between routes
**When** a route change occurs
**Then** the editor SHALL detect new translations on the new route
**And** the editor SHALL remain functional
**And** overlay mode SHALL work on dynamically loaded content

#### Scenario: Works with SvelteKit
**Given** the application uses SvelteKit with its routing
**And** the user navigates between pages
**When** a client-side navigation occurs
**Then** the editor SHALL detect new translations
**And** the editor SHALL remain functional
**And** both SSR and CSR content SHALL be editable

#### Scenario: Detects dynamic content changes
**Given** overlay mode is enabled
**And** the application uses client-side routing
**When** new content with translations is added to the DOM
**Then** the editor SHALL detect the new translations within 100ms
**And** the new translations SHALL be clickable for editing
**And** visual indicators SHALL appear on new editable elements

#### Scenario: Survives route changes
**Given** the editor is open with overlay mode enabled
**When** the user navigates to a different route
**Then** the editor SHALL remain open
**And** overlay mode SHALL remain enabled
**And** the editor state SHALL persist

### Requirement: Click Detection

The system SHALL detect clicks on translated elements when overlay mode is enabled.

#### Scenario: Clicking translated element opens editor
**Given** overlay mode is enabled
**And** the page contains a translated element with key "welcome"
**When** the user clicks on that element
**Then** an edit popup SHALL appear
**And** the popup SHALL display the current translation value
**And** the popup SHALL display the translation key "welcome"

#### Scenario: Clicking non-translated element does nothing
**Given** overlay mode is enabled
**And** the user clicks on an element without a translation key
**Then** no edit popup SHALL appear
**And** the click SHALL pass through to normal page behavior

#### Scenario: Overlay mode disabled prevents editing
**Given** overlay mode is disabled
**When** the user clicks on a translated element
**Then** no edit popup SHALL appear
**And** the click SHALL behave normally

### Requirement: Translation Key Extraction

The system SHALL extract translation keys from HTML comments.

#### Scenario: Extract key from simple translation
**Given** an element has HTML structure:
```html
<!-- paraglide:welcome -->Welcome!<!-- /paraglide:welcome -->
```
**When** the system extracts the translation key
**Then** the key SHALL be "welcome"

#### Scenario: Extract key from parameterized translation
**Given** an element has HTML structure:
```html
<!-- paraglide:greeting params:{"name":"Developer"} -->Hello, Developer!<!-- /paraglide:greeting -->
```
**When** the system extracts the translation key
**Then** the key SHALL be "greeting"
**And** the params SHALL be extracted as `{"name":"Developer"}`

#### Scenario: Extract key from nested element
**Given** a parent element contains:
```html
<p>
  <!-- paraglide:description -->This is a description<!-- /paraglide:description -->
</p>
```
**And** the user clicks on any part of the paragraph
**When** the system searches for a translation key
**Then** the key "description" SHALL be found

### Requirement: Edit Popup Display

The system SHALL display an edit popup for modifying translations.

#### Scenario: Popup appears near clicked element
**Given** the user clicks a translated element at screen position (100, 200)
**When** the edit popup appears
**Then** the popup SHALL be positioned near the clicked element
**And** the popup SHALL remain within viewport bounds
**And** the popup SHALL not obscure the element being edited

#### Scenario: Popup displays translation information
**Given** an edit popup is shown for key "welcome" with value "Welcome!"
**Then** the popup SHALL display the translation key "welcome"
**And** the popup SHALL display a textarea with current value "Welcome!"
**And** the popup SHALL display the current locale (e.g., "en")
**And** the popup SHALL display character count

#### Scenario: Popup shows edit indicator
**Given** an edit popup is shown for a translation
**And** the translation has been edited locally
**Then** the popup SHALL display an "edited" indicator
**And** the popup SHALL show when it was last edited

#### Scenario: Popup shows conflict indicator
**Given** an edit popup is shown for a translation
**And** the translation has a conflict (local edit differs from server)
**Then** the popup SHALL display a "conflict" warning
**And** the popup SHALL provide a link to resolve the conflict

### Requirement: Translation Editing

The system SHALL allow users to edit translation values.

#### Scenario: User edits translation
**Given** an edit popup is open for key "welcome"
**And** the current value is "Welcome!"
**When** the user changes the text to "Welcome to our site!"
**And** the user clicks "Save"
**Then** the new value SHALL be saved to the database
**And** the popup SHALL close
**And** the page SHALL immediately reflect the new translation

#### Scenario: User cancels edit
**Given** an edit popup is open
**And** the user has made changes
**When** the user clicks "Cancel"
**Then** the changes SHALL be discarded
**And** the popup SHALL close
**And** the original translation SHALL remain unchanged

#### Scenario: Editing parameterized translation
**Given** an edit popup is open for key "greeting"
**And** the translation contains parameter `{name}`
**When** the user edits the translation
**Then** the popup SHALL preserve the parameter syntax
**And** the popup MAY highlight parameters for visibility

#### Scenario: Editing plural translation
**Given** an edit popup is open for key "items_count"
**And** the translation has plural forms (one/other)
**When** the popup displays
**Then** the popup SHALL show all plural variants
**And** each variant SHALL be editable separately

### Requirement: Immediate UI Update

The system SHALL immediately reflect translation changes in the UI.

#### Scenario: Save updates DOM
**Given** a translation "welcome" currently displays "Welcome!"
**When** the user saves an edit changing it to "Hello!"
**Then** the DOM SHALL update to display "Hello!" immediately
**And** the HTML comment wrapper SHALL remain intact
**And** no page reload SHALL be required

#### Scenario: Update multiple instances
**Given** the translation key "welcome" appears 3 times on the page
**When** the user edits and saves the translation
**Then** all 3 instances SHALL update simultaneously

### Requirement: Visual Feedback

The system SHALL provide visual feedback for editable elements.

#### Scenario: Hover highlights editable elements
**Given** overlay mode is enabled
**When** the user hovers over a translated element
**Then** the element SHALL display a visual highlight (e.g., border or background)
**And** the element SHALL show a cursor indicating it's clickable

#### Scenario: Edited translations show indicator
**Given** overlay mode is enabled
**And** a translation has been edited locally
**Then** the element SHALL display a visual indicator (e.g., colored dot or badge)
**And** the indicator SHALL distinguish edited from unedited translations

#### Scenario: Conflict translations show warning
**Given** overlay mode is enabled
**And** a translation has a conflict
**Then** the element SHALL display a warning indicator (e.g., yellow/red badge)
**And** the indicator SHALL be visually distinct from the "edited" indicator

### Requirement: Keyboard Shortcuts

The system SHALL support keyboard shortcuts for common operations.

#### Scenario: Escape closes popup
**Given** an edit popup is open
**When** the user presses the "Escape" key
**Then** the popup SHALL close
**And** any unsaved changes SHALL be discarded

#### Scenario: Ctrl+S saves translation
**Given** an edit popup is open
**And** the user has made changes
**When** the user presses "Ctrl+S" (or "Cmd+S" on Mac)
**Then** the translation SHALL be saved
**And** the popup SHALL close

#### Scenario: Tab navigates popup controls
**Given** an edit popup is open
**When** the user presses "Tab"
**Then** focus SHALL move to the next control in the popup
**And** all controls SHALL be keyboard-accessible

### Requirement: Error Handling

The system SHALL handle errors gracefully during editing.

#### Scenario: Invalid translation value
**Given** an edit popup is open
**When** the user enters invalid content (e.g., unbalanced parameters)
**And** the user attempts to save
**Then** an error message SHALL be displayed
**And** the save operation SHALL be prevented
**And** the popup SHALL remain open for correction

#### Scenario: Database save failure
**Given** an edit popup is open
**When** the user saves a translation
**And** the database save operation fails
**Then** an error message SHALL be displayed
**And** the user SHALL be prompted to retry
**And** the translation SHALL not be lost from memory

### Requirement: Performance

Overlay mode SHALL not significantly degrade page performance.

#### Scenario: Click handling is efficient
**Given** overlay mode is enabled
**And** the page has 100+ translated elements
**When** the user clicks anywhere on the page
**Then** the translation key extraction SHALL complete within 50ms
**And** the page SHALL remain responsive

#### Scenario: Overlay can be disabled quickly
**Given** overlay mode is enabled
**When** the user disables overlay mode
**Then** all event listeners SHALL be removed immediately
**And** visual indicators SHALL be cleared
**And** page performance SHALL return to baseline

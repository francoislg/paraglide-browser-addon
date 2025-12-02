# Spec: Conflict Resolution

**Capability:** `conflict-resolution`
**Status:** Proposed
**Dependencies:** `translation-storage`, `floating-widget`

## ADDED Requirements

### Requirement: Conflict Detection

The system SHALL detect and notify users of translation conflicts.

#### Scenario: Conflict notification in modal
**Given** the translation database contains 2 conflicts
**When** the user opens the translation modal
**Then** a conflict indicator SHALL be displayed
**And** the indicator SHALL show the count "2 conflicts"
**And** a "Resolve Conflicts" button SHALL be visible

#### Scenario: Conflict indicator in overlay mode
**Given** overlay mode is enabled
**And** a translation element has a conflict
**When** the element is rendered
**Then** the element SHALL display a conflict warning badge
**And** the badge SHALL be visually distinct (e.g., yellow or red)

### Requirement: Conflict List View

The system SHALL provide a list view of all conflicts.

#### Scenario: Viewing conflict list
**Given** there are conflicts in the database
**When** the user clicks "Resolve Conflicts"
**Then** a conflict resolution UI SHALL appear
**And** the UI SHALL list all conflicted translations
**And** each conflict SHALL show the translation key and locale

#### Scenario: Conflict shows both versions
**Given** the conflict resolution UI is open
**And** a translation "welcome" has a conflict
**When** the conflict is displayed
**Then** the UI SHALL show the local edited version
**And** the UI SHALL show the server version
**And** both versions SHALL be clearly labeled

### Requirement: Conflict Resolution Actions

The system SHALL provide actions to resolve conflicts.

#### Scenario: Keep local version
**Given** a conflict resolution UI is showing a conflict
**And** the local version is "Hello!"
**And** the server version is "Greetings!"
**When** the user clicks "Keep Local"
**Then** the `editedValue` SHALL be preserved
**And** `originalValue` SHALL be updated to match server
**And** `hasConflict` SHALL be set to false
**And** `isEdited` SHALL remain true

#### Scenario: Keep server version
**Given** a conflict resolution UI is showing a conflict
**And** the local version is "Hello!"
**And** the server version is "Greetings!"
**When** the user clicks "Keep Server"
**Then** `editedValue` SHALL be cleared
**And** `originalValue` SHALL be set to "Greetings!"
**And** `hasConflict` SHALL be set to false
**And** `isEdited` SHALL be set to false

#### Scenario: Manually merge versions
**Given** a conflict resolution UI is showing a conflict
**And** the local version is "Hello there!"
**And** the server version is "Greetings!"
**When** the user edits the value to "Hello and Greetings!"
**And** clicks "Save Merged"
**Then** `editedValue` SHALL be set to "Hello and Greetings!"
**And** `originalValue` SHALL be updated to server version
**And** `hasConflict` SHALL be set to false
**And** `isEdited` SHALL be set to true

### Requirement: Diff Visualization

The system SHALL provide visual diff for comparing versions.

#### Scenario: Side-by-side comparison
**Given** a conflict resolution UI is showing a conflict
**Then** the local and server versions SHALL be displayed side-by-side
**And** differences SHALL be highlighted
**And** additions SHALL be shown in green
**And** deletions SHALL be shown in red

#### Scenario: Inline diff for small changes
**Given** a conflict has minor textual differences
**When** the diff is displayed
**Then** changes MAY be shown inline
**And** changed words or characters SHALL be highlighted

### Requirement: Bulk Conflict Resolution

The system SHALL support resolving multiple conflicts at once.

#### Scenario: Keep all local
**Given** there are 5 conflicts
**When** the user clicks "Keep All Local"
**Then** all 5 conflicts SHALL be resolved using local versions
**And** all SHALL have `hasConflict` set to false
**And** the operation SHALL be atomic

#### Scenario: Keep all server
**Given** there are 5 conflicts
**When** the user clicks "Keep All Server"
**Then** all 5 conflicts SHALL be resolved using server versions
**And** all local edits SHALL be discarded
**And** the operation SHALL be atomic

#### Scenario: Selective bulk resolution
**Given** there are 10 conflicts
**When** the user selects 3 specific conflicts
**And** clicks "Keep Local for Selected"
**Then** only the 3 selected conflicts SHALL be resolved
**And** the remaining 7 SHALL remain conflicted

### Requirement: Conflict Prevention

The system SHALL prevent conflicts where possible.

#### Scenario: Warn before sync with edits
**Given** there are local edits
**When** the user initiates a sync
**Then** a warning SHALL be displayed
**And** the warning SHALL state that conflicts may occur
**And** the user SHALL be able to proceed or cancel

#### Scenario: Auto-resolve unchanged server values
**Given** a translation has been edited locally
**And** a sync operation runs
**When** the server value has NOT changed since last sync
**Then** no conflict SHALL be created
**And** the local edit SHALL be preserved without conflict flag

### Requirement: Conflict History

The system SHALL track conflict resolution history.

#### Scenario: Log conflict resolutions
**Given** a conflict is resolved
**When** the resolution is saved
**Then** the resolution SHALL be logged
**And** the log SHALL include the chosen version
**And** the log SHALL include a timestamp
**And** the log SHALL include which user action triggered it

#### Scenario: View resolution history
**Given** conflicts have been resolved
**When** the user views a translation's details
**Then** the system MAY display past conflict resolutions
**And** the history SHALL help understand translation changes

### Requirement: Conflict Export Handling

The system SHALL handle conflicts during export.

#### Scenario: Export warns of unresolved conflicts
**Given** there are unresolved conflicts
**When** the user attempts to export translations
**Then** a warning SHALL be displayed
**And** the warning SHALL list conflicted keys
**And** the user SHALL be prompted to resolve conflicts first

#### Scenario: Export with conflicts (user override)
**Given** there are unresolved conflicts
**And** the user chooses to proceed with export despite warning
**When** the export runs
**Then** conflicted translations SHALL use `editedValue` (local version)
**And** a comment or marker SHALL indicate the conflict exists
**And** the export SHALL complete successfully

### Requirement: Conflict UI Accessibility

The conflict resolution UI SHALL be accessible and user-friendly.

#### Scenario: Keyboard navigation
**Given** the conflict resolution UI is open
**When** the user uses keyboard navigation
**Then** all controls SHALL be accessible via keyboard
**And** Tab SHALL move between conflicts
**And** Arrow keys SHALL navigate within a conflict
**And** Keyboard shortcuts SHALL resolve conflicts

#### Scenario: Screen reader support
**Given** a user is using a screen reader
**When** the conflict resolution UI is open
**Then** all elements SHALL have appropriate ARIA labels
**And** the conflict status SHALL be announced
**And** resolution actions SHALL be clearly described

#### Scenario: Clear visual indicators
**Given** the conflict resolution UI is displaying conflicts
**Then** conflicted items SHALL be clearly distinguishable
**And** color SHALL not be the only indicator (accessibility)
**And** icons or patterns SHALL supplement color coding

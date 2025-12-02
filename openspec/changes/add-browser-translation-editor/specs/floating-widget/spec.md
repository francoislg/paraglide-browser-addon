# Spec: Floating Widget

**Capability:** `floating-widget`
**Status:** Proposed

## ADDED Requirements

### Requirement: Conditional Loading

The editor SHALL NOT be included in production builds when debug mode is disabled.

#### Scenario: Debug mode disabled excludes editor
**Given** the environment variable `VITE_PARAGLIDE_BROWSER_DEBUG` is not set to 'true'
**When** the application is built for production
**Then** the editor code SHALL NOT be included in the bundle
**And** the bundle size SHALL show 0 KB for editor modules
**And** no editor-related code SHALL execute

#### Scenario: Debug mode enabled includes editor
**Given** the environment variable `VITE_PARAGLIDE_BROWSER_DEBUG` is 'true'
**When** the application is built or run in development
**Then** the editor code SHALL be dynamically imported
**And** the editor SHALL initialize
**And** the floating button SHALL appear

#### Scenario: Environment check at runtime
**Given** the application is running
**When** the main entry point executes
**Then** the system SHALL check `import.meta.env.VITE_PARAGLIDE_BROWSER_DEBUG`
**And** SHALL only import editor if the value is 'true'
**And** no editor code SHALL be evaluated if the check fails

### Requirement: Floating Button Visibility

The system SHALL provide a floating button for accessing the translation editor when debug mode is enabled.

#### Scenario: Button appears in bottom-right corner
**Given** the page has loaded with debug mode enabled
**When** the application initializes
**Then** a floating button SHALL be visible in the bottom-right corner
**And** the button SHALL have a fixed position at `bottom: 20px` and `right: 20px`
**And** the button SHALL have a z-index of 9999 to stay above page content

#### Scenario: Button displays translation icon
**Given** the floating button is rendered
**Then** the button SHALL display a recognizable translation/edit icon
**And** the button SHALL have a tooltip explaining its purpose

#### Scenario: Button is clickable
**Given** the floating button is visible
**When** the user clicks the button
**Then** the translation management modal SHALL open

### Requirement: Modal Management

The system SHALL provide a modal interface for translation management controls.

#### Scenario: Modal opens on button click
**Given** the floating button is visible
**When** the user clicks the floating button
**Then** a modal SHALL appear centered on the screen
**And** the modal SHALL have a semi-transparent backdrop
**And** the modal SHALL prevent interaction with page content behind it

#### Scenario: Modal displays all controls
**Given** the modal is open
**Then** the modal SHALL display a language selector
**And** the modal SHALL display a sync button
**And** the modal SHALL display an overlay toggle switch
**And** the modal SHALL display a download button
**And** the modal SHALL display a close button

#### Scenario: Modal closes on backdrop click
**Given** the modal is open
**When** the user clicks the backdrop outside the modal
**Then** the modal SHALL close

#### Scenario: Modal closes on close button click
**Given** the modal is open
**When** the user clicks the close button
**Then** the modal SHALL close

### Requirement: Language Selection

The system SHALL allow users to select the active translation language.

#### Scenario: Language selector shows available locales
**Given** the modal is open
**And** the application has locales ["en", "es", "fr"]
**When** the user views the language selector
**Then** the selector SHALL display all three locales
**And** the current active locale SHALL be highlighted

#### Scenario: Changing language switches translations
**Given** the modal is open
**And** the current locale is "en"
**When** the user selects "es" from the language selector
**Then** the active locale SHALL change to "es"
**And** all translations on the page SHALL update to Spanish
**And** the language selector SHALL highlight "es"

### Requirement: Sync Control

The system SHALL provide a button to synchronize translations from the server.

#### Scenario: Sync button triggers synchronization
**Given** the modal is open
**When** the user clicks the "Sync" button
**Then** the system SHALL fetch translations from `/paraglide-debug-langs.json`
**And** the system SHALL update the local database
**And** the sync button SHALL display "Syncing..." during the operation

#### Scenario: Sync success feedback
**Given** a sync operation has completed successfully
**When** the sync finishes
**Then** the sync button SHALL display "✓ Synced (X new, Y updated)"
**And** the message SHALL persist for 3 seconds
**And** the sync button SHALL return to "Sync Translations" after 3 seconds

#### Scenario: Sync error feedback
**Given** a sync operation fails
**When** the sync encounters an error
**Then** the sync button SHALL display "✗ Sync Failed"
**And** the error SHALL be logged to the console
**And** the sync button SHALL return to "Sync Translations" after 3 seconds

### Requirement: Overlay Toggle

The system SHALL provide a toggle to enable/disable overlay editing mode.

#### Scenario: Toggle displays current state
**Given** the modal is open
**When** overlay mode is disabled
**Then** the toggle SHALL display "Enable Overlay"
**And** the toggle SHALL be in the "off" state

#### Scenario: Enabling overlay mode
**Given** the modal is open
**And** overlay mode is disabled
**When** the user clicks the overlay toggle
**Then** overlay mode SHALL be enabled
**And** the toggle SHALL display "Disable Overlay"
**And** the toggle SHALL be in the "on" state

#### Scenario: Disabling overlay mode
**Given** the modal is open
**And** overlay mode is enabled
**When** the user clicks the overlay toggle
**Then** overlay mode SHALL be disabled
**And** the toggle SHALL display "Enable Overlay"
**And** the toggle SHALL be in the "off" state

### Requirement: Download Control

The system SHALL provide a button to download modified translations.

#### Scenario: Download button is visible
**Given** the modal is open
**Then** a "Download" button SHALL be visible
**And** the button SHALL indicate it exports translation files

#### Scenario: Downloading translations
**Given** the modal is open
**And** there are modified translations in the database
**When** the user clicks the "Download" button
**Then** the system SHALL generate JSON files for each locale
**And** the system SHALL trigger downloads for modified locale files

### Requirement: Widget Styling

The widget SHALL be styled to be non-intrusive and visually distinct.

#### Scenario: Button has appropriate styling
**Given** the floating button is rendered
**Then** the button SHALL have rounded corners
**And** the button SHALL have a shadow for depth
**And** the button SHALL use the project's primary color scheme
**And** the button SHALL have smooth hover and click animations

#### Scenario: Modal has appropriate styling
**Given** the modal is open
**Then** the modal SHALL have a white/themed background
**And** the modal SHALL have rounded corners
**And** the modal SHALL have a shadow for depth
**And** the modal SHALL be responsive to different screen sizes
**And** the modal SHALL maintain readability and accessibility

### Requirement: Widget Persistence

The widget state SHALL persist across page reloads.

#### Scenario: Widget remembers overlay state
**Given** overlay mode is enabled
**When** the user reloads the page
**Then** overlay mode SHALL remain enabled

#### Scenario: Widget remembers selected language
**Given** the user has selected "es" as the active language
**When** the user reloads the page
**Then** the active language SHALL still be "es"

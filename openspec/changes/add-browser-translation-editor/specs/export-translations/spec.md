# Spec: Export Translations

**Capability:** `export-translations`
**Status:** Proposed
**Dependencies:** `translation-storage`, `floating-widget`

## ADDED Requirements

### Requirement: Export Modified Translations

The system SHALL allow users to export modified translations as JSON files.

#### Scenario: Export single locale
**Given** translations have been modified for locale "en"
**When** the user clicks "Download" for English
**Then** a file "en.json" SHALL be downloaded
**And** the file SHALL contain all translations for that locale
**And** edited translations SHALL use `editedValue`
**And** unedited translations SHALL use `originalValue`

#### Scenario: Export all locales
**Given** translations have been modified for multiple locales
**When** the user clicks "Download All"
**Then** separate JSON files SHALL be downloaded for each locale
**And** each file SHALL be named "{locale}.json"
**And** all files SHALL be downloaded sequentially or as a ZIP

#### Scenario: Export only modified keys
**Given** only 5 out of 100 translations have been modified
**When** the user selects "Export Modified Only"
**Then** the exported JSON SHALL contain only the 5 modified translations
**And** the file SHALL be named "{locale}-modified.json"

### Requirement: Export Format Compatibility

Exported JSON SHALL be compatible with the original Paraglide format.

#### Scenario: Simple translations
**Given** a translation key "welcome" with value "Hello!"
**When** the translation is exported
**Then** the JSON SHALL have the format:
```json
{
  "welcome": "Hello!"
}
```

#### Scenario: Parameterized translations
**Given** a translation "greeting" with value "Hello, {name}!"
**When** the translation is exported
**Then** the JSON SHALL preserve the parameter syntax:
```json
{
  "greeting": "Hello, {name}!"
}
```

#### Scenario: Plural translations
**Given** a plural translation "items_count" has been edited
**And** only the "other" variant was changed
**When** the translation is exported
**Then** the JSON SHALL preserve the full plural structure:
```json
{
  "items_count": [{
    "declarations": ["input count", "local countPlural = count: plural"],
    "selectors": ["countPlural"],
    "match": {
      "countPlural=one": "You have {count} item.",
      "countPlural=other": "You have {count} items (edited)."
    }
  }]
}
```

### Requirement: Export Validation

The system SHALL validate exports before download.

#### Scenario: Validate JSON structure
**Given** translations are being prepared for export
**When** the JSON is generated
**Then** the system SHALL validate the JSON is well-formed
**And** the system SHALL check for syntax errors
**And** invalid JSON SHALL prevent download

#### Scenario: Validate parameter consistency
**Given** a translation originally had parameter `{name}`
**And** the edited version removes the parameter
**When** the export is validated
**Then** a warning SHALL be displayed
**And** the user SHALL be informed of the parameter change
**And** the user MAY proceed or fix the issue

#### Scenario: Validate plural structure integrity
**Given** a plural translation is being exported
**When** the validation runs
**Then** the system SHALL check all plural forms are present
**And** the system SHALL verify selectors match declarations
**And** incomplete plural structures SHALL be flagged

### Requirement: Export Metadata

Exports SHALL include metadata about the modifications.

#### Scenario: Include export timestamp
**Given** an export is being generated
**When** the file is created
**Then** the system MAY include a comment with the export timestamp
**And** the comment SHALL not break JSON parsing

#### Scenario: Include modification summary
**Given** an export contains 10 edited translations
**When** the export is downloaded
**Then** a summary file MAY be included
**And** the summary SHALL list which keys were modified
**And** the summary SHALL include edit timestamps

### Requirement: Export User Experience

The export process SHALL provide clear feedback.

#### Scenario: Download button shows progress
**Given** the user clicks "Download"
**When** the export is being prepared
**Then** the button SHALL display "Preparing..."
**And** a progress indicator MAY be shown

#### Scenario: Download success confirmation
**Given** an export has completed successfully
**When** the download finishes
**Then** a success message SHALL be displayed
**And** the message SHALL show the number of translations exported
**And** the message SHALL show the file name

#### Scenario: Download error handling
**Given** an export operation fails
**When** the error occurs
**Then** an error message SHALL be displayed
**And** the error details SHALL be logged
**And** the user SHALL be able to retry

### Requirement: Batch Export

The system SHALL support exporting multiple locales efficiently.

#### Scenario: Export as ZIP archive
**Given** the user wants to export all 3 locales
**When** "Download All as ZIP" is clicked
**Then** a single ZIP file SHALL be created
**And** the ZIP SHALL contain "en.json", "es.json", "fr.json"
**And** the ZIP SHALL be named "translations-{timestamp}.zip"

#### Scenario: Sequential single file downloads
**Given** the user wants to export all locales
**And** ZIP creation is not available
**When** "Download All" is clicked
**Then** individual JSON files SHALL download sequentially
**And** each download SHALL wait for the previous to complete
**And** the browser's download UI SHALL handle multiple files

### Requirement: Export Filtering

The system SHALL allow filtering what gets exported.

#### Scenario: Export by edit status
**Given** translations have various edit statuses
**When** the user selects "Export only edited"
**Then** only translations where `isEdited = true` SHALL be exported

#### Scenario: Export by locale
**Given** translations exist for multiple locales
**When** the user selects "Export English only"
**Then** only locale "en" SHALL be exported

#### Scenario: Export by key pattern
**Given** the user wants to export only UI-related translations
**When** the user filters by pattern "ui_*"
**Then** only keys starting with "ui_" SHALL be exported

### Requirement: Re-import Support

The system SHALL support re-importing exported translations.

#### Scenario: Import previously exported file
**Given** the user has a previously exported "en.json"
**When** the user selects "Import" and chooses the file
**Then** the translations SHALL be loaded into the database
**And** imported translations SHALL be marked as edited
**And** conflicts with existing edits SHALL be detected

#### Scenario: Import overwrites confirmation
**Given** local edits exist
**When** the user attempts to import a file
**Then** a warning SHALL be displayed
**And** the user SHALL confirm whether to overwrite
**And** the import SHALL only proceed after confirmation

### Requirement: Export Performance

Export operations SHALL be performant even with many translations.

#### Scenario: Large translation set export
**Given** the database contains 1000+ translations
**When** an export is initiated
**Then** the operation SHALL complete within 5 seconds
**And** the UI SHALL remain responsive during export
**And** memory usage SHALL remain reasonable

#### Scenario: Incremental export preparation
**Given** a large export is being prepared
**When** the system generates the JSON
**Then** translations MAY be processed in batches
**And** a progress indicator SHALL show completion percentage

### Requirement: Export Security

Exports SHALL not expose sensitive information.

#### Scenario: No database internals in export
**Given** an export is generated
**When** the JSON is created
**Then** internal database IDs SHALL NOT be included
**And** timestamps SHALL NOT be included (unless in metadata)
**And** only translation content SHALL be exported

#### Scenario: Sanitize file names
**Given** a locale name or timestamp is used in the filename
**When** the file is downloaded
**Then** the filename SHALL be sanitized
**And** special characters SHALL be escaped or removed
**And** the filename SHALL be safe for all operating systems

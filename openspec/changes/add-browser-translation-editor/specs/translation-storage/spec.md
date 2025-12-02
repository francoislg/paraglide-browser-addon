# Spec: Translation Storage

**Capability:** `translation-storage`
**Status:** Proposed

## MODIFIED Requirements

### Requirement: Enhanced Database Schema

The system SHALL extend the existing IndexedDB schema to support editing and conflict tracking.

#### Scenario: Database stores original values
**Given** a translation is synced from the server
**When** the translation is saved to the database
**Then** the record SHALL include an `originalValue` field
**And** `originalValue` SHALL contain the server's version of the translation

#### Scenario: Database stores edited values
**Given** a translation is edited locally
**When** the edit is saved
**Then** the record SHALL include an `editedValue` field
**And** `editedValue` SHALL contain the user's modified version
**And** the `isEdited` flag SHALL be set to true

#### Scenario: Database tracks edit timestamps
**Given** a translation is edited
**When** the edit is saved
**Then** the record SHALL include a `lastEditTime` timestamp
**And** `lastEditTime` SHALL be set to the current date/time

#### Scenario: Database tracks sync timestamps
**Given** a translation is synced from the server
**When** the sync completes
**Then** the record SHALL include a `lastSyncTime` timestamp
**And** `lastSyncTime` SHALL be set to the current date/time

#### Scenario: Database detects conflicts
**Given** a translation has been edited locally
**And** a newer version arrives from the server
**When** the versions differ
**Then** the `hasConflict` flag SHALL be set to true
**And** both `editedValue` and `originalValue` SHALL be preserved

## ADDED Requirements

### Requirement: Translation Retrieval

The system SHALL provide methods to retrieve translations with their edit status.

#### Scenario: Get translation by key and locale
**Given** the database contains a translation for key "welcome" in locale "en"
**When** the system requests the translation
**Then** the complete record SHALL be returned
**And** the record SHALL include all metadata (isEdited, hasConflict, etc.)

#### Scenario: Get all modified translations
**Given** the database contains 10 translations
**And** 3 of them have been edited locally
**When** the system requests modified translations
**Then** only the 3 edited translations SHALL be returned
**And** each SHALL have `isEdited` = true

#### Scenario: Get translations with conflicts
**Given** the database contains translations
**And** 2 of them have conflicts
**When** the system requests conflicted translations
**Then** only the 2 conflicted translations SHALL be returned
**And** each SHALL have `hasConflict` = true

### Requirement: Translation Persistence

The system SHALL save translation edits to the database.

#### Scenario: Save new edit
**Given** a translation "welcome" with value "Welcome!"
**When** the user edits it to "Hello there!"
**And** the system saves the edit
**Then** `editedValue` SHALL be set to "Hello there!"
**And** `originalValue` SHALL remain "Welcome!"
**And** `isEdited` SHALL be true
**And** `lastEditTime` SHALL be updated

#### Scenario: Update existing edit
**Given** a translation that was previously edited
**And** `editedValue` is currently "Hello there!"
**When** the user edits it again to "Greetings!"
**And** the system saves the edit
**Then** `editedValue` SHALL be updated to "Greetings!"
**And** `lastEditTime` SHALL be updated
**And** `isEdited` SHALL remain true

#### Scenario: Revert to original
**Given** a translation that has been edited
**When** the user reverts to the original value
**And** the system saves the change
**Then** `editedValue` SHALL be cleared
**And** `isEdited` SHALL be set to false
**And** the translation SHALL use `originalValue`

### Requirement: Initial Database Schema

The system SHALL define the initial database schema for translation storage.

#### Scenario: Database schema includes all required fields
**Given** the database is initialized for the first time
**When** the object store is created
**Then** the schema SHALL include: id, locale, key, value, originalValue, editedValue, isEdited, lastEditTime, lastSyncTime, hasConflict
**And** indices SHALL be created on: locale, key, isEdited, hasConflict
**And** the primary key SHALL be 'id' with format "{locale}:{key}"

### Requirement: Batch Operations

The system SHALL support batch operations for performance.

#### Scenario: Batch save during sync
**Given** a sync operation fetches 100 translations
**When** the translations are saved to the database
**Then** the operation SHALL use a single transaction
**And** all 100 translations SHALL be saved atomically

#### Scenario: Batch query for export
**Given** the system needs to export translations
**When** it retrieves all translations for a locale
**Then** the operation SHALL use an efficient cursor-based query
**And** SHALL return all records in a single operation

### Requirement: Data Consistency

The system SHALL maintain data consistency across operations.

#### Scenario: Concurrent edits are serialized
**Given** two edit operations occur simultaneously for the same key
**When** both attempt to save
**Then** the operations SHALL be serialized
**And** the last save SHALL win
**And** no data corruption SHALL occur

#### Scenario: Failed transaction rollback
**Given** a batch operation is in progress
**When** an error occurs mid-transaction
**Then** the entire transaction SHALL rollback
**And** no partial updates SHALL be persisted
**And** the database SHALL remain in a consistent state

### Requirement: Storage Limits

The system SHALL handle storage limits gracefully.

#### Scenario: Database size warning
**Given** the database is approaching storage limits
**When** the limit reaches 80%
**Then** a warning SHALL be displayed to the user
**And** the user SHALL be advised to export and clear data

#### Scenario: Storage quota exceeded
**Given** the database storage quota is exceeded
**When** an attempt is made to save new data
**Then** the operation SHALL fail gracefully
**And** an error message SHALL be displayed
**And** the user SHALL be prompted to free up space

### Requirement: Data Export Format

The system SHALL provide translations in a format compatible with the original JSON files.

#### Scenario: Export edited translations
**Given** translations have been edited for locale "en"
**When** the system prepares an export
**Then** edited translations SHALL use `editedValue`
**And** unedited translations SHALL use `originalValue` (or `value`)
**And** the output SHALL match the original JSON structure

#### Scenario: Export preserves plural structure
**Given** a translation with plural forms has been edited
**When** the system exports the translation
**Then** the plural structure SHALL be preserved
**And** the JSON SHALL include `declarations`, `selectors`, and `match` blocks
**And** only the edited variant SHALL reflect changes

#### Scenario: Export handles special characters
**Given** a translation contains special characters (quotes, newlines, unicode)
**When** the system exports the translation
**Then** special characters SHALL be properly escaped
**And** the JSON SHALL be valid and parseable

## MODIFIED Requirements (Existing Sync)

### Requirement: Sync with Conflict Detection

The existing sync functionality SHALL detect conflicts with local edits.

#### Scenario: Sync without local edits
**Given** a translation has NOT been edited locally
**When** a sync operation fetches a new value from the server
**Then** `originalValue` SHALL be updated to the new server value
**And** `value` SHALL be updated
**And** `lastSyncTime` SHALL be updated
**And** `hasConflict` SHALL remain false

#### Scenario: Sync with local edits (no conflict)
**Given** a translation has been edited locally
**And** the server version has NOT changed
**When** a sync operation runs
**Then** `originalValue` SHALL remain unchanged
**And** `editedValue` SHALL remain unchanged
**And** `hasConflict` SHALL remain false

#### Scenario: Sync detects conflict
**Given** a translation has been edited locally to "Hello!"
**And** the server version is "Welcome!"
**When** a sync operation runs
**And** the server provides a new version "Greetings!"
**Then** `originalValue` SHALL be updated to "Greetings!"
**And** `editedValue` SHALL remain "Hello!"
**And** `hasConflict` SHALL be set to true
**And** the user SHALL be notified of the conflict

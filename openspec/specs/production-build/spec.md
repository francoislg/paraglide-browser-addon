### Requirement: Runtime JS emitted as build chunk
The plugin SHALL emit a real JavaScript chunk (`paraglide-editor-runtime.js`) during `vite build` when editor mode is enabled. The chunk MUST contain all runtime modules currently served via virtual modules in dev. The chunk MUST NOT be emitted when editor mode is disabled.

#### Scenario: Build with editor enabled
- **WHEN** `PARAGLIDE_EDITOR=true` and `vite build` runs
- **THEN** the output directory contains `paraglide-editor-runtime.js` as a bundled chunk

#### Scenario: Build with editor disabled
- **WHEN** `PARAGLIDE_EDITOR` is not `true` and `vite build` runs
- **THEN** the output directory contains no `paraglide-editor-runtime.js` file

### Requirement: Translations emitted as build asset
The plugin SHALL emit a static JSON file (`paraglide-editor-langs.json`) during `vite build` when editor mode is enabled. The file MUST contain all translation data from all configured locales, in the same format as the dev middleware response. The asset MUST NOT be emitted when editor mode is disabled.

#### Scenario: Build with editor enabled
- **WHEN** `PARAGLIDE_EDITOR=true` and `vite build` runs
- **THEN** the output directory contains `paraglide-editor-langs.json` with all locale translations

#### Scenario: Translations match dev middleware format
- **WHEN** the build asset is emitted
- **THEN** its content is identical in structure to the dev middleware response at `/@paraglide-editor/langs.json`

### Requirement: Environment-aware runtime URL in HTML
The plugin SHALL inject a `<script>` tag referencing the runtime with an environment-appropriate URL. In dev mode, the URL SHALL be `/@paraglide-editor/runtime.js`. In build mode, the URL SHALL be `{base}paraglide-editor-runtime.js` where `{base}` is Vite's configured `base` path.

#### Scenario: Dev mode HTML injection
- **WHEN** the plugin runs in dev mode (`vite dev`)
- **THEN** the injected script src is `/@paraglide-editor/runtime.js`

#### Scenario: Build mode HTML injection
- **WHEN** the plugin runs in build mode (`vite build`) with default base `/`
- **THEN** the injected script src is `/paraglide-editor-runtime.js`

### Requirement: Environment-aware translations URL in runtime config
The plugin SHALL inject a `translationsUrl` property into `window.__paraglideEditor.config`. In dev mode, the URL SHALL be `/@paraglide-editor/langs.json`. In build mode, the URL SHALL be `{base}paraglide-editor-langs.json`.

#### Scenario: Dev mode config
- **WHEN** the plugin runs in dev mode
- **THEN** `window.__paraglideEditor.config.translationsUrl` equals `/@paraglide-editor/langs.json`

#### Scenario: Build mode config
- **WHEN** the plugin runs in build mode with default base `/`
- **THEN** `window.__paraglideEditor.config.translationsUrl` equals `/paraglide-editor-langs.json`

### Requirement: Runtime uses configured translations URL
The data store runtime module SHALL read the translations URL from `window.__paraglideEditor.config.translationsUrl` and fall back to `/@paraglide-editor/langs.json` if not set.

#### Scenario: Config URL available
- **WHEN** `window.__paraglideEditor.config.translationsUrl` is set
- **THEN** the data store fetches translations from that URL

#### Scenario: Config URL missing (backward compat)
- **WHEN** `window.__paraglideEditor.config.translationsUrl` is not set
- **THEN** the data store fetches translations from `/@paraglide-editor/langs.json`

### Requirement: SvelteKit handle uses environment-aware URLs
The SvelteKit handle SHALL import `runtimeUrl` from the virtual config module and use it for script injection, instead of hardcoding the virtual module URL.

#### Scenario: SvelteKit dev mode
- **WHEN** SvelteKit runs in dev mode
- **THEN** the handle injects a script tag with src `/@paraglide-editor/runtime.js`

#### Scenario: SvelteKit build mode
- **WHEN** SvelteKit runs in build mode
- **THEN** the handle injects a script tag with the real asset URL

### Requirement: Dev mode behavior unchanged
Virtual modules and middleware SHALL continue to work identically in dev mode. The `load()` hook, `resolveId()` hook, and middleware SHALL remain active for dev. No behavior change for `vite dev` or `vite preview`.

#### Scenario: Dev mode runtime loading
- **WHEN** the plugin runs in dev mode
- **THEN** `/@paraglide-editor/runtime.js` is served via the virtual module `load()` hook

#### Scenario: Dev mode translations loading
- **WHEN** the plugin runs in dev mode
- **THEN** `/@paraglide-editor/langs.json` is served via Express middleware

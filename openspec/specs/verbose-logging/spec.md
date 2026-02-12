### Requirement: Vite plugin emits one summary log by default
The Vite plugin SHALL emit exactly one `console.log` line during `configResolved` summarizing the plugin state: mode (dev/build), and detected languages.

#### Scenario: Default Vite plugin output in dev mode
- **WHEN** the Vite dev server starts with `PARAGLIDE_EDITOR=true` and no `PARAGLIDE_EDITOR_VERBOSE`
- **THEN** the terminal shows exactly one `[paraglide-editor]` log line containing the mode and language list

#### Scenario: Default Vite plugin output in build mode
- **WHEN** a production build runs with `PARAGLIDE_EDITOR=true` and no `PARAGLIDE_EDITOR_VERBOSE`
- **THEN** the terminal shows exactly one `[paraglide-editor]` log line containing the mode and language list

### Requirement: Vite plugin verbose mode via env var
The Vite plugin SHALL read `PARAGLIDE_EDITOR_VERBOSE` from env files (via Vite's `loadEnv`). When set to `"true"`, all detail logs (module loading, transform steps, middleware activity) SHALL be emitted as `console.log`.

#### Scenario: Verbose mode enabled
- **WHEN** `PARAGLIDE_EDITOR_VERBOSE=true` is set in `.env`
- **THEN** the Vite plugin emits detailed logs for module resolution, transform hooks, middleware requests, and build asset emission

#### Scenario: Verbose mode disabled by default
- **WHEN** `PARAGLIDE_EDITOR_VERBOSE` is not set or set to anything other than `"true"`
- **THEN** the Vite plugin suppresses all detail logs and only emits the single summary line

### Requirement: Browser runtime emits one log on activation
The browser runtime SHALL emit exactly one `console.log` line when it finishes initialization (after `start()` completes). The "Runtime disabled" hint SHALL also remain as `console.log`.

#### Scenario: Runtime activates successfully
- **WHEN** the runtime loads and `pge-enabled` is `true` in localStorage
- **THEN** the browser console shows one `[paraglide-editor] Ready` log at the default (Info) level

#### Scenario: Runtime is disabled
- **WHEN** the runtime loads and `pge-enabled` is not `true` in localStorage
- **THEN** the browser console shows one `[paraglide-editor]` log explaining how to enable it

### Requirement: Browser runtime detail logs use console.debug
All browser runtime logs other than the activation line and the disabled hint SHALL use `console.debug()` so they are hidden by default in browser DevTools.

#### Scenario: Detail logs hidden by default
- **WHEN** the runtime initializes with default browser DevTools log level (Info)
- **THEN** no detail logs (registry scanning, language detection, overlay init, etc.) are visible in the console

#### Scenario: Detail logs visible when Verbose filter enabled
- **WHEN** the user enables the "Verbose" or "Debug" log level in browser DevTools
- **THEN** all detail logs from the runtime become visible

### Requirement: Errors and warnings always visible
All `console.error` and `console.warn` calls SHALL remain unchanged regardless of verbose settings. They indicate actual problems and MUST always be visible.

#### Scenario: Error during data store init
- **WHEN** the data store fails to load server translations
- **THEN** the `console.error` is shown regardless of verbose/debug settings

#### Scenario: Warning for parse failure
- **WHEN** a translation variant fails to parse
- **THEN** the `console.warn` is shown regardless of verbose/debug settings

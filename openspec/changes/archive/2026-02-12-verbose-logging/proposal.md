## Why

The plugin currently emits ~133 `console.log`/`console.warn` calls across both the Vite plugin (build-time) and the browser runtime. Every page load floods the dev console with internal details (module loading, registry scanning, locale checkboxes, etc.), making it hard to spot actual issues. Developers need a clean default output with opt-in verbosity for debugging.

## What Changes

- **Quiet Vite plugin default**: All build-time logs collapse to a single summary line (e.g. `[paraglide-editor] Active — dev mode, 3 languages (en, es, fr)`)
- **Vite verbose mode**: Setting `PARAGLIDE_EDITOR_VERBOSE=true` in `.env` restores full detailed server-side logging (loaded modules, found functions, transform details, etc.)
- **Quiet browser runtime default**: One `console.log` on activation (e.g. `[paraglide-editor] Ready`). All other runtime logs become `console.debug()` — hidden by default in browser DevTools, visible when user enables the "Verbose" log level filter
- **Errors/warnings unchanged**: `console.error` and `console.warn` for actual problems always display regardless of mode

## Capabilities

### New Capabilities
- `verbose-logging`: Two-context log level system — env-var-driven verbosity for the Vite plugin (Node.js), and `console.debug` for browser runtime detail logs. One visible log line per context by default.

### Modified Capabilities
_(none — existing specs cover element picking and production builds, not logging)_

## Impact

- **Code**: `packages/vite-plugin-paraglide-editor/src/index.js` (build-time logs), `packages/vite-plugin-paraglide-editor/src/middleware.js`, and all `src/runtime/**/*.js` files (browser-side logs)
- **Env vars**: New `PARAGLIDE_EDITOR_VERBOSE` env var for Vite plugin verbosity (alongside existing `PARAGLIDE_EDITOR`)
- **No breaking changes**: Default behavior changes from noisy to quiet. No API or config changes.
- **Examples**: `.env` files in examples may optionally add `PARAGLIDE_EDITOR_VERBOSE=true` for development

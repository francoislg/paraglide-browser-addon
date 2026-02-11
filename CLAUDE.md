# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Project Overview

This is a Paraglide Browser Addon demonstrating a Vite plugin for ParaglideJS internationalization with an in-browser translation editor.

## Example Projects

The repository contains three example projects demonstrating Paraglide integration:

1. **Vanilla JS** (`examples/vanilla/`) - Port 3210
2. **React Router** (`examples/react-router/`) - Port 3220
3. **SvelteKit** (`examples/sveltekit/`) - Port 3230

### Running Examples

Use the `/run` slash command to start example projects:

- `/run vanilla` - Run vanilla example on http://localhost:3210
- `/run react` - Run React Router example on http://localhost:3220
- `/run svelte` - Run SvelteKit example on http://localhost:3230
- `/run vanilla,react,svelte` - Run multiple examples

## CRITICAL: Translation File Location

**NEVER FORGET THIS:**

- Translation JSON files MUST be in `examples/{project}/messages/*.json`
- NOT in `project.inlang/messages/`
- Path patterns:
  - `examples/vanilla/messages/{locale}.json`
  - `examples/react-router/messages/{locale}.json`
  - `examples/sveltekit/messages/{locale}.json`

## Architecture

### Editor Plugin System

The project includes an editor Vite plugin (`packages/vite-plugin-paraglide-editor/`) that injects HTML comment metadata:

**Key Implementation Details:**

- Uses Vite's `transform` hook to intercept `_index.js` with query parameter pattern (`?original`) to avoid circular imports
- In-memory transformation - no source file modification
- Controlled by `PARAGLIDE_EDITOR=true` environment variable
- Output format: `<!-- paraglide:{key} params:{...} -->text<!-- /paraglide:{key} -->`
- Custom endpoint `/paraglide-editor-langs.json` serves raw translation JSON when editor mode is enabled
- Works in both development and production builds

**Plugin Location:** `packages/vite-plugin-paraglide-editor/src/index.js`

### Translation Format

- ParaglideJS supports pluralization using a structured JSON format with `declarations`, `selectors`, and `match` blocks
- Does NOT support ICU MessageFormat syntax (`{count, plural, ...}`)
- Example:

```json
"items_count": [{
  "declarations": ["input count", "local countPlural = count: plural"],
  "selectors": ["countPlural"],
  "match": {
    "countPlural=one": "You have {count} item.",
    "countPlural=other": "You have {count} items."
  }
}]
```

## Key Files

### Editor Plugin

- `packages/vite-plugin-paraglide-editor/src/index.js` - Editor plugin implementation

### Example Projects (each follows the same structure)

- `examples/{project}/messages/{locale}.json` - Translation source files
- `examples/{project}/project.inlang/settings.json` - Inlang configuration
- `examples/{project}/.env` - Contains `PARAGLIDE_EDITOR=true`
- `examples/{project}/vite.config.js` - Vite configuration with static port

### Vanilla Example

- `examples/vanilla/src/main.js` - Main JavaScript entry
- `examples/vanilla/index.html` - HTML entry point

### React Router Example

- `examples/react-router/src/App.jsx` - Main React component with routing
- `examples/react-router/src/pages/` - Page components
- `examples/react-router/src/components/` - Reusable components

### SvelteKit Example

- `examples/sveltekit/src/routes/` - SvelteKit file-based routing
- `examples/sveltekit/src/routes/+layout.svelte` - Layout component
- `examples/sveltekit/src/hooks.server.js` - Server hooks with `paraglideEditorHandle`
- `examples/sveltekit/svelte.config.js` - SvelteKit configuration

**SvelteKit-specific:** SvelteKit sets `appType: 'custom'`, which bypasses Vite's HTML pipeline. The plugin's `transformIndexHtml` hook never fires, so `hooks.server.js` must use `paraglideEditorHandle` from `vite-plugin-paraglide-editor/sveltekit` to inject the runtime via `transformPageChunk`.

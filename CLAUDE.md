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

This is a Paraglide Browser Addon demonstrating a Vite plugin for ParaglideJS internationalization with debug metadata injection capabilities.

## CRITICAL: Translation File Location

**NEVER FORGET THIS:**
- Translation JSON files MUST be in `examples/vanilla/messages/*.json`
- NOT in `project.inlang/messages/`
- Path pattern: `examples/vanilla/messages/{locale}.json`

## Architecture

### Debug Plugin System
The project includes a debug Vite plugin (`packages/vite-plugin-paraglide-debug/`) that injects HTML comment metadata:

**Key Implementation Details:**
- Uses Vite's `transform` hook to intercept `_index.js` with query parameter pattern (`?original`) to avoid circular imports
- In-memory transformation - no source file modification
- Controlled by `VITE_PARAGLIDE_BROWSER_DEBUG=true` environment variable
- Output format: `<!-- paraglide:{key} params:{...} -->text<!-- /paraglide:{key} -->`
- Custom endpoint `/paraglide-debug-langs.json` serves raw translation JSON when debug mode is enabled
- Works in both development and production builds

**Plugin Location:** `packages/vite-plugin-paraglide-debug/src/index.js`

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

- `examples/vanilla/messages/{locale}.json` - Translation source files
- `examples/vanilla/project.inlang/settings.json` - Inlang configuration
- `examples/vanilla/.env` - Contains `VITE_PARAGLIDE_BROWSER_DEBUG=true`
- `packages/vite-plugin-paraglide-debug/src/index.js` - Debug plugin implementation

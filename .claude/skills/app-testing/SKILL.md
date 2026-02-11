---
name: app-testing
description: Test the paraglide editor plugin across all example projects. Use when you need to verify builds, dev servers, or runtime behavior after making changes.
allowed-tools:
  - Bash(pnpm:*)
  - Bash(npx:*)
  - Bash(cd:*)
  - Bash(PARAGLIDE_EDITOR=true:*)
  - Bash(PARAGLIDE_EDITOR=false:*)
  - Read
  - Grep
  - Glob
---

Test the paraglide editor plugin across all three example projects.

## Quick Reference

| Project | Package Name | Port | Path |
|---------|-------------|------|------|
| Vanilla JS | `vanilla` | 3210 | `examples/vanilla/` |
| React Router | `react-router-example` | 3220 | `examples/react-router/` |
| SvelteKit | `sveltekit-example` | 3230 | `examples/sveltekit/` |

## Build Commands

**Windows-compatible builds** (`.env` files already contain `PARAGLIDE_EDITOR=true`):

```bash
# Build individual examples (relies on .env file for PARAGLIDE_EDITOR=true)
cd D:/GitHub/paraglide-browser-addon/examples/vanilla && npx --no-install vite build
cd D:/GitHub/paraglide-browser-addon/examples/react-router && npx --no-install vite build
cd D:/GitHub/paraglide-browser-addon/examples/sveltekit && npx --no-install vite build
```

**Using pnpm filter** (Unix-only due to inline env vars in some package.json scripts):

```bash
# These work on Windows (vanilla has no inline env var in build script):
pnpm --filter vanilla build

# These may fail on Windows (inline PARAGLIDE_EDITOR=true in package.json):
# Use the direct vite build approach above instead
```

**Build without editor mode:**

```bash
PARAGLIDE_EDITOR=false pnpm --filter vanilla build
```

## Dev Commands

```bash
pnpm --filter vanilla dev          # http://localhost:3210
pnpm --filter react-router-example dev  # http://localhost:3220
pnpm --filter sveltekit-example dev     # http://localhost:3230
```

Or use the `/run` skill: `/run vanilla`, `/run react`, `/run svelte`

## What to Verify After Changes

### 1. Build succeeds with editor mode

Run builds for all three examples. Check the log output for:

- `[paraglide-editor] Editor mode: true` — plugin activated
- `[paraglide-editor] Found message functions: ...` — correct camelCase names listed
- No build errors or warnings (the `db.js dynamically imported` warning is expected/harmless)
- Output files include `paraglide-editor-runtime.js` and `paraglide-editor-langs.json`

### 2. Build succeeds without editor mode

With `PARAGLIDE_EDITOR=false`, the plugin should be a no-op. Build output should NOT include editor files.

### 3. Dev server works

Start a dev server and verify:
- Page loads without console errors
- `/@paraglide-editor/langs.json` endpoint returns translation JSON
- `/@paraglide-editor/runtime.js` loads correctly
- Translation overlay appears (if `pge-enabled` localStorage is set)

### 4. Transform hook output

The key thing to verify is that the `transform` hook produces correct wrapper code. Check the build log line:

```
[paraglide-editor] Found message functions: welcome, greeting, ...
```

These names must match the **actual export names** from the Paraglide-generated message modules (camelCase), NOT the filenames (which may differ, e.g. `error_noaccess1.js` exports `error_noAccess`).

## SvelteKit-Specific Notes

- SvelteKit builds **twice** (SSR server bundle + client bundle). Both should show `Found message functions`.
- `transformIndexHtml` does NOT run in SvelteKit (`appType: 'custom'`).
- SvelteKit uses `hooks.server.js` with `paraglideEditorHandle` for runtime injection.
- Svelte compiler warnings about `state_referenced_locally` in `root.svelte` are expected and harmless.

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `'PARAGLIDE_EDITOR' is not recognized` | Windows + inline env var in package.json | Use direct `vite build` in project dir (relies on `.env`) |
| No `Found message functions` in log | Editor mode not enabled | Check `.env` has `PARAGLIDE_EDITOR=true` |
| Wrong function names in log | Bug in export name parsing | Check `parseExportNames()` in `index.js` |
| 500 error on SSR | Wrapper exports wrong names | Verify names match actual module exports |

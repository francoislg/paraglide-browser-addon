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

Test the paraglide editor plugin across all example projects.

## Quick Reference

| Project | Package Name | Port | Vite | Path |
|---------|-------------|------|------|------|
| Vanilla JS | `vanilla` | 3210 | 7 | `examples/vanilla/` |
| Vanilla JS (Vite 6) | `vanilla-vite-6` | 3215 | 6 | `examples/vanilla-vite-6/` |
| React Router | `react-router-example` | 3220 | 6 | `examples/react-router/` |
| SvelteKit | `sveltekit-example` | 3230 | 7 | `examples/sveltekit/` |
| SvelteKit (Vite 6) | `sveltekit-example-vite-6` | 3235 | 6 | `examples/sveltekit-vite-6/` |

## IMPORTANT: Test Multiple Vite Versions

The plugin must work on **both Vite 6 and Vite 7**. Always test at least one Vite 6 and one Vite 7 example after changes. Key differences:

- **Vite 7** uses a new SSR module runner that handles module resolution differently
- **Vite 7** uses rolldown internally (different bundler behavior)
- Virtual modules with `/@` prefix can be misresolved as filesystem paths on Windows in Vite 7's SSR runner
- The plugin uses `virtual:paraglide-editor/` import prefix (SSR-safe) and `\0@paraglide-editor/` resolved prefix

**Minimum test matrix after plugin changes:**

```bash
# Vite 6 — vanilla + SvelteKit
cd D:/GitHub/paraglide-browser-addon/examples/vanilla-vite-6 && npx --no-install vite build
cd D:/GitHub/paraglide-browser-addon/examples/sveltekit-vite-6 && npx --no-install vite build

# Vite 7 — vanilla + SvelteKit
cd D:/GitHub/paraglide-browser-addon/examples/vanilla && npx --no-install vite build
cd D:/GitHub/paraglide-browser-addon/examples/sveltekit && npx --no-install vite build
```

## Build Commands

**Windows-compatible builds** (`.env` files already contain `PARAGLIDE_EDITOR=true`):

```bash
# Build individual examples (relies on .env file for PARAGLIDE_EDITOR=true)
cd D:/GitHub/paraglide-browser-addon/examples/vanilla && npx --no-install vite build
cd D:/GitHub/paraglide-browser-addon/examples/vanilla-vite-6 && npx --no-install vite build
cd D:/GitHub/paraglide-browser-addon/examples/react-router && npx --no-install vite build
cd D:/GitHub/paraglide-browser-addon/examples/sveltekit && npx --no-install vite build
cd D:/GitHub/paraglide-browser-addon/examples/sveltekit-vite-6 && npx --no-install vite build
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
pnpm --filter vanilla dev                   # http://localhost:3210 (Vite 7)
pnpm --filter vanilla-vite-6 dev            # http://localhost:3215 (Vite 6)
pnpm --filter react-router-example dev      # http://localhost:3220 (Vite 6)
pnpm --filter sveltekit-example dev         # http://localhost:3230 (Vite 7)
pnpm --filter sveltekit-example-vite-6 dev  # http://localhost:3235 (Vite 6)
```

Or use the `/run` skill: `/run vanilla`, `/run react`, `/run svelte`

## What to Verify After Changes

### 1. Build succeeds with editor mode

Run builds for all examples. Check the log output for:

- `[paraglide-editor] Active — build mode, N languages (...)` — plugin activated
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

The key thing to verify is that the `transform` hook produces correct wrapper code. Check the build log for message function discovery.

## SvelteKit-Specific Notes

- SvelteKit builds **twice** (SSR server bundle + client bundle). Both should succeed.
- `transformIndexHtml` does NOT run in SvelteKit (`appType: 'custom'`).
- SvelteKit uses `hooks.server.js` with `paraglideEditorHandle` for runtime injection.
- `sveltekit.js` imports config via `virtual:paraglide-editor/config.js` (SSR-safe prefix).
- Svelte compiler warnings about `state_referenced_locally` in `root.svelte` are expected and harmless.

## Vite 7 SSR-Specific Notes

- The plugin uses `ssr.noExternal: ['vite-plugin-paraglide-editor']` to force Vite to bundle it through its pipeline during SSR
- Virtual module resolved IDs use `\0` prefix (Vite convention) to prevent path misresolution
- Two import prefixes: `/@paraglide-editor/` (browser URLs) and `virtual:paraglide-editor/` (SSR-safe JS imports)

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| `'PARAGLIDE_EDITOR' is not recognized` | Windows + inline env var in package.json | Use direct `vite build` in project dir (relies on `.env`) |
| No `Active` message in log | Editor mode not enabled | Check `.env` has `PARAGLIDE_EDITOR=true` |
| Wrong function names in log | Bug in export name parsing | Check `parseExportNames()` in `index.js` |
| 500 error on SSR | Wrapper exports wrong names | Verify names match actual module exports |
| `F:\@paraglide-editor\config.js` not found | Vite 7 SSR resolves `/` as absolute path | Use `virtual:paraglide-editor/` prefix, not `/@paraglide-editor/` in imports |

## Context

The paraglide-editor Vite plugin currently serves its runtime JS and translation data exclusively through Vite's dev server mechanisms: virtual modules (via the `load()` hook) and Express middleware. These mechanisms don't exist in production — after `vite build`, the virtual `/@paraglide-editor/` URLs return 404. This means the editor is dev-only, even though use cases exist for production editor access (staging environments, content team workflows, Cloudflare Workers deployments).

The plugin already has the infrastructure to conditionally enable/disable editor mode via `PARAGLIDE_EDITOR=true`. The gap is purely in asset delivery for built output.

## Goals / Non-Goals

**Goals:**
- Emit real build assets (`paraglide-editor-runtime.js` chunk, `paraglide-editor-langs.json` asset) during `vite build` when editor mode is enabled
- Make runtime and translation URLs environment-aware across all injection points (vanilla HTML, SvelteKit handle, runtime fetch)
- Zero behavior change in dev mode — virtual modules and middleware continue to work identically
- Zero output change when editor mode is disabled — no editor assets in build

**Non-Goals:**
- Dynamic/live translation reloading in production (translations are baked at build time)
- Server-side translation API endpoint for production (would require a server runtime)
- Changing the virtual module system for dev mode
- Supporting non-Vite bundlers

## Decisions

### 1. Use Rollup `emitFile` for build assets (not manual file writes)

**Decision:** Use `this.emitFile({ type: 'chunk' })` for the runtime JS and `this.emitFile({ type: 'asset' })` for translations JSON, both in the `buildStart` hook.

**Rationale:** Rollup's `emitFile` integrates with the build pipeline — the runtime chunk gets minified, tree-shaken, and placed in the output directory automatically. Using `type: 'chunk'` for the runtime means Rollup resolves it through our existing `resolveId`/`load` hooks and bundles all 24 runtime files into a single chunk. Using `type: 'asset'` for translations emits the JSON verbatim.

**Alternative considered:** Writing files to `dist/` in `closeBundle`. Rejected because it bypasses Rollup's asset pipeline and doesn't integrate with Vite's `base` path handling.

### 2. Fixed `fileName` for predictable URLs

**Decision:** Use `fileName: 'paraglide-editor-runtime.js'` and `fileName: 'paraglide-editor-langs.json'` — fixed names without content hashes.

**Rationale:** These assets are referenced by injected `<script>` tags and runtime `fetch()` calls. Content hashing would require a more complex mechanism to communicate the hashed filename to the HTML injection and runtime code. Since the editor is opt-in and the assets are not cached aggressively by CDNs in typical usage, fixed names are acceptable.

### 3. Inject `translationsUrl` via `window.__paraglideEditor.config`

**Decision:** Pass the translations URL through the existing `window.__paraglideEditor.config` object (already injected by `transformIndexHtml` / SvelteKit handle), rather than through a virtual module import.

**Rationale:** `dataStore.js` is a runtime file loaded via the virtual module system. It cannot directly import `/@paraglide-editor/config.js` at runtime in production since that virtual module won't exist. The `window.__paraglideEditor.config` object is already injected before the runtime loads and is the established pattern for passing plugin config to runtime code.

### 4. Extract `readTranslations()` as shared helper

**Decision:** Extract the translation-reading logic from the middleware's request handler into a standalone `readTranslations(rootPath)` function, exported from `middleware.js`.

**Rationale:** Both the middleware (dev, reads per-request) and `buildStart` (build, reads once) need the same logic: read `project.inlang/settings.json`, resolve locale paths, load JSON files. Extracting avoids duplication without introducing a new file.

### 5. Store `isDev` flag from `configResolved`

**Decision:** Detect dev vs build via `config.command === 'serve'` in `configResolved` and store as a closure variable.

**Rationale:** `config.command` is `'serve'` for both `vite dev` and `vite preview`, and `'build'` for `vite build`. This is the standard Vite pattern for environment detection. Closure variable (not `this.isDev`) avoids fragile plugin context state — also a Vite 7 compatibility improvement.

## Risks / Trade-offs

- **[Stale translations in build]** Translations are baked at build time into the JSON asset. If translations change on disk after build, the production editor shows stale data. → Acceptable: this is the same model as all other static assets. Users rebuild to pick up changes.

- **[Fixed filenames = no cache busting]** The fixed asset names mean browsers may cache stale versions across deploys. → Mitigation: typical deployment platforms (Vercel, Cloudflare) handle cache invalidation at the CDN level. The editor is also an opt-in dev/staging tool, not a user-facing critical path.

- **[Build size increase when editor enabled]** The runtime chunk and translations JSON add to the build output. → Acceptable: only emitted when `PARAGLIDE_EDITOR=true`, which is an explicit opt-in. Production builds without the flag have zero overhead.

## Why

The paraglide-editor runtime relies on two virtual URLs (`/@paraglide-editor/runtime.js` and `/@paraglide-editor/langs.json`) that only exist during Vite's dev server. In production deployments (e.g., Cloudflare Workers, static hosting), neither is served, resulting in silent 404s and a non-functional editor. The fix: emit real build assets during `vite build`, keep virtual modules for dev.

## What Changes

- Emit `paraglide-editor-runtime.js` as a real chunk during `vite build` (via Rollup's `emitFile`)
- Emit `paraglide-editor-langs.json` as a static asset during `vite build` with translations baked in
- Make runtime and translation URLs environment-aware (virtual in dev, real assets in build)
- Inject `translationsUrl` into `window.__paraglideEditor.config` so the runtime fetches from the correct URL
- Extract shared `readTranslations()` helper from middleware for reuse in build hook
- Update SvelteKit handle to use the correct runtime URL in both dev and build

## Capabilities

### New Capabilities
- `production-build`: Emit real runtime JS chunk and translations JSON asset during `vite build`, with environment-aware URL resolution in HTML injection and runtime config

### Modified Capabilities
<!-- No existing specs to modify -->

## Impact

- **Plugin core** (`src/index.js`): New `isDev` flag, `buildStart` hook, updated `transformIndexHtml`, updated virtual config module
- **Middleware** (`src/middleware.js`): Extract `readTranslations()` for shared use
- **SvelteKit handle** (`src/sveltekit.js`): Import and use `runtimeUrl` from virtual config
- **Runtime** (`src/runtime/dataStore.js`): Read `translationsUrl` from `window.__paraglideEditor.config`
- **Build output**: Two new files in `dist/` when editor mode is enabled

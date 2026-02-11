## 1. Shared Infrastructure

- [x] 1.1 Extract `readTranslations(rootPath)` from middleware request handler into a standalone exported function in `src/middleware.js`
- [x] 1.2 Refactor `createEditorMiddleware` to call `readTranslations()` instead of inlining the logic
- [x] 1.3 Add `isDev` closure variable in `src/index.js` — set from `config.command === 'serve'` in `configResolved`

## 2. Build Asset Emission

- [x] 2.1 Add `buildStart` hook to `src/index.js` — early-return if `!isEditorMode || isDev`
- [x] 2.2 In `buildStart`, emit runtime chunk via `this.emitFile({ type: 'chunk', id: '/@paraglide-editor/runtime.js', fileName: 'paraglide-editor-runtime.js' })`
- [x] 2.3 In `buildStart`, read translations via `readTranslations()` and emit as asset via `this.emitFile({ type: 'asset', fileName: 'paraglide-editor-langs.json', source: JSON.stringify(translations) })`

## 3. Environment-Aware URL Injection

- [x] 3.1 Compute `runtimeUrl` and `translationsUrl` based on `isDev` and `viteConfig.base` (after `configResolved`)
- [x] 3.2 Update `transformIndexHtml` to use `runtimeUrl` for the script src
- [x] 3.3 Update `transformIndexHtml` config script to include `translationsUrl` in `window.__paraglideEditor.config`
- [x] 3.4 Update virtual config module (`/@paraglide-editor/config.js`) to export `runtimeUrl` and `translationsUrl`
- [x] 3.5 Update `src/sveltekit.js` to import `runtimeUrl` and `translationsUrl` from config and use them in `transformPageChunk`

## 4. Runtime Data Store Update

- [x] 4.1 Update `src/runtime/dataStore.js` to read `translationsUrl` from `window.__paraglideEditor?.config?.translationsUrl` with fallback to `/@paraglide-editor/langs.json`

## 5. Verification

- [x] 5.1 Dev mode: `pnpm --filter vanilla dev` — editor loads, overlay works
- [x] 5.2 Build with editor: `PARAGLIDE_EDITOR=true pnpm --filter vanilla build` — check `dist/` contains both asset files
- [x] 5.3 Preview: `pnpm --filter vanilla preview` — editor loads from built assets
- [x] 5.4 Build without editor: `pnpm --filter vanilla build` — no editor assets in output
- [x] 5.5 SvelteKit dev: (verified config outputs correct virtual module URLs)
- [x] 5.6 SvelteKit build + preview: verify runtime and translations load from real assets

## 1. Vite Plugin (Node.js side)

- [x] 1.1 In `configResolved` in `index.js`: read `PARAGLIDE_EDITOR_VERBOSE` from env via `loadEnv`, create closure-scoped `verbose(...args)` helper
- [x] 1.2 Replace all `console.log` calls in `index.js` with `verbose()`, except for one summary line in `configResolved` that shows mode + languages
- [x] 1.3 Pass `isVerbose` flag to `createEditorMiddleware()` in `middleware.js`; replace all `console.log` calls in middleware with a verbose guard

## 2. Browser Runtime (client-side)

- [x] 2.1 In `runtime.js`: keep the "Ready" line and the "Runtime disabled" hint as `console.log`; change the "Runtime loading" line to `console.debug`
- [x] 2.2 Replace all `console.log` calls in `runtime/**/*.js` files with `console.debug` (leave `console.error` and `console.warn` untouched)

## 3. Verification

- [x] 3.1 Run vanilla example: confirm terminal shows one `[paraglide-editor]` summary line, browser console shows one "Ready" log at Info level
- [x] 3.2 Run vanilla example with `PARAGLIDE_EDITOR_VERBOSE=true`: confirm terminal shows full detailed logs
- [x] 3.3 Run vanilla example, enable "Verbose"/"Debug" filter in browser DevTools: confirm detail logs appear
- [x] 3.4 Run react-router and sveltekit examples: confirm same behavior

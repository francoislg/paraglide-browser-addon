## Context

The plugin has two execution contexts with different logging needs:

1. **Vite plugin (Node.js)** — `index.js`, `middleware.js`. Runs at build/dev-server time. Node.js has no built-in log level filtering like browsers do.
2. **Browser runtime** — `runtime.js` and everything under `runtime/`. Runs in the browser where DevTools has native log level filters (Info, Warnings, Verbose/Debug).

Currently, both contexts use `console.log` for everything, resulting in ~133 log lines that obscure meaningful output.

## Goals / Non-Goals

**Goals:**
- One visible `console.log` line per context by default (Vite plugin startup + browser runtime activation)
- Vite plugin verbosity controlled by `PARAGLIDE_EDITOR_VERBOSE=true` env var
- Browser runtime detail logs use `console.debug()` so they're hidden by default but accessible via DevTools filter
- `console.error` and `console.warn` always visible — they indicate real problems
- Simple, minimal helpers — no log framework

**Non-Goals:**
- No runtime env var or config for browser-side verbosity (browser DevTools handles this natively)
- No log levels beyond the two tiers (summary vs. debug)
- No structured logging, log formatting library, or log transport

## Decisions

### 1. Browser runtime: `console.debug()` for detail logs

**Choice**: Replace all `console.log` calls in `runtime/**` with `console.debug()`, except for one summary line in `runtime.js`.

**Why over alternatives**:
- `console.debug()` is hidden by default in Chrome/Firefox/Safari DevTools (users must enable "Verbose" or "Debug" level)
- Zero runtime overhead — no wrapper function, no flag checking, no env var plumbing to the browser
- Native browser UX — developers already know how to toggle log levels in DevTools
- No changes to the `window.__paraglideEditor` config object or `transformIndexHtml` injection

**What stays as `console.log`**:
- `runtime.js`: The single "Ready" line
- `runtime.js`: The "Runtime disabled" hint (tells users how to enable)

### 2. Vite plugin (Node.js): env-var-gated verbose helper

**Choice**: Read `PARAGLIDE_EDITOR_VERBOSE` from env in `configResolved`, create a closure-scoped `verbose()` function. Default logs go through a single summary line.

**Why over alternatives**:
- Node.js doesn't have browser-style log level filtering — we need an explicit gate
- Env var is consistent with how `PARAGLIDE_EDITOR` already works (loaded via `loadEnv`)
- Closure-scoped flag avoids polluting plugin state (`this.verbose`) which is fragile with Vite 7

**Implementation**:
```js
// In configResolved:
const isVerbose = editorEnv.PARAGLIDE_EDITOR_VERBOSE === 'true';
const verbose = (...args) => { if (isVerbose) console.log('[paraglide-editor]', ...args); };
```

All current `console.log` calls in `index.js` and `middleware.js` become either:
- The single summary line (always shown)
- `verbose(...)` calls (hidden unless env var is set)

### 3. Summary line content

**Vite plugin** (in `configResolved`):
```
[paraglide-editor] Active — dev mode, 3 languages (en, es, fr)
```
Includes: mode (dev/build), detected language count and codes.

**Browser runtime** (in `runtime.js` after `start()` completes):
```
[paraglide-editor] Ready
```
Keep it minimal. The registry size and other details move to `console.debug`.

### 4. Keep `console.warn` and `console.error` untouched

These indicate actual problems (parse failures, missing functions, failed loads). They should always be visible regardless of verbosity settings. No changes needed.

## Risks / Trade-offs

- **[Behavior change]** Developers used to seeing all logs will see only one line by default → **Mitigation**: The "disabled" hint in runtime.js tells users about `pge-enabled`; the env var is documented. Browser users just toggle DevTools level.
- **[Middleware logs in Node.js]** `middleware.js` runs in the Vite dev server (Node.js) but the `verbose` flag is scoped inside the plugin closure → **Mitigation**: Pass `isVerbose` to `createEditorMiddleware()` as a parameter, or have middleware accept a logger.

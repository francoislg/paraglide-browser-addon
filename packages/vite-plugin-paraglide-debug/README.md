# vite-plugin-paraglide-debug

Vite plugin that injects debug metadata into ParaglideJS translation strings for browser extensions and debugging tools.

## Features

- 🔍 **Runtime Element Tracking**: Automatically tracks DOM elements containing translations with `data-paraglide-key` attributes
- 🎯 **Zero Developer Friction**: Just use `m.message_key()` normally - no special syntax required
- 🌐 **Framework Agnostic**: Works with React, SvelteKit, Svelte, Vue, and vanilla JS
- 🔧 **TypeScript Support**: Full type definitions for the browser API
- 🚀 **Dev & Prod Builds**: Works in both development and production modes

## Installation

```bash
npm install vite-plugin-paraglide-debug
# or
pnpm add vite-plugin-paraglide-debug
```

## Setup

### 1. Add Plugin to Vite Config

```javascript
// vite.config.js
import { paraglide } from '@inlang/paraglide-vite';
import { paraglideBrowserDebugPlugin } from 'vite-plugin-paraglide-debug';

export default defineConfig({
  plugins: [
    paraglide({
      project: './project.inlang',
      outdir: './src/paraglide',
    }),
    paraglideBrowserDebugPlugin({
      outdir: './src/paraglide', // Should match paraglide plugin
    }),
  ],
});
```

### 2. Enable Debug Mode

Create a `.env` file in your project root:

```env
VITE_PARAGLIDE_BROWSER_DEBUG=true
```

That's it! The plugin will automatically:
- Wrap your message functions to track translations
- Inject the runtime client script
- Expose the global API at `window.__paraglideBrowserDebug`

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requireOptIn` | `boolean` | `false` | When `true`, the debug runtime stays dormant until the user sets `localStorage.setItem('pg-enabled', 'true')` in their browser console. When `false` (default), debug tools activate automatically. |

**Activation model:**

1. **Environment variable** (`VITE_PARAGLIDE_BROWSER_DEBUG=true`) — build-time gate. When disabled, the plugin is a no-op with zero overhead.
2. **localStorage opt-in** (`pg-enabled`) — browser-side gate, only enforced when `requireOptIn: true`. Useful for production/QA builds where you want debug support available but not active by default.

```javascript
// Require explicit opt-in in the browser
paraglideBrowserDebugPlugin({ requireOptIn: true })
```

## Browser API

### Global Object

```typescript
window.__paraglideBrowserDebug: {
  // Map of translated text → metadata
  registry: Map<string, TranslationMetadata>;

  // Array of tracked DOM elements (may contain stale refs)
  elements: TrackedElement[];

  // Re-scan the DOM to update tracked elements
  refresh(): void;

  // Get fresh list of elements (re-queries DOM)
  getElements(): TrackedElement[];
}
```

### TypeScript Definitions

For browser extensions or TypeScript projects, import the types:

```typescript
import type {
  ParaglideBrowserDebug,
  TrackedElement,
  TranslationMetadata
} from 'vite-plugin-paraglide-debug/client';

// Access the global API
const debug = window.__paraglideBrowserDebug;

if (debug) {
  const elements = debug.getElements();

  elements.forEach(({ element, key, params, text }) => {
    console.log(`Element with key "${key}":`, element);
  });
}
```

## Debug Endpoints

When debug mode is enabled, the plugin serves:

- **`/@paraglide-debug/client.js`**: Runtime client script
- **`/@paraglide-debug/langs.json`**: Raw translation JSON files

## Example: Browser Extension

```javascript
// content-script.js
function highlightTranslations() {
  const debug = window.__paraglideBrowserDebug;

  if (!debug) {
    console.warn('Paraglide debug mode not enabled');
    return;
  }

  const elements = debug.getElements();

  elements.forEach(({ element, key, params }) => {
    // Highlight element
    element.style.outline = '2px solid orange';

    // Add tooltip on hover
    element.title = `Translation key: ${key}`;

    // Log to console
    console.log(`[${key}]`, params);
  });
}

// Run after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', highlightTranslations);
} else {
  highlightTranslations();
}
```

## How It Works

1. **Build Time**: The plugin intercepts Paraglide's generated `_index.js` file and wraps all message functions
2. **Runtime**: When a message function is called, it stores a mapping of `text → metadata` in `window.__paraglideBrowserDebug.registry`
3. **DOM Scanning**: A TreeWalker scans text nodes and matches them against the registry
4. **Data Attributes**: Matched elements get `data-paraglide-key` attributes for persistence across re-renders
5. **MutationObserver**: Automatically re-scans the DOM when it changes (debounced)

## Limitations

- **Non-Unique Text**: If multiple messages produce identical text, they'll share metadata
- **Dynamic Text**: If translation parameters change, the registry mapping may become stale
- **Performance**: Large DOMs may have slower scan times (mitigated by debouncing)

## Development vs Production

Debug mode should typically only be enabled during development:

```javascript
// .env.development
VITE_PARAGLIDE_BROWSER_DEBUG=true
```

```javascript
// .env.production
VITE_PARAGLIDE_BROWSER_DEBUG=false
```

However, it's safe to ship debug-enabled builds if needed (e.g., for QA environments).

## License

MIT

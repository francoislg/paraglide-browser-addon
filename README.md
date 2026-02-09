# Paraglide Browser Debug

A Vite plugin that injects debug metadata into ParaglideJS translation strings and provides an in-browser translation editor with click-to-edit overlay, conflict detection, and local persistence via IndexedDB.

## Packages

### [`vite-plugin-paraglide-debug`](./packages/vite-plugin-paraglide-debug)

The core Vite plugin that transforms Paraglide-generated message functions to include debug metadata when `VITE_PARAGLIDE_BROWSER_DEBUG=true`.

**Features:**
- Wraps message functions to track translation key usage in the browser
- Click-to-edit overlay mode for editing translations directly on the page
- Local edit persistence via IndexedDB with server sync and conflict detection
- Multi-language editing with language selector
- Export edited translations as JSON
- Support for Paraglide variants (plurals, ordinals, multi-selectors)
- Zero runtime overhead when debug mode is disabled
- Framework agnostic (Vite 5/6/7)

## Examples

Three example projects demonstrate the plugin across different frameworks. Each supports three locales (en, es, fr) and showcases simple translations, parameter interpolation, and variant/plural forms.

### [Vanilla JavaScript](./examples/vanilla)

Minimal vanilla JS example with direct DOM manipulation.

```bash
pnpm dev:vanilla
# http://localhost:3210
```

### [React Router](./examples/react-router)

React application using React Router v7 with component-based pages.

```bash
pnpm --filter react-router-example dev
# http://localhost:3220
```

### [SvelteKit](./examples/sveltekit)

SvelteKit application with file-based routing.

```bash
pnpm --filter sveltekit-example dev
# http://localhost:3230
```

### Run all examples

```bash
pnpm dev:all
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
git clone <your-repo-url>
cd paraglide-browser-addon
pnpm install
pnpm dev:vanilla
```

## How It Works

When `VITE_PARAGLIDE_BROWSER_DEBUG=true` is set:

1. The Paraglide plugin generates message functions
2. The debug plugin intercepts `messages/_index.js` and wraps each function to register text-to-key mappings in `window.__paraglideBrowserDebug.registry`
3. A runtime script scans the DOM and adds `data-paraglide-key` attributes to matching elements
4. A MutationObserver keeps tracking up-to-date as the DOM changes
5. The overlay mode enables click-to-edit on any tracked element

**In the browser, translated elements get data attributes:**

```html
<h1 data-paraglide-key="welcome">Welcome!</h1>
```

## Monorepo Structure

```
paraglide-browser-addon/
├── packages/
│   └── vite-plugin-paraglide-debug/
│       └── src/
│           ├── index.js              # Vite plugin (transform + virtual modules)
│           ├── middleware.js          # Debug endpoint middleware
│           ├── runtime.js            # Runtime entry point
│           ├── export.js             # Translation export
│           └── runtime/
│               ├── initialize.js     # Startup coordinator
│               ├── overlay.js        # Click-to-edit overlay
│               ├── dataStore.js      # In-memory translation cache
│               ├── db.js             # IndexedDB persistence
│               ├── registry.js       # DOM element tracking
│               ├── renderer.js       # Translation rendering
│               ├── variants.js       # Plural/variant logic
│               ├── languageDetection.js
│               ├── styles.js
│               ├── sync.js
│               ├── helpers.js
│               └── ui/               # Modal, popup, conflict list, etc.
├── examples/
│   ├── vanilla/                      # Port 3210
│   ├── react-router/                 # Port 3220
│   └── sveltekit/                    # Port 3230
└── README.md
```

## Usage in Your Project

> **Note:** This project is a work in progress and is not yet published to npm. For now, you can install it directly from GitHub as a git dependency.

```bash
npm install github:francoislg/paraglide-browser-addon
```

Since the plugin lives in a monorepo subdirectory, you need to use the full path when importing:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import { paraglide } from '@inlang/paraglide-js';
import { paraglideBrowserDebugPlugin } from 'vite-plugin-paraglide-debug/packages/vite-plugin-paraglide-debug/src/index.js';

export default defineConfig({
  plugins: [
    paraglide({
      project: './project.inlang',
      outdir: './src/paraglide'
    }),
    paraglideBrowserDebugPlugin()
  ]
});
```

```bash
# .env
VITE_PARAGLIDE_BROWSER_DEBUG=true
```

## License

MIT

## Links

- [ParaglideJS Documentation](https://inlang.com/m/gerre34r/library-inlang-paraglideJs)
- [Vite Plugin API](https://vite.dev/guide/api-plugin.html)

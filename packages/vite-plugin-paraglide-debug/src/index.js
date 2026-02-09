import { createDebugMiddleware } from "./middleware.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Vite plugin for ParaglideJS debug metadata injection
 *
 * This plugin intercepts Paraglide-generated message functions and wraps them
 * to track translation usage in the browser. It enables runtime debugging tools
 * and browser extensions to identify which translation keys are used on a page.
 *
 * **How it works:**
 * 1. Detects `VITE_PARAGLIDE_BROWSER_DEBUG=true` environment variable
 * 2. Intercepts `messages/_index.js` transform and wraps message functions
 * 3. Injects runtime script via `transformIndexHtml` (standard Vite apps)
 * 4. Serves translation JSON at `/@paraglide-debug/langs.json` endpoint
 * 5. Provides virtual modules under `/@paraglide-debug/*` prefix
 *
 * **SvelteKit note:**
 * SvelteKit sets `appType: 'custom'`, which bypasses Vite's HTML pipeline.
 * The `transformIndexHtml` hook will NOT run. SvelteKit projects must add
 * the provided handle to `src/hooks.server.js`:
 *
 * ```js
 * // src/hooks.server.js
 * import { sequence } from '@sveltejs/kit/hooks';
 * import { paraglideMiddleware } from '$lib/paraglide/server';
 * import { paraglideDebugHandle } from 'vite-plugin-paraglide-debug/sveltekit';
 *
 * const paraglideHandle = ({ event, resolve }) =>
 *   paraglideMiddleware(event.request, ({ request, locale }) => {
 *     event.request = request;
 *     return resolve(event, {
 *       transformPageChunk: ({ html }) => html.replace('%lang%', locale)
 *     });
 *   });
 *
 * export const handle = sequence(paraglideHandle, paraglideDebugHandle);
 * ```
 *
 * **When debug mode is enabled:**
 * - Message functions store text→metadata mapping in `window.__paraglideBrowserDebug.registry`
 * - Runtime script scans DOM and adds `data-paraglide-key` attributes
 * - MutationObserver keeps tracking up-to-date as DOM changes
 *
 * **When debug mode is disabled:**
 * - Plugin becomes a no-op (no transformation, no runtime injection)
 * - Zero overhead in production builds
 *
 * @param {Object} [options] - Plugin options
 * @param {boolean} [options.requireOptIn=false] - When true, the debug runtime
 *   stays dormant until the user activates it from the browser console:
 *   `localStorage.setItem('pg-enabled', 'true')`
 *   When false (default), debug tools activate automatically when the env var is set.
 *
 * @example
 * ```js
 * // vite.config.js
 * import { paraglide } from '@inlang/paraglide-vite';
 * import { paraglideBrowserDebugPlugin } from 'vite-plugin-paraglide-debug';
 *
 * export default defineConfig({
 *   plugins: [
 *     paraglide({
 *       project: './project.inlang',
 *       outdir: './src/paraglide'
 *     }),
 *     // Debug tools activate automatically (default)
 *     paraglideBrowserDebugPlugin()
 *
 *     // Or require explicit opt-in via localStorage
 *     // paraglideBrowserDebugPlugin({ requireOptIn: true })
 *   ]
 * });
 * ```
 *
 * @example
 * ```bash
 * # Enable debug mode in .env
 * VITE_PARAGLIDE_BROWSER_DEBUG=true
 * ```
 */
/**
 * Generate the __debugWrap function body injected into the message wrapper module.
 * When requireOptIn is false, the localStorage gate is skipped entirely.
 */
function getDebugWrapFn(requireOptIn) {
  return `
${requireOptIn ? `let __debugEnabled;
function __isPgEnabled() {
  return typeof window !== 'undefined' && localStorage.getItem('pg-enabled') === 'true';
}` : ''}
function __debugWrap(text, key, params) {
  if (typeof text !== 'string') return text;
${requireOptIn ? `
  if (__debugEnabled === undefined) {
    __debugEnabled = __isPgEnabled();
    if (typeof window !== 'undefined') {
      window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};
      window.__paraglideBrowserDebug.isPgEnabled = __isPgEnabled;
    }
  }
  if (!__debugEnabled) return text;
` : ''}
  if (typeof window !== 'undefined') {
    window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};
    const wasEmpty = !window.__paraglideBrowserDebug.registry;
    window.__paraglideBrowserDebug.registry = window.__paraglideBrowserDebug.registry || new Map();
    window.__paraglideBrowserDebug.registry.set(text, {
      key: key,
      params: params || {},
      timestamp: Date.now()
    });

    if (wasEmpty) {
      requestAnimationFrame(() => {
        const event = new CustomEvent('__paraglideInitialized', {
          detail: {
            timestamp: Date.now(),
            registrySize: window.__paraglideBrowserDebug.registry.size
          }
        });
        window.dispatchEvent(event);
        console.log('[paraglide-debug] Registry initialized with ' + window.__paraglideBrowserDebug.registry.size + ' entries');
      });
    }
  }

  return text;
}`;
}

export function paraglideBrowserDebugPlugin(options = {}) {
  const { requireOptIn = false } = options;

  let viteConfig;
  let isDebugMode = false;

  /** @type {"post"} */
  const enforce = "post";

  /** @type {"pre"} */
  const htmlTransformOrder = "pre";

  return {
    name: "paraglide-browser-debug",
    enforce, // Run after the official Paraglide plugin

    configResolved(config) {
      viteConfig = config;
      // Check environment variable from Vite's loaded .env files
      isDebugMode = config.env.VITE_PARAGLIDE_BROWSER_DEBUG === "true";
      console.log("[paraglide-debug] Plugin configured");
      console.log("[paraglide-debug] Debug mode:", isDebugMode);
      console.log(
        "[paraglide-debug] Environment check:",
        config.env.VITE_PARAGLIDE_BROWSER_DEBUG
      );
    },

    // Resolve virtual module IDs
    resolveId(id, importer) {
      // Handle direct virtual module references
      if (id.startsWith("/@paraglide-debug/")) {
        return id;
      }

      // Handle relative imports from virtual modules
      if (importer && importer.startsWith("/@paraglide-debug/")) {
        if (id.startsWith("./") || id.startsWith("../")) {
          // Resolve relative path against importer
          // e.g., importer: /@paraglide-debug/runtime.js, id: ./runtime/db.js
          // → /@paraglide-debug/runtime/db.js
          const importerDir = path.dirname(importer);
          const resolved = path.join(importerDir, id).replace(/\\/g, "/");
          return resolved;
        }
      }

      return null;
    },

    // Load virtual module content
    load(id) {
      // Config module is always available (SvelteKit handle imports it unconditionally)
      if (id === "/@paraglide-debug/config.js") {
        return `export const requireOptIn = ${requireOptIn};`;
      }

      if (!isDebugMode) {
        if (id === "/@paraglide-debug/runtime.js") {
          return "// Paraglide debug mode is disabled";
        }
        return null;
      }

      if (id.startsWith("/@paraglide-debug/")) {
        // Strip the virtual prefix to get the file path
        // /@paraglide-debug/runtime.js → runtime.js
        // /@paraglide-debug/runtime/db.js → runtime/db.js
        const relativePath = id.replace("/@paraglide-debug/", "");
        const filePath = path.join(__dirname, relativePath);

        try {
          const code = fs.readFileSync(filePath, "utf-8");
          console.log(`[paraglide-debug] ✓ Loaded virtual module: ${relativePath}`);
          return code;
        } catch (err) {
          console.error(`[paraglide-debug] Error loading ${relativePath}:`, err);
          return `console.error("Failed to load Paraglide debug module: ${relativePath}");`;
        }
      }

      return null;
    },

    // Serve debug endpoints in development
    configureServer(server) {
      if (!isDebugMode) return;

      server.middlewares.use(createDebugMiddleware(viteConfig));

      console.log(
        "[paraglide-debug] ✓ Serving translations at /@paraglide-debug/langs.json"
      );
    },

    // Serve debug endpoints in preview
    configurePreviewServer(server) {
      if (!isDebugMode) return;

      server.middlewares.use(createDebugMiddleware(viteConfig));

      console.log(
        "[paraglide-debug] ✓ Serving translations at /@paraglide-debug/langs.json (preview)"
      );
    },

    // Transform _index.js to wrap with debug metadata
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, "/");

      // Check if this is a request for the original (unwrapped) code
      const isOriginalQuery = normalizedId.includes("_index.js?original");
      const isIndexFile =
        normalizedId.includes("/paraglide/messages/") &&
        normalizedId.includes("_index.js") &&
        !isOriginalQuery;

      if (isOriginalQuery) {
        return {
          code: this.originalIndexCode,
          map: null,
        };
      }

      if (!isDebugMode || !isIndexFile) {
        return null;
      }

      console.log("[paraglide-debug] ✓ Intercepting _index.js");

      this.originalIndexCode = code;

      const hasReExports = code.includes('export * from');

      // Extract module names from re-exports or function names from direct exports
      let wrapperCode;

      if (hasReExports) {
        const reExportMatches = code.matchAll(/export \* from ['"]\.\/(\w+)\.js['"]/g);
        const moduleNames = [];
        for (const match of reExportMatches) {
          moduleNames.push(match[1]);
        }

        if (moduleNames.length === 0) {
          console.log("[paraglide-debug] No re-exports found, passing through");
          return null;
        }

        console.log(
          "[paraglide-debug] Found re-exported modules:",
          moduleNames.join(", ")
        );

        // Generate wrapper that imports each module and wraps its exports
        wrapperCode = `
// Debug wrapper for Paraglide messages (re-export handling)
// Generated by vite-plugin-paraglide-debug

${moduleNames.map(name => `import * as _${name} from './${name}.js';`).join('\n')}

if (typeof window !== 'undefined') {
  window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};
  window.__paraglideBrowserDebug.messageFunctions = {
${moduleNames.map(name => `    ${name}: _${name}.${name}`).join(',\n')}
  };
}

${getDebugWrapFn(requireOptIn)}

${moduleNames
  .map(
    (name) => `export const ${name} = (inputs, options) => {
  const result = _${name}.${name}(inputs, options);
  return __debugWrap(result, "${name}", inputs);
};`
  )
  .join("\n")}
`;
      } else {
        // Extract both direct exports and aliased exports
        const exports = [];

        // Match: export const functionName =
        const directExportMatches = code.matchAll(/export const (\w+) = /g);
        for (const match of directExportMatches) {
          exports.push({
            internalName: match[1],
            exportedName: match[1]
          });
        }

        // Match: export { internalName as "exportedName" } or export { internalName as exportedName }
        const aliasedExportMatches = code.matchAll(/export\s*\{\s*(\w+)\s+as\s+["']?(\w+)["']?\s*\}/g);
        for (const match of aliasedExportMatches) {
          exports.push({
            internalName: match[1],
            exportedName: match[2]
          });
        }

        // Match: export { functionName } (no alias)
        const simpleExportMatches = code.matchAll(/export\s*\{\s*(\w+)\s*\}/g);
        for (const match of simpleExportMatches) {
          // Only add if not already added as aliased export
          const alreadyExists = exports.some(e => e.internalName === match[1]);
          if (!alreadyExists) {
            exports.push({
              internalName: match[1],
              exportedName: match[1]
            });
          }
        }

        if (exports.length === 0) {
          console.log("[paraglide-debug] No function exports found, passing through");
          return null;
        }

        console.log(
          "[paraglide-debug] Found message functions:",
          exports.map(e => e.internalName !== e.exportedName
            ? `${e.internalName} as ${e.exportedName}`
            : e.exportedName).join(", ")
        );

        // Generate wrapper that imports original via ?original query
        wrapperCode = `
// Debug wrapper for Paraglide messages
// Generated by vite-plugin-paraglide-debug

import * as _original from './_index.js?original';

if (typeof window !== 'undefined') {
  window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {};
  window.__paraglideBrowserDebug.messageFunctions = _original;
}

${getDebugWrapFn(requireOptIn)}

${exports
  .map(
    ({ exportedName }) => `export const ${exportedName} = (inputs, options) => {
  const result = _original.${exportedName}(inputs, options);
  return __debugWrap(result, "${exportedName}", inputs);
};`
  )
  .join("\n")}
`;
      }

      return {
        code: wrapperCode,
        map: null,
      };
    },

    // Inject runtime script for standard Vite apps (vanilla, React, etc.)
    // NOTE: This does NOT run in SvelteKit — see JSDoc above for SvelteKit setup.
    transformIndexHtml: {
      order: htmlTransformOrder,
      handler(html) {
        if (!isDebugMode) return html;

        const configScript = `<script>window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {}; window.__paraglideBrowserDebug.config = { requireOptIn: ${requireOptIn} };</script>`;
        const runtimeScript =
          '<script type="module" src="/@paraglide-debug/runtime.js"></script>';

        // Inject config before runtime, before closing </body> tag
        return html.replace("</body>", configScript + "\n" + runtimeScript + "\n</body>");
      },
    },
  };
}

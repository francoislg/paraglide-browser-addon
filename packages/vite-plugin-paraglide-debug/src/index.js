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
 * 3. Injects runtime script via HTML transformation
 * 4. Serves translation JSON at `/@paraglide-debug/langs.json` endpoint
 * 5. Provides virtual modules under `/@paraglide-debug/*` prefix
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
 *     paraglideBrowserDebugPlugin()
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
// Shared __debugWrap function body used by both re-export and direct-export wrappers
const DEBUG_WRAP_FN = `
function __debugWrap(text, key, params) {
  if (typeof text !== 'string') return text;

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

export function paraglideBrowserDebugPlugin() {

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
      console.log(
        "[paraglide-debug] Note: For SvelteKit, add script tag to app.html conditioned on env variable"
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

${DEBUG_WRAP_FN}

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

${DEBUG_WRAP_FN}

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

    // Inject runtime script to build element registry (for standard Vite apps)
    transformIndexHtml: {
      order: htmlTransformOrder,
      handler(html) {
        if (!isDebugMode) return html;

        // Inject script tag that loads from the served endpoint
        const scriptTag =
          '<script type="module" src="/@paraglide-debug/runtime.js"></script>';

        // Inject before closing </body> tag
        return html.replace("</body>", scriptTag + "\n</body>");
      },
    },

    // SvelteKit-specific hook for HTML transformation
    transformPageChunk({ html, done }) {
      if (!isDebugMode || !done) return null;

      // Inject script tag that loads from the served endpoint
      const scriptTag =
        '<script type="module" src="/@paraglide-debug/runtime.js"></script>';

      // Inject before closing </body> tag
      return html.replace("</body>", scriptTag + "\n</body>");
    },
  };
}

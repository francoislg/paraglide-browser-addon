import { createEditorMiddleware } from "./middleware.js";
import { loadEnv } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Vite plugin for ParaglideJS editor metadata injection
 *
 * This plugin intercepts Paraglide-generated message functions and wraps them
 * to track translation usage in the browser. It enables runtime editing tools
 * and browser extensions to identify which translation keys are used on a page.
 *
 * **How it works:**
 * 1. Detects `PARAGLIDE_EDITOR=true` environment variable
 * 2. Intercepts `messages/_index.js` transform and wraps message functions
 * 3. Injects runtime script via `transformIndexHtml` (standard Vite apps)
 * 4. Serves translation JSON at `/@paraglide-editor/langs.json` endpoint
 * 5. Provides virtual modules under `/@paraglide-editor/*` prefix
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
 * import { paraglideEditorHandle } from 'vite-plugin-paraglide-editor/sveltekit';
 *
 * const paraglideHandle = ({ event, resolve }) =>
 *   paraglideMiddleware(event.request, ({ request, locale }) => {
 *     event.request = request;
 *     return resolve(event, {
 *       transformPageChunk: ({ html }) => html.replace('%lang%', locale)
 *     });
 *   });
 *
 * export const handle = sequence(paraglideHandle, paraglideEditorHandle);
 * ```
 *
 * **When editor mode is enabled:**
 * - Message functions store text→metadata mapping in `window.__paraglideEditor.registry`
 * - Runtime script scans DOM and adds `data-paraglide-key` attributes
 * - MutationObserver keeps tracking up-to-date as DOM changes
 *
 * **When editor mode is disabled:**
 * - Plugin becomes a no-op (no transformation, no runtime injection)
 * - Zero overhead in production builds
 *
 * @param {Object} [options] - Plugin options
 * @param {boolean} [options.requireOptIn=false] - When true, the editor runtime
 *   stays dormant until the user activates it from the browser console:
 *   `localStorage.setItem('pge-enabled', 'true')`
 *   When false (default), editor tools activate automatically when the env var is set.
 *
 * @example
 * ```js
 * // vite.config.js
 * import { paraglide } from '@inlang/paraglide-vite';
 * import { paraglideEditorPlugin } from 'vite-plugin-paraglide-editor';
 *
 * export default defineConfig({
 *   plugins: [
 *     paraglide({
 *       project: './project.inlang',
 *       outdir: './src/paraglide'
 *     }),
 *     // Debug tools activate automatically (default)
 *     paraglideEditorPlugin()
 *
 *     // Or require explicit opt-in via localStorage
 *     // paraglideEditorPlugin({ requireOptIn: true })
 *   ]
 * });
 * ```
 *
 * @example
 * ```bash
 * # Enable editor mode in .env
 * PARAGLIDE_EDITOR=true
 * ```
 */
/**
 * Generate the __editorWrap function body injected into the message wrapper module.
 * When requireOptIn is false, the localStorage gate is skipped entirely.
 */
function getEditorWrapFn(requireOptIn) {
  return `
${
  requireOptIn
    ? `let __editorEnabled;
function __isPgeEnabled() {
  return typeof window !== 'undefined' && localStorage.getItem('pge-enabled') === 'true';
}`
    : ""
}
function __editorWrap(text, key, params) {
  if (typeof text !== 'string') return text;
${
  requireOptIn
    ? `
  if (__editorEnabled === undefined) {
    __editorEnabled = __isPgeEnabled();
    if (typeof window !== 'undefined') {
      window.__paraglideEditor = window.__paraglideEditor || {};
      window.__paraglideEditor.isPgeEnabled = __isPgeEnabled;
    }
  }
  if (!__editorEnabled) return text;
`
    : ""
}
  if (typeof window !== 'undefined') {
    window.__paraglideEditor = window.__paraglideEditor || {};
    const wasEmpty = !window.__paraglideEditor.registry;
    window.__paraglideEditor.registry = window.__paraglideEditor.registry || new Map();
    window.__paraglideEditor.registry.set(text, {
      key: key,
      params: params || {},
      timestamp: Date.now()
    });

    if (wasEmpty) {
      requestAnimationFrame(() => {
        const event = new CustomEvent('__paraglideInitialized', {
          detail: {
            timestamp: Date.now(),
            registrySize: window.__paraglideEditor.registry.size
          }
        });
        window.dispatchEvent(event);
        console.log('[paraglide-editor] Registry initialized with ' + window.__paraglideEditor.registry.size + ' entries');
      });
    }
  }

  return text;
}`;
}

export function paraglideEditorPlugin(options = {}) {
  const { requireOptIn = false } = options;

  let viteConfig;
  let isEditorMode = false;

  /** @type {"post"} */
  const enforce = "post";

  /** @type {"pre"} */
  const htmlTransformOrder = "pre";

  return {
    name: "paraglide-editor",
    enforce, // Run after the official Paraglide plugin

    configResolved(config) {
      viteConfig = config;
      // Load PARAGLIDE_-prefixed env vars from .env files
      // (Vite's config.env only includes VITE_-prefixed vars by default)
      const editorEnv = loadEnv(config.mode, config.root, "PARAGLIDE_");
      isEditorMode = editorEnv.PARAGLIDE_EDITOR === "true";
      console.log("[paraglide-editor] Plugin configured");
      console.log("[paraglide-editor] Editor mode:", isEditorMode);
      console.log(
        "[paraglide-editor] Environment check:",
        editorEnv.PARAGLIDE_EDITOR,
      );
    },

    // Resolve virtual module IDs
    resolveId(id, importer) {
      // Handle direct virtual module references
      if (id.startsWith("/@paraglide-editor/")) {
        return id;
      }

      // Handle relative imports from virtual modules
      if (importer && importer.startsWith("/@paraglide-editor/")) {
        if (id.startsWith("./") || id.startsWith("../")) {
          // Resolve relative path against importer
          // e.g., importer: /@paraglide-editor/runtime.js, id: ./runtime/db.js
          // → /@paraglide-editor/runtime/db.js
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
      if (id === "/@paraglide-editor/config.js") {
        return `export const requireOptIn = ${requireOptIn};\nexport const editorEnabled = ${isEditorMode};`;
      }

      if (!isEditorMode) {
        if (id === "/@paraglide-editor/runtime.js") {
          return "// Paraglide editor mode is disabled";
        }
        return null;
      }

      if (id.startsWith("/@paraglide-editor/")) {
        // Strip the virtual prefix to get the file path
        // /@paraglide-editor/runtime.js → runtime.js
        // /@paraglide-editor/runtime/db.js → runtime/db.js
        const relativePath = id.replace("/@paraglide-editor/", "");
        const filePath = path.join(__dirname, relativePath);

        try {
          const code = fs.readFileSync(filePath, "utf-8");
          console.log(
            `[paraglide-editor] ✓ Loaded virtual module: ${relativePath}`,
          );
          return code;
        } catch (err) {
          console.error(
            `[paraglide-editor] Error loading ${relativePath}:`,
            err,
          );
          return `console.error("Failed to load Paraglide editor module: ${relativePath}");`;
        }
      }

      return null;
    },

    // Serve editor endpoints in development
    configureServer(server) {
      if (!isEditorMode) return;

      server.middlewares.use(createEditorMiddleware(viteConfig));

      console.log(
        "[paraglide-editor] ✓ Serving translations at /@paraglide-editor/langs.json",
      );
    },

    // Serve editor endpoints in preview
    configurePreviewServer(server) {
      if (!isEditorMode) return;

      server.middlewares.use(createEditorMiddleware(viteConfig));

      console.log(
        "[paraglide-editor] ✓ Serving translations at /@paraglide-editor/langs.json (preview)",
      );
    },

    // Transform _index.js to wrap with editor metadata
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

      if (!isEditorMode || !isIndexFile) {
        return null;
      }

      console.log("[paraglide-editor] ✓ Intercepting _index.js");

      this.originalIndexCode = code;

      const hasReExports = code.includes("export * from");

      // Extract module names from re-exports or function names from direct exports
      let wrapperCode;

      if (hasReExports) {
        const reExportMatches = code.matchAll(
          /export \* from ['"]\.\/(\w+)\.js['"]/g,
        );
        const moduleNames = [];
        for (const match of reExportMatches) {
          moduleNames.push(match[1]);
        }

        if (moduleNames.length === 0) {
          console.log(
            "[paraglide-editor] No re-exports found, passing through",
          );
          return null;
        }

        console.log(
          "[paraglide-editor] Found re-exported modules:",
          moduleNames.join(", "),
        );

        // Generate wrapper that imports each module and wraps its exports
        wrapperCode = `
// Debug wrapper for Paraglide messages (re-export handling)
// Generated by vite-plugin-paraglide-editor

${moduleNames.map((name) => `import * as _${name} from './${name}.js';`).join("\n")}

if (typeof window !== 'undefined') {
  window.__paraglideEditor = window.__paraglideEditor || {};
  window.__paraglideEditor.messageFunctions = {
${moduleNames.map((name) => `    ${name}: _${name}.${name}`).join(",\n")}
  };
}

${getEditorWrapFn(requireOptIn)}

${moduleNames
  .map(
    (name) => `export const ${name} = (inputs, options) => {
  const result = _${name}.${name}(inputs, options);
  return __editorWrap(result, "${name}", inputs);
};`,
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
            exportedName: match[1],
          });
        }

        // Match: export { internalName as "exportedName" } or export { internalName as exportedName }
        const aliasedExportMatches = code.matchAll(
          /export\s*\{\s*(\w+)\s+as\s+["']?(\w+)["']?\s*\}/g,
        );
        for (const match of aliasedExportMatches) {
          exports.push({
            internalName: match[1],
            exportedName: match[2],
          });
        }

        // Match: export { functionName } (no alias)
        const simpleExportMatches = code.matchAll(/export\s*\{\s*(\w+)\s*\}/g);
        for (const match of simpleExportMatches) {
          // Only add if not already added as aliased export
          const alreadyExists = exports.some(
            (e) => e.internalName === match[1],
          );
          if (!alreadyExists) {
            exports.push({
              internalName: match[1],
              exportedName: match[1],
            });
          }
        }

        if (exports.length === 0) {
          console.log(
            "[paraglide-editor] No function exports found, passing through",
          );
          return null;
        }

        console.log(
          "[paraglide-editor] Found message functions:",
          exports
            .map((e) =>
              e.internalName !== e.exportedName
                ? `${e.internalName} as ${e.exportedName}`
                : e.exportedName,
            )
            .join(", "),
        );

        // Generate wrapper that imports original via ?original query
        wrapperCode = `
// Debug wrapper for Paraglide messages
// Generated by vite-plugin-paraglide-editor

import * as _original from './_index.js?original';

if (typeof window !== 'undefined') {
  window.__paraglideEditor = window.__paraglideEditor || {};
  window.__paraglideEditor.messageFunctions = _original;
}

${getEditorWrapFn(requireOptIn)}

${exports
  .map(
    ({ exportedName }) => `export const ${exportedName} = (inputs, options) => {
  const result = _original.${exportedName}(inputs, options);
  return __editorWrap(result, "${exportedName}", inputs);
};`,
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
        if (!isEditorMode) return html;

        const configScript = `<script>window.__paraglideEditor = window.__paraglideEditor || {}; window.__paraglideEditor.config = { requireOptIn: ${requireOptIn} };</script>`;
        const runtimeScript =
          '<script type="module" src="/@paraglide-editor/runtime.js"></script>';

        // Inject config before runtime, before closing </body> tag
        return html.replace(
          "</body>",
          configScript + "\n" + runtimeScript + "\n</body>",
        );
      },
    },
  };
}

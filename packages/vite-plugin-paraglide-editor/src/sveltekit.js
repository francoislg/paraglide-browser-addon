/**
 * SvelteKit integration for vite-plugin-paraglide-editor.
 *
 * SvelteKit sets `appType: 'custom'`, which bypasses Vite's HTML pipeline,
 * so the plugin's `transformIndexHtml` hook never fires. This module provides
 * a SvelteKit `handle` function that injects the editor runtime via
 * `transformPageChunk` instead.
 *
 * Plugin options (like `requireOptIn`) are read automatically from the Vite
 * plugin config via a virtual module — no need to pass them again here.
 *
 * @example Composing with paraglideMiddleware
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
 * @example Standalone usage
 * ```js
 * // src/hooks.server.js
 * export { paraglideEditorHandle as handle } from 'vite-plugin-paraglide-editor/sveltekit';
 * ```
 */

import { requireOptIn, editorEnabled, runtimeUrl, translationsUrl } from "/@paraglide-editor/config.js";

/**
 * SvelteKit `handle` function that conditionally injects the paraglide-editor
 * runtime script into rendered HTML.
 *
 * Only injects when `PARAGLIDE_EDITOR=true` is set.
 * Reads `requireOptIn` from the Vite plugin config automatically.
 *
 * @type {import('@sveltejs/kit').Handle}
 */
export async function paraglideEditorHandle({ event, resolve }) {
  return await resolve(event, {
    transformPageChunk: ({ html }) => {
      if (editorEnabled) {
        const config = `<script>window.__paraglideEditor = window.__paraglideEditor || {}; window.__paraglideEditor.config = { requireOptIn: ${requireOptIn}, translationsUrl: "${translationsUrl}" };</script>`;
        const runtime =
          `<script type="module" src="${runtimeUrl}"></script>`;
        return html.replace("</body>", config + "\n" + runtime + "\n</body>");
      }
      return html;
    },
  });
}

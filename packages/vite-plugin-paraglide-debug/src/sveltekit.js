/**
 * SvelteKit integration for vite-plugin-paraglide-debug.
 *
 * SvelteKit sets `appType: 'custom'`, which bypasses Vite's HTML pipeline,
 * so the plugin's `transformIndexHtml` hook never fires. This module provides
 * a SvelteKit `handle` function that injects the debug runtime via
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
 * @example Standalone usage
 * ```js
 * // src/hooks.server.js
 * export { paraglideDebugHandle as handle } from 'vite-plugin-paraglide-debug/sveltekit';
 * ```
 */

import { requireOptIn } from '/@paraglide-debug/config.js';

/**
 * SvelteKit `handle` function that conditionally injects the paraglide-debug
 * runtime script into rendered HTML.
 *
 * Only injects when `VITE_PARAGLIDE_BROWSER_DEBUG=true` is set.
 * Reads `requireOptIn` from the Vite plugin config automatically.
 *
 * @type {import('@sveltejs/kit').Handle}
 */
export async function paraglideDebugHandle({ event, resolve }) {
  return await resolve(event, {
    transformPageChunk: ({ html }) => {
      if (import.meta.env.VITE_PARAGLIDE_BROWSER_DEBUG === 'true') {
        const config = `<script>window.__paraglideBrowserDebug = window.__paraglideBrowserDebug || {}; window.__paraglideBrowserDebug.config = { requireOptIn: ${requireOptIn} };</script>`;
        const runtime = '<script type="module" src="/@paraglide-debug/runtime.js"></script>';
        return html.replace('</body>', config + '\n' + runtime + '\n</body>');
      }
      return html;
    }
  });
}

import type { Handle } from "@sveltejs/kit";

/**
 * SvelteKit `handle` function that injects the paraglide-editor runtime into rendered HTML.
 *
 * Use with `sequence()` in `src/hooks.server.js`:
 * ```js
 * import { sequence } from '@sveltejs/kit/hooks';
 * import { paraglideEditorHandle } from 'vite-plugin-paraglide-editor/sveltekit';
 * export const handle = sequence(paraglideHandle, paraglideEditorHandle);
 * ```
 */
export const paraglideEditorHandle: Handle;

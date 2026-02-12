import type { Plugin } from "vite";

export interface ParaglideEditorOptions {
  /**
   * When true, the editor runtime stays dormant until the user activates it:
   * `localStorage.setItem('pge-enabled', 'true')`
   *
   * When false (default), editor tools activate automatically when the env var is set.
   * @default false
   */
  requireOptIn?: boolean;
}

/**
 * Vite plugin that injects an in-browser translation editor for ParaglideJS.
 *
 * Activated by setting `PARAGLIDE_EDITOR=true` in your `.env` file.
 */
export function paraglideEditorPlugin(options?: ParaglideEditorOptions): Plugin;

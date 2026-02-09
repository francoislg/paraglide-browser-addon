import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { paraglideEditorPlugin } from 'vite-plugin-paraglide-editor';

export default defineConfig({
  plugins: [
    // Official Paraglide plugin - generates message functions
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/lib/paraglide'
    }),
    // Editor plugin - enables in-browser translation editing
    paraglideEditorPlugin({
      outdir: './src/lib/paraglide'
    }),
    sveltekit()
  ],
  server: {
    port: 3230,
    strictPort: true
  },
  preview: {
    port: 3230,
    strictPort: true
  }
});

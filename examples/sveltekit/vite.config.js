import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { paraglideBrowserDebugPlugin } from 'vite-plugin-paraglide-debug';

export default defineConfig({
  plugins: [
    // Official Paraglide plugin - generates message functions
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/lib/paraglide'
    }),
    // Debug plugin - injects HTML comment metadata in development
    paraglideBrowserDebugPlugin({
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

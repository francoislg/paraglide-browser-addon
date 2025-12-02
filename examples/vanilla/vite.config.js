import { defineConfig } from 'vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { paraglideBrowserDebugPlugin } from 'vite-plugin-paraglide-debug';

export default defineConfig({
  plugins: [
    // Official Paraglide plugin - generates message functions
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide'
    }),
    // Debug plugin - injects HTML comment metadata in development
    paraglideBrowserDebugPlugin({
      outdir: './src/paraglide'
    })
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
});

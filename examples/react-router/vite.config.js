import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { paraglideBrowserDebugPlugin } from 'vite-plugin-paraglide-debug';

export default defineConfig({
  plugins: [
    react(),
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
  server: {
    port: 3220,
    strictPort: true
  },
  preview: {
    port: 3220,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  }
});

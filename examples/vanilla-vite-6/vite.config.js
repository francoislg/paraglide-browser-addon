import { defineConfig } from "vite";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import { paraglideEditorPlugin } from "vite-plugin-paraglide-editor";

export default defineConfig({
  plugins: [
    // Official Paraglide plugin - generates message functions
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
    }),
    // Editor plugin - enables in-browser translation editing
    paraglideEditorPlugin({
      outdir: "./src/paraglide",
    }),
  ],
  server: {
    port: 3215,
    strictPort: true,
  },
  preview: {
    port: 3215,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "./index.html",
      },
    },
  },
});

import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  publicDir: "public",
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  build: {
    outDir: "_site/assets",
    emptyOutDir: false,
    copyPublicDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: { research: "client/main.tsx", index: "client/index.ts" },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: (asset) =>
          asset.name?.endsWith(".css") ? "research.css" : "[name][extname]",
      },
    },
  },
});

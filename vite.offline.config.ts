import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist-offline",
    emptyOutDir: true,
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    rollupOptions: {
      input: "offline.html",
      output: { inlineDynamicImports: true },
    },
  },
});

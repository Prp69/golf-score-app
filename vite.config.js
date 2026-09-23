import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // chemins relatifs : indispensable pour que les assets se chargent dans une WebView native (file://)
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

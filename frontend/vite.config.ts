import react from "@vitejs/plugin-react";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

function copyPdfAssets() {
  return {
    name: "copy-pdf-assets",
    buildStart() {
      const require = createRequire(import.meta.url);
      const pdfjsDistPath = path.dirname(
        require.resolve("pdfjs-dist/package.json"),
      );
      const pdfWorkerPath = path.join(pdfjsDistPath, "build", "pdf.worker.mjs");
      fs.cpSync(pdfWorkerPath, "./public/pdf.worker.mjs");
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(), copyPdfAssets()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": "http://localhost:8000",
    },
    headers: {
      // Development server headers.
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "X-XSS-Protection": "1; mode=block",
      "Content-Security-Policy":
        "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src * data:; script-src 'self' 'unsafe-inline' 'unsafe-eval';",
    },
  },
});

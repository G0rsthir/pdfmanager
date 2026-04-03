import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
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

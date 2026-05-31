import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    // Allow requests from the Cloudflare tunnel hostname
    allowedHosts: ["dev-mt.mrz.sh", "localhost"],
    // HMR disabled — WSS through Cloudflare tunnel blocks Telegram webview
    hmr: false,
    // Proxy /api to Express game server
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});

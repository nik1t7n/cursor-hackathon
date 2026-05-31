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
    // HMR through tunnel: websocket must use wss on port 443
    hmr: {
      host: "dev-mt.mrz.sh",
      protocol: "wss",
      clientPort: 443,
    },
    // Proxy /api to Express game server
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});

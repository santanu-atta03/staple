import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5055",
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err, req, res) => {
            if (res && !res.headersSent && typeof res.writeHead === "function") {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ success: false, message: "Backend offline" }));
            }
          });
        },
      },
      "/socket.io": {
        target: "http://localhost:5055",
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on("error", (err, req, res) => {
            // Suppress transient socket errors
          });
          proxy.on("proxyReqWs", (proxyReq, req, socket) => {
            socket.on("error", (err) => {
              // Suppress connection resets
            });
          });
        },
      },
    },
  },
});
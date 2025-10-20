import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    cloudflare({
      config: {
        env: {
          local: {},
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src/react-app"),
    },
  },
  server: {
    port: 5173,
  },
});

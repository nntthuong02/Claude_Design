import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react()],
  server: {
    port: 5175,
    open: true,
    proxy: {
      "/api": "http://localhost:4321",
      "/designs": "http://localhost:4321",
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Static SPA. Served behind Cloudflare tunnel at payvault.shadrakbessanh.me.
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    target: "es2020",
  },
});

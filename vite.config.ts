import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" 让构建产物可以部署在 GitHub Pages 的项目子路径下
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
  },
});


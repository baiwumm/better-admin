import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
  // 固定端口 + strictPort：被占时报错而非静默漂移，五端并行开发端口即身份
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    // 约定式路由：扫描 src/routes/ 自动生成 routeTree.gen.ts + 路由级代码分割
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
});

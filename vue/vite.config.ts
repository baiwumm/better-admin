import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import ui from "@nuxt/ui/vite";
import { defineConfig } from "vite";
import VueRouter from "vue-router/vite";

export default defineConfig({
  plugins: [
    ui(),
    vue(),
    // 官方文件式路由插件（unplugin-vue-router 并入 vue-router 后的形态）；
    // 默认 routesFolder: src/pages，构建期生成 typed-router.d.ts 与路由表
    VueRouter(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

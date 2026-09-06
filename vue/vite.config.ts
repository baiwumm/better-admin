import { fileURLToPath, URL } from "node:url";

import vue from "@vitejs/plugin-vue";
import ui from "@nuxt/ui/vite";
import { defineConfig, type Plugin } from "vite";
import VueRouter from "vue-router/vite";

/**
 * @nuxt/ui stubs 补丁：4.11.0 的 stubs/vue-router.js 相对部分组件缺失
 * onServerPrefetch / useAsyncData / defineComponent 导出，rolldown 对
 * `#imports` 的 re-export 链严格校验失败。本插件抢先解析 `#imports` 到
 * 项目内 shim（见 src/shims/nuxt-ui-imports.ts，转发原 stub 并补齐缺名）。
 */
function nuxtUiImportsShim(): Plugin {
  const shimPath = fileURLToPath(
    new URL("./src/shims/nuxt-ui-imports.ts", import.meta.url),
  );

  return {
    name: "better-admin:nuxt-ui-imports-shim",
    enforce: "pre",
    resolveId(id) {
      if (id === "#imports") return shimPath;

      return undefined;
    },
  };
}

export default defineConfig({
  plugins: [
    // 本补丁须位于 ui() 之前：同为 enforce:pre 的 resolveId 按数组顺序命中
    nuxtUiImportsShim(),
    // 扫描源码中使用的图标名并打进 virtual:nuxt-ui-icons 客户端 bundle：
    // 纯 Vue 环境没有 Nuxt 模块的自动聚合，不开启扫描时仅注册 appConfig
    // 默认图标，动态图标名（下拉/菜单 items）会渲染为空白。
    // ui() 必须在 vue() 之前：rolldown-vite 下 "@nuxt/ui/vue-plugin"
    // 虚拟模块重定向依赖其 resolveId 先注册（实测顺序，官方文档相反）
    ui({
      icon: { clientBundle: { scan: true } },
    }),
    vue(),
    // 官方文件式路由插件（unplugin-vue-router 并入 vue-router 后的形态）；
    // 默认 routesFolder: src/pages，构建期生成 typed-router.d.ts 与路由表
    VueRouter(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // @nuxt/icon 的可选本地 bundle（Nuxt 虚拟模块）在纯 Vue 下以空 shim 代替
      "#build/nuxt-icon-client-bundle": fileURLToPath(
        new URL("./src/shims/nuxt-icon-client-bundle.ts", import.meta.url),
      ),
    },
  },
  // @nuxt/ui 被插件强制排除出预构建（optimizeDeps.exclude），其内部裸依赖
  // 必须显式 include，否则 dev 运行时逐个发现 → 反复 re-optimize → 无限
  // full reload（页面持续闪动）。包已在 package.json 显式声明（可解析）。
  optimizeDeps: {
    include: [
      "reka-ui",
      "defu",
      "hookable",
      "consola",
      "ohash",
      "scule",
      "@unhead/vue",
      "@iconify/vue",
      "@internationalized/date",
      "@internationalized/number",
      "@floating-ui/dom",
      "@tanstack/vue-virtual",
      "@standard-schema/spec",
    ],
  },
});

import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
// 官方文件式路由：路由表由 vite 插件按 src/pages/ 文件树生成
import { routes } from "vue-router/auto-routes";
import ui from "@nuxt/ui/vue-plugin";

import App from "./App.vue";
import { i18n } from "./i18n";
import { queryClient } from "./lib/query-client";
import { setupRouterGuards } from "./router/guards";
import { bindAuthToApiClient } from "./stores/auth-store";
import "./styles/main.css";

const app = createApp(App);

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 三层守卫（登录拦截 / 会话保障+菜单权限 / 白名单）与文档标题
setupRouterGuards(router);

app.use(createPinia());
app.use(VueQueryPlugin, { queryClient });
app.use(i18n);
app.use(router);
app.use(ui);

// auth-store 与 api-client 解耦绑定（读取 token 的唯一通道）
bindAuthToApiClient();

// 必须等路由初始导航解析完成后再挂载：挂载过早时 useRoute() 仍是初始占位
// 路由（path="/"），AppShell 会在公共页（如 /sign-in）误挂 AdminLayout，
// 触发无 token 的 /menus 请求 → 401 → location.assign("/sign-in") 整页刷新，
// 形成「加载 → 误挂布局 → 401 → 整页刷新」死循环（M1 冒烟验收定位）。
router.isReady().then(() => app.mount("#app"));

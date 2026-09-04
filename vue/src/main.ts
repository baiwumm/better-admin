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

app.mount("#app");

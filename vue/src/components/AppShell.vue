<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useToast } from "@nuxt/ui/composables";

import AdminLayout from "@/layouts/AdminLayout.vue";
import AuthLayout from "@/layouts/AuthLayout.vue";
import { ApiClientError, setApiErrorHandler } from "@/lib/api-client";
import { isAdminLayoutRoute, isAuthLayoutPath } from "@/lib/route-access";

/**
 * 应用外壳（挂在 UApp 内，可安全使用 toast 上下文）：
 * - 注册 api-client 全局错误桥（5xx → toast；401 已由 api-client 内部跳登录）
 * - 布局分支：公共页（登录 / 错误页）与 catch-all 404 全屏渲染；
 *   认证态页面统一进 AdminLayout（对应 React 端 _authenticated 布局路由）
 */
const toast = useToast();

setApiErrorHandler((error) => {
  if (error instanceof ApiClientError && error.status >= 500) {
    toast.add({
      color: "error",
      title: error.message,
    });
  }
});

const route = useRoute();

const useAdminLayout = computed(() => isAdminLayoutRoute(route));

// 认证页外壳（React 端 (auth) 路由组对应物）：登录 / 后续注册、忘记密码
const useAuthLayout = computed(() => isAuthLayoutPath(route.path));
</script>

<template>
  <AuthLayout v-if="useAuthLayout" />
  <AdminLayout v-else-if="useAdminLayout" />
  <RouterView v-else />
</template>

import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/stores/auth-store";

// Generated Routes（由 @tanstack/router-plugin 自动生成，勿手改）

export interface RouterContext {
  queryClient: typeof queryClient;
  auth: typeof useAuthStore;
}

// Create a new router instance
export const router = createRouter({
  routeTree,
  context: { queryClient, auth: useAuthStore },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  // 开启 View Transitions：TanStack Router 会在每次路由提交（navigate / 前进后退）
  // 时用 document.startViewTransition 包裹 DOM 更新，配合
  // `html[data-route-transition="<id>"]`（见 styles/route-transitions.css）实现页面切换动画。
  // 具体动画预设由偏好设置「路由过渡动画」控制（routeTransition === 'none' 时
  // 移除 data-route-transition 属性 → 无动画，等同直切）。
  defaultViewTransition: true,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

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
  // 注意：不使用 TanStack 的 defaultViewTransition（其内部 startViewTransition 未
  // 捕获快速连续导航时的 AbortError，会导致未处理异常）。页面过渡动画由
  // layouts/components/route-transition.tsx 自行控制（双缓冲 + flushSync + VT）。
  //
  // TanStack 默认 resetScroll: true（导航后 scroll 回顶部），
  // 由 KeepAliveOutlet 的 layout effect 显式恢复 keepAlive 路径的滚动位置，
  // 与 resetScroll 机制不冲突（resetScroll 先跑，之后我们恢复到缓存位置）。
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

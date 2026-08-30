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
  // layouts/components/keep-alive-outlet.tsx 自行编排
  // （displayedPath 呈现管理 + VT + flushSync，旧快照为真实旧帧）。
  //
  // TanStack 默认 resetScroll: true（导航后 scroll 回顶部），
  // 由 KeepAlivePane 的 layout effect 显式恢复 keepAlive 路径的滚动位置，
  // 与 resetScroll 机制不冲突（resetScroll 先跑，之后我们恢复到缓存位置）。
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

/**
 * /500 跳转中转（routes/__root.tsx ServerErrorRedirect）携带的 history state：
 * HistoryState 为空接口（@tanstack/history 非直接依赖，无法模块扩充），
 * 写入端断言、读取端收窄为该类型——from 为出错页 URL，供错误页「重试」回原 URL。
 */
export type ErrorRedirectState = { from?: string };

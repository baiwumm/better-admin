import { QueryClient } from "@tanstack/vue-query";

/**
 * 全局 QueryClient：菜单等服务端数据请求在此去重、缓存。
 * 配置与 React 端 query-client.ts 对齐。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

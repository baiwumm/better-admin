import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

import { ENV } from "@/lib/env";

/** 全站静态数据统一形态：叶子页面标题（可选），供浏览器标签页标题使用 */
declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    /** 浏览器标签页标题（叶子页面名，如「用户管理」），由 useDocumentTitle 统一拼接品牌名 */
    title?: string;
  }
}

/**
 * 同步浏览器标签页标题：取当前最深匹配路由的 staticData.title，
 * 拼接为 `${页面标题} - ${ENV.appName}`；未声明 title 的路由回退显示 `${ENV.appName}`。
 * 必须挂在根路由（__root.tsx）才能覆盖登录页与错误页。
 * 订阅的是 router state（导航即时更新），与 keepAlive 页面实例挂载无关。
 */
export function useDocumentTitle(): void {
  const pageTitle = useRouterState({
    select: (state) => {
      const deepest = state.matches[state.matches.length - 1];

      return deepest?.staticData?.title;
    },
  });

  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} - ${ENV.appName}` : ENV.appName;
  }, [pageTitle]);
}

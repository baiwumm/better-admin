import type { RouterContext } from "@/router";

import { useEffect } from "react";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Toast } from "@heroui/react";
import { useProgress } from "@bprogress/react";

import { GeneralErrorPage } from "@/components/common/error-pages/general-error";
import { NotFoundErrorPage } from "@/components/common/error-pages/not-found-error";
import { useRouteProgress } from "@/hooks/use-route-progress";
import { bindProgress } from "@/lib/progress";
import { useDocumentTitle } from "@/lib/use-document-title";

function RootComponent() {
  // 全局同步浏览器标签页标题：`${页面标题} - ${品牌名}`
  useDocumentTitle();

  // 路由导航进度条
  useRouteProgress();

  // 将 useProgress 的 start/stop 注入非 React 模块（api-client / 路由进度），
  // 时序配置（startPosition / delay / stopDelay）同步下发，保证单一来源
  const { start, stop, startPosition, delay, stopDelay } = useProgress();

  useEffect(() => {
    bindProgress(
      { start, stop },
      { startPosition, startDelayMs: delay, stopDelayMs: stopDelay },
    );
  }, [start, stop, startPosition, delay, stopDelay]);

  return (
    <>
      <Outlet />
      {/* 全局 Toast 队列（命令式 toast.success / toast.danger 等） */}
      <Toast.Provider placement="top" />
    </>
  );
}

/**
 * 根路由兜底（布局外全屏，仅登录页等 AdminLayout 之外的场景会看到）：
 * - notFoundComponent / errorComponent 直挂组件，不做跳转。
 * - 登录态下未匹配 URL 由 catch-all splat（/_authenticated/$）兜住,
 *   主体区 overlay 直显 404（见 admin-layout.tsx），不会走到这里。
 * - 登录态下页面渲染异常由 KeepAliveOutlet 的面板级错误边界接管,
 *   仅当前面板显示 500,也不会走到这里。
 * （设计决策 v3，2026-09-09：推翻 v2 的「跳转独立错误页 /403 /404 /500」，
 *   恢复主体区直显 + 布局外根兜底的组合。）
 */
export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundErrorPage,
  errorComponent: GeneralErrorPage,
});

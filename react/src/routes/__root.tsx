import type { RouterContext } from "@/router";

import { useEffect } from "react";
import {
  createRootRouteWithContext,
  Outlet,
  useNavigate,
  useRouter,
  type HistoryState,
} from "@tanstack/react-router";
import { Toast } from "@heroui/react";

import { GeneralErrorPage } from "@/components/common/error-pages/general-error";
import { NotFoundErrorPage } from "@/components/common/error-pages/not-found-error";
import { useDocumentTitle } from "@/lib/use-document-title";

function RootComponent() {
  // 全局同步浏览器标签页标题：`${页面标题} - ${品牌名}`
  useDocumentTitle();

  return (
    <>
      <Outlet />
      {/* 全局 Toast 队列（命令式 toast.success / toast.danger 等） */}
      <Toast.Provider placement="top" />
    </>
  );
}

/**
 * 404 跳转中转：未匹配路由 → replace 跳转独立 /404 页。
 * 设计决策 v2（2026-08-30）：错误页样式按独立全屏页设计，根路由的
 * notFound / error 不再直挂组件，统一跳转对应路由页（/403 /404 /500）。
 * 守卫：目标路由页自身触发 notFound 时直接渲染，避免跳转循环。
 */
function NotFoundRedirect() {
  const router = useRouter();
  const navigate = useNavigate();

  useEffect(() => {
    if (router.state.location.pathname === "/404") return;
    void navigate({ to: "/404", replace: true });
  }, [navigate, router]);

  if (router.state.location.pathname === "/404") {
    return <NotFoundErrorPage />;
  }

  return null;
}

/**
 * 500 跳转中转：渲染期未捕获错误 → replace 跳转独立 /500 页。
 * 出错 URL 经 router state（from）随跳转携带，/500 页的「重试」据此
 * 回到原 URL 重新渲染，保留原 errorComponent 直挂时的重试语义。
 * 守卫：/500 自身出错时直接渲染错误页，避免跳转循环。
 */
function ServerErrorRedirect() {
  const router = useRouter();
  const navigate = useNavigate();

  useEffect(() => {
    if (router.state.location.pathname === "/500") return;
    void navigate({
      replace: true,
      // HistoryState 为空接口，携带自定义字段需断言（读取端收窄见 router.ts）
      state: { from: router.state.location.href } as HistoryState,
      to: "/500",
    });
  }, [navigate, router]);

  if (router.state.location.pathname === "/500") {
    return <GeneralErrorPage />;
  }

  return null;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundRedirect,
  errorComponent: ServerErrorRedirect,
});

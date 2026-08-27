import type { RouterContext } from "@/router";

import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
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

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundErrorPage,
  errorComponent: GeneralErrorPage,
});

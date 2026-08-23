import type { RouterContext } from "@/router";

import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toast } from "@heroui/react";

import { GeneralErrorPage } from "@/components/error-pages/general-error";
import { NotFoundErrorPage } from "@/components/error-pages/not-found-error";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <Outlet />
      {/* 全局 Toast 队列（命令式 toast.success / toast.danger 等） */}
      <Toast.Provider />
      {import.meta.env.DEV && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </>
  ),
  notFoundComponent: NotFoundErrorPage,
  errorComponent: GeneralErrorPage,
});

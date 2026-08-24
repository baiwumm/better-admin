import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminLayout } from "@/layouts/admin-layout";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location, context }) => {
    // 未登录：跳登录页（带 redirect 回跳参数）。
    // 菜单权限判定（白名单 / 无权限 403 / 加载中 loading）统一在 admin-layout 内完成。
    const token = context.auth.getState().accessToken;

    if (!token) {
      throw redirect({
        to: "/sign-in",
        search: { redirect: location.href },
      });
    }
  },
  component: AdminLayout,
});
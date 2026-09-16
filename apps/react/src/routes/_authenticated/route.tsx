import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminLayout } from "@/layouts/admin-layout";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location, context }) => {
    // 未登录：跳登录页（带 redirect 回跳参数）。
    // 菜单权限判定（白名单 / 无权限 403 / 加载中 loading）统一在 admin-layout 内完成。
    const token = context.auth.getState().accessToken;

    if (!token) {
      // 根路径不带 redirect（与 Next proxy buildSignInRedirect / Nuxt
      // auth.global.ts 同构）：首页本就是登录后的默认落点，回跳 "/" 无意义；
      // 其余路径保留 redirect 供登录后回到原页面。
      throw redirect({
        to: "/sign-in",
        search: location.pathname === "/" ? {} : { redirect: location.href },
      });
    }
  },
  component: AdminLayout,
});

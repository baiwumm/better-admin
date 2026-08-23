import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminLayout } from "@/layouts/admin-layout";
import { ROUTE_PATHS } from "@/lib/route-paths";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location, context }) => {
    // 先做廉价的同步判断（本地 accessToken 是否存在），避免无谓的异步流程
    const token = context.auth.getState().accessToken;

    if (!token) {
      throw redirect({
        to: ROUTE_PATHS.signIn,
        search: { redirect: location.href },
      });
    }
    // 接入真实后端后：若内存无用户信息，此处补充 await getMe() 恢复会话。
  },
  component: AdminLayout,
});

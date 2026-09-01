import { redirect } from "next/navigation";

import { AdminShell } from "./admin-shell";

import { getSessionUser } from "@/lib/server/auth/request-auth";
import { findMenuTree } from "@/lib/server/menus-service";
import { filterAccessibleMenus } from "@/lib/permission";
import { CONSOLE_MENU_NODE } from "@/lib/menu-fetch";

/**
 * 认证区统一布局（RSC，等价 React 版 _authenticated/route.tsx + AdminLayout）：
 *
 * - 会话守卫：未登录 redirect /sign-in（proxy 已拦，此处双保险）；
 * - 服务端菜单过滤（方案修正二落地）：在 RSC 中按用户权限过滤菜单树
 *   （findMenuTree 后端可见性过滤 + filterAccessibleMenus 双保险），
 *   经 props 注入客户端 AdminShell——客户端只渲染，不做权限二次过滤，
 *   规避水合不一致；
 * - 菜单路径 403 门卫在 proxy 中执行（同一次会话校验链），此处不重复。
 */
export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/sign-in");
  }

  const backendTree = await findMenuTree(user);
  // 前端固定注入的「控制台」节点恒在最前（登录即可见，不依赖后端下发）
  const menuTree = [CONSOLE_MENU_NODE, ...filterAccessibleMenus(backendTree)];

  return (
    <AdminShell menuTree={menuTree} user={user}>
      {children}
    </AdminShell>
  );
}

import { redirect } from "next/navigation";

import { AdminShell } from "./admin-shell";

import { getSessionUser } from "@/lib/server/auth/request-auth";
import { findMenuTree } from "@/lib/server/menus-service";
import { CONSOLE_MENU_NODE } from "@/lib/menu-fetch";

/**
 * 认证区统一布局（RSC，等价 React 版 _authenticated/route.tsx + AdminLayout）：
 *
 * - 会话守卫：未登录 redirect /sign-in（proxy 已拦，此处双保险）；
 * - 服务端菜单过滤（方案修正二落地）：在 RSC 中调用 findMenuTree
 *   按用户角色关联做权限过滤（含祖先链补全），
 *   经 props 注入客户端 AdminShell——客户端只渲染 hideInMenu 过滤，
 *   不再做 userPermissions 二次过滤，规避分组节点被误杀；
 * - 菜单路径 403 门卫在 proxy 中执行（同一次会话校验链），此处不重复。
 *
 * 注意：filterAccessibleMenus 不再在此处调用——findMenuTree 内部的
 * buildAllowedMenuIds 已按 role_menus 完成权限过滤与祖先链补全，
 * 分组节点（如「系统管理」「组织中心」）的 userPermissions 为 "0"
 * （自身不声明权限位），filterAccessibleMenus 会将其误判为无权访问
 * 而砍掉整个分支。React 端侧边栏也仅用 filterHiddenMenus，不二次过滤。
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
  // findMenuTree 已完成权限过滤，无需 filterAccessibleMenus 二次过滤
  const menuTree = [CONSOLE_MENU_NODE, ...backendTree];

  return (
    <AdminShell menuTree={menuTree} user={user}>
      {children}
    </AdminShell>
  );
}

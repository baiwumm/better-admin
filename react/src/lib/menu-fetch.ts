import { type MenuNode } from "@/lib/api-types";
import { fetchApi } from "@/lib/api-client";
import { filterAccessibleMenus } from "@/lib/permission";

/**
 * 固定「控制台」菜单节点：写死、不受后端菜单接口控制、登录即可访问。
 * 始终位于菜单树最前（见 fetchMenus 合并逻辑），to 指向首页 "/"。
 */
export const CONSOLE_MENU_NODE: MenuNode = {
  id: "console",
  label: "控制台",
  icon: "layout-dashboard",
  to: "/",
  sort: 0,
  keepAlive: false,
  hideInMenu: false,
  enabled: true,
  defaultOpen: false,
  target: "_self",
  // 全 1 掩码：任何登录用户都可见（前端兜底，不依赖后端下发）
  permissions: "9223372036854775807",
  userPermissions: "9223372036854775807",
};

/**
 * 拉取「当前用户可见」的菜单树（权限过滤后）：
 * 后端 GET /api/menus + 前端合并固定「控制台」节点到最前。
 * 作为 useMenus 与登录后 prefetch 的共用 queryFn（单一数据源）。
 */
export async function fetchMenus(): Promise<MenuNode[]> {
  const backendMenus = await fetchApi<MenuNode[]>("/menus");
  const accessible = filterAccessibleMenus(backendMenus);

  return [CONSOLE_MENU_NODE, ...accessible];
}

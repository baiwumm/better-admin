import type { MenuNode } from "@/lib/api-types";

import { fetchApi } from "@/lib/api-client";

/**
 * 固定「控制台」菜单节点：写死、不受后端菜单接口控制、登录即可访问。
 * 始终位于菜单树最前（见 fetchMenus 合并逻辑），to 指向首页 "/"。
 */
export const CONSOLE_MENU_NODE: MenuNode = {
  id: "console",
  label: "控制台",
  // 渲染层优先按 i18nKey 取词（menu.pageTitle.*），label 仅作无翻译时的回退
  i18nKey: "menu.pageTitle.console",
  icon: "layout-dashboard",
  to: "/",
  sort: 0,
  keepAlive: false,
  hideInMenu: false,
  enabled: true,
  defaultOpen: false,
  // 全 1 掩码：任何登录用户都可见（前端兜底，不依赖后端下发）
  permissions: "9223372036854775807",
  userPermissions: "9223372036854775807",
};

/**
 * 拉取「当前用户可见」的菜单树（权限过滤后）：
 * 后端 GET /api/menus 已按用户角色关联完成权限过滤与祖先链补全，
 * 前端无需 filterAccessibleMenus 二次过滤——分组节点（如「系统管理」）
 * 的 userPermissions 为 "0"（自身不声明权限位），二次过滤会将其误杀，
 * 导致整个菜单分支消失。前端仅做 hideInMenu 过滤（侧边栏渲染时）。
 */
export async function fetchMenus(): Promise<MenuNode[]> {
  const backendMenus = await fetchApi<MenuNode[]>("/menus");

  return [CONSOLE_MENU_NODE, ...backendMenus];
}

import { type MenuNode } from "@/lib/api-types";
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
 * 拉取「当前用户可见」的菜单树：后端 GET /api/menus 已按 role_menus
 * 完成权限过滤与祖先链补全（分组节点 userPermissions="0"，**禁止**再在
 * 前端做 filterAccessibleMenus 二次过滤——会把分组节点整组误杀，
 * 该缺陷曾于 2026-09-05 修复，见 docs/progress.md），前端只合并固定
 * 「控制台」节点到最前。作为 useMenus 与登录后 prefetch 的共用 queryFn。
 */
export async function fetchMenus(): Promise<MenuNode[]> {
  const backendMenus = await fetchApi<MenuNode[]>("/menus");

  return [CONSOLE_MENU_NODE, ...backendMenus];
}

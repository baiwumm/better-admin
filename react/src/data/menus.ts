import { type MenuNode } from "@/lib/api-types";
import { ROUTE_PATHS } from "@/lib/route-paths";

/**
 * 本地 Mock 菜单树（结构与后端 GET /menus 的 MenuNode 一致，便于后续无缝切换）：
 * 仪表盘 + 系统设置（用户 / 角色 / 权限 / 菜单 / 字典 / 日志）。
 *
 * 权限演示：将某个节点的 `userPermissions` 置为 "0"（且 enabled 为 true），
 * 该菜单即对当前用户隐藏，直接访问其路径会被菜单路由守卫重定向到 /403。
 */
export const mockMenus: MenuNode[] = [
  {
    id: "dashboard",
    label: "仪表盘",
    icon: "layout-dashboard",
    to: ROUTE_PATHS.dashboard,
    sort: 1,
    hideInMenu: false,
    enabled: true,
    defaultOpen: false,
    keepAlive: false,
    target: "_self",
    permissions: "9223372036854775807",
    userPermissions: "9223372036854775807",
  },
  {
    // 隐藏页：不在侧边栏展示，入口在用户头像下拉菜单（见 sidebar-user.tsx）
    id: "account",
    label: "账户",
    icon: "id-card",
    to: ROUTE_PATHS.account,
    sort: 3,
    hideInMenu: true,
    enabled: true,
    defaultOpen: false,
    keepAlive: false,
    target: "_self",
    permissions: "9223372036854775807",
    userPermissions: "9223372036854775807",
  },
  {
    id: "system",
    label: "系统设置",
    icon: "settings",
    sort: 2,
    hideInMenu: false,
    enabled: true,
    defaultOpen: false,
    keepAlive: false,
    target: "_self",
    permissions: "9223372036854775807",
    userPermissions: "9223372036854775807",
    children: [
      {
        id: "users",
        label: "用户管理",
        icon: "users",
        to: ROUTE_PATHS.settingsUsers,
        parentId: "system",
        sort: 1,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
        keepAlive: false,
        target: "_self",
        permissions: "9223372036854775807",
        userPermissions: "9223372036854775807",
      },
      {
        id: "roles",
        label: "角色管理",
        icon: "shield-check",
        to: ROUTE_PATHS.settingsRoles,
        parentId: "system",
        sort: 2,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
        keepAlive: false,
        target: "_self",
        permissions: "9223372036854775807",
        userPermissions: "9223372036854775807",
      },
      {
        id: "permissions",
        label: "权限管理",
        icon: "key-round",
        to: ROUTE_PATHS.settingsPermissions,
        parentId: "system",
        sort: 3,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
        keepAlive: false,
        target: "_self",
        permissions: "9223372036854775807",
        userPermissions: "9223372036854775807",
      },
      {
        id: "menus",
        label: "菜单管理",
        icon: "menu",
        to: ROUTE_PATHS.settingsMenus,
        parentId: "system",
        sort: 4,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
        keepAlive: false,
        target: "_self",
        permissions: "9223372036854775807",
        userPermissions: "9223372036854775807",
      },
      {
        id: "dicts",
        label: "字典管理",
        icon: "book-text",
        to: ROUTE_PATHS.settingsDicts,
        parentId: "system",
        sort: 5,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
        keepAlive: false,
        target: "_self",
        permissions: "9223372036854775807",
        userPermissions: "9223372036854775807",
      },
      {
        id: "logs",
        label: "日志管理",
        icon: "scroll-text",
        to: ROUTE_PATHS.settingsLogs,
        parentId: "system",
        sort: 6,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
        keepAlive: false,
        target: "_self",
        permissions: "9223372036854775807",
        userPermissions: "9223372036854775807",
      },
    ],
  },
];

/** 扁平化所有叶子菜单项（用于路由匹配 / 当前项高亮）。 */
export function flattenLeafMenus(nodes: MenuNode[]): MenuNode[] {
  return nodes.flatMap((node) =>
    node.children?.length ? flattenLeafMenus(node.children) : [node],
  );
}

/**
 * 返回从根到「当前路径匹配叶子」的整条节点 id 链（含叶子自身），
 * 用于多级菜单自动展开全部祖先分组。未匹配返回空数组。
 */
export function findActivePath(nodes: MenuNode[], pathname: string): string[] {
  for (const node of nodes) {
    if (node.to && node.to === pathname) return [node.id];
    if (node.children?.length) {
      const childPath = findActivePath(node.children, pathname);

      if (childPath.length > 0) return [node.id, ...childPath];
    }
  }

  return [];
}

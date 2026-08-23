import { type MenuNode } from "@/lib/api-types";
import { ROUTE_PATHS } from "@/lib/route-paths";

/**
 * 本地 Mock 菜单树（结构与后端 GET /menus 的 MenuNode 一致，便于后续无缝切换）：
 * 概览 / 多级菜单 / 系统管理 / 系统设置，一级为分组、二级为叶子页面。
 *
 * 权限演示：将某个节点的 `userPermissions` 置为 "0"（且 enabled 为 true），
 * 该菜单即对当前用户隐藏，直接访问其路径会被菜单路由守卫重定向到 /401。
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
    id: "first-menu",
    label: "多级菜单",
    icon: "menu",
    sort: 1,
    hideInMenu: false,
    enabled: true,
    defaultOpen: true,
    keepAlive: false,
    target: "_self",
    permissions: "9223372036854775807",
    userPermissions: "9223372036854775807",
    children: [
      {
        id: "second-menu",
        label: "二级菜单",
        icon: "menu",
        sort: 1,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
        keepAlive: false,
        target: "_self",
        permissions: "9223372036854775807",
        userPermissions: "9223372036854775807",
        children: [
          {
            id: "third-menu",
            label: "三级菜单",
            icon: "menu",
            to: "/multi-level",
            sort: 1,
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
    ],
  },
  {
    id: "system",
    label: "系统管理",
    icon: "settings-2",
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
        to: ROUTE_PATHS.users,
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
        to: ROUTE_PATHS.roles,
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
        to: ROUTE_PATHS.permissions,
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
        to: ROUTE_PATHS.menus,
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
        id: "logs",
        label: "日志管理",
        icon: "scroll-text",
        to: ROUTE_PATHS.logs,
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
    ],
  },
  {
    id: "settings",
    label: "系统设置",
    icon: "settings",
    sort: 3,
    hideInMenu: false,
    enabled: true,
    defaultOpen: false,
    keepAlive: false,
    target: "_self",
    permissions: "9223372036854775807",
    userPermissions: "9223372036854775807",
    children: [
      {
        id: "profile",
        label: "个人资料",
        icon: "user-cog",
        to: ROUTE_PATHS.settingsProfile,
        parentId: "settings",
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
        id: "account",
        label: "账户",
        icon: "wrench",
        to: ROUTE_PATHS.settingsAccount,
        parentId: "settings",
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
        id: "appearance",
        label: "外观",
        icon: "palette",
        to: ROUTE_PATHS.settingsAppearance,
        parentId: "settings",
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
        id: "notifications",
        label: "通知",
        icon: "bell",
        to: ROUTE_PATHS.settingsNotifications,
        parentId: "settings",
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
        id: "display",
        label: "显示",
        icon: "monitor",
        to: ROUTE_PATHS.settingsDisplay,
        parentId: "settings",
        sort: 5,
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

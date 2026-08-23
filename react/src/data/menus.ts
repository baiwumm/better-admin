import { type IconName } from "lucide-react/dynamic";

/**
 * 菜单节点（对齐后端 GET /menus 的 MenuNode 结构，见 react-shadcn 迁移源
 * src/lib/api-types.ts；当前为本地 mock，字段与后端保持一致便于后续无缝切换）。
 */
export interface MenuNode {
  id: string;
  label: string;
  icon: IconName;
  to?: string | null;
  parentId?: string | null;
  sort: number;
  hideInMenu: boolean;
  enabled: boolean;
  defaultOpen: boolean;
  children?: MenuNode[];
}

/**
 * 本地 mock 菜单树（中文菜单与 Better Admin react-shadcn 版本保持一致）：
 * 概览 / 系统管理 / 系统设置，一级为分组、二级为叶子页面。
 */
export const mockMenus: MenuNode[] = [
  {
    id: "dashboard",
    label: "仪表盘",
    icon: "layout-dashboard",
    to: "/",
    sort: 1,
    hideInMenu: false,
    enabled: true,
    defaultOpen: false,
  },
  {
    id: "first-menu",
    label: "多级菜单",
    icon: "menu",
    sort: 1,
    hideInMenu: false,
    enabled: true,
    defaultOpen: true,
    children: [
      {
        id: "second-menu",
        label: "二级菜单",
        icon: "menu",
        sort: 1,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
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
    children: [
      {
        id: "users",
        label: "用户管理",
        icon: "users",
        to: "/users",
        parentId: "system",
        sort: 1,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
      },
      {
        id: "roles",
        label: "角色管理",
        icon: "shield-check",
        to: "/roles",
        parentId: "system",
        sort: 2,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
      },
      {
        id: "permissions",
        label: "权限管理",
        icon: "key-round",
        to: "/permissions",
        parentId: "system",
        sort: 3,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
      },
      {
        id: "menus",
        label: "菜单管理",
        icon: "menu",
        to: "/menus",
        parentId: "system",
        sort: 4,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
      },
      {
        id: "logs",
        label: "日志管理",
        icon: "scroll-text",
        to: "/logs",
        parentId: "system",
        sort: 5,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
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
    children: [
      {
        id: "profile",
        label: "个人资料",
        icon: "user-cog",
        to: "/settings/profile",
        parentId: "settings",
        sort: 1,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
      },
      {
        id: "account",
        label: "账户",
        icon: "wrench",
        to: "/settings/account",
        parentId: "settings",
        sort: 2,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
      },
      {
        id: "appearance",
        label: "外观",
        icon: "palette",
        to: "/settings/appearance",
        parentId: "settings",
        sort: 3,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
      },
      {
        id: "notifications",
        label: "通知",
        icon: "bell",
        to: "/settings/notifications",
        parentId: "settings",
        sort: 4,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
      },
      {
        id: "display",
        label: "显示",
        icon: "monitor",
        to: "/settings/display",
        parentId: "settings",
        sort: 5,
        hideInMenu: false,
        enabled: true,
        defaultOpen: false,
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

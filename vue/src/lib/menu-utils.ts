import type { MenuNode } from "@/lib/api-types";

/**
 * 菜单树工具（纯函数）：与 React 端 lib/menu-utils.ts 同构平移。
 */

/** 展平菜单树为叶子节点列表（路由守卫与「当前菜单权限位」判定用）。 */
export function flattenLeafMenus(nodes: MenuNode[]): MenuNode[] {
  const leaves: MenuNode[] = [];

  const walk = (list: MenuNode[]) => {
    for (const node of list) {
      if (node.children?.length) {
        walk(node.children);
      } else {
        leaves.push(node);
      }
    }
  };

  walk(nodes);

  return leaves;
}

/** 收集菜单树全部可达路径（公告详情页判断「返回列表」入口可达性用）。 */
export function collectMenuPaths(
  nodes: MenuNode[],
  acc: Set<string> = new Set(),
): Set<string> {
  for (const node of nodes) {
    if (node.to) acc.add(node.to);
    if (node.children?.length) collectMenuPaths(node.children, acc);
  }

  return acc;
}

/**
 * 递归查找当前路径对应的叶子节点及祖先链（侧边栏高亮展开用；
 * Nuxt UI UNavigationMenu 按 to 自动 active，此函数供需要显式路径链的场景）。
 */
export function findActivePath(
  nodes: MenuNode[],
  pathname: string,
): MenuNode[] {
  for (const node of nodes) {
    if (node.to === pathname) return [node];

    if (node.children?.length) {
      const childPath = findActivePath(node.children, pathname);

      if (childPath.length) return [node, ...childPath];
    }
  }

  return [];
}

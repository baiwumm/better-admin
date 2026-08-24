import { type MenuNode } from "@/lib/api-types";

/**
 * 菜单工具函数集合（不再包含 Mock 数据）。
 * Mock 菜单树已移除：菜单数据统一来自后端 GET /api/menus（见 hooks/use-menus.ts），
 * 前端仅做权限过滤与路由匹配。
 */

/** 扁平化所有叶子菜单项（用于路由匹配 / 当前项高亮）。 */
export function flattenLeafMenus(nodes: MenuNode[]): MenuNode[] {
  return nodes.flatMap((node) =>
    node.children?.length ? flattenLeafMenus(node.children) : [node],
  );
}

/**
 * 收集菜单树中所有可达路径（每个节点的 to，过滤空值）。
 * 供路由守卫判断「当前路径是否在用户可见菜单内」。
 */
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

/** 返回从根到「当前路径匹配叶子」的整条节点 id 链（含叶子自身），
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

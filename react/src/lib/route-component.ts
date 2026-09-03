import type { ComponentType } from "react";

import { routeTree } from "@/routeTree.gen";

/**
 * 路由组件动态解析：按完整路径从 routeTree（TanStack Router 生成物，
 * 公开导出）中查找对应叶子路由的页面组件。
 *
 * 用途：KeepAliveOutlet 的统一实例池需要渲染「非当前匹配」的路由组件
 * （过渡动画期间保持旧页画面 / keepAlive 页保活），而 `<Outlet/>` 只能
 * 渲染当前匹配，因此必须自行按路径取组件。
 *
 * 匹配规则（只认叶子）：
 * - fullPath 与目标路径精确相等；
 * - 无 children（布局路由如 /_authenticated 虽有 component 但带 children，
 *   必须跳过，避免把 AdminLayout 当成页面组件）。
 *
 * 结果做模块级缓存（同一路径的树遍历只发生一次）。
 */

type RouteNode = {
  fullPath?: string;
  children?: readonly unknown[];
  options?: { component?: ComponentType };
};

const componentCache = new Map<string, ComponentType | undefined>();

/**
 * 路由模板段级匹配：$xxx 动态段通配任意非空段，其余段精确相等。
 * 用于把具体 URL（/org/notices/123）匹配到 routeTree 模板
 * （/org/notices/$noticeId），供组件解析与标题兜底查询。
 */
export function matchRoutePattern(pattern: string, pathname: string): boolean {
  const patternSegments = pattern.split("/");
  const pathSegments = pathname.split("/");

  if (patternSegments.length !== pathSegments.length) return false;

  return patternSegments.every(
    (segment, index) =>
      segment.startsWith("$") || segment === pathSegments[index],
  );
}

function findLeafComponent(
  node: RouteNode,
  fullPath: string,
): ComponentType | undefined {
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const found = findLeafComponent(child as RouteNode, fullPath);

      if (found) return found;
    }

    return undefined;
  }

  if (node.fullPath && matchRoutePattern(node.fullPath, fullPath)) {
    return node.options?.component;
  }

  return undefined;
}

/** 按完整路径解析叶子路由组件（未命中返回 undefined）。 */
export function findRouteLeafComponent(
  fullPath: string,
): ComponentType | undefined {
  const cached = componentCache.get(fullPath);

  if (cached !== undefined) return cached;

  const found = findLeafComponent(routeTree as unknown as RouteNode, fullPath);

  componentCache.set(fullPath, found);

  return found;
}

import type { MenuNode } from "@/lib/api-types";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Outlet, useLocation } from "@tanstack/react-router";

import { collectKeepAlivePaths } from "@/lib/menu-utils";

/** 滚动位置缓存（模块级）：pathname -> scrollTop。
 * 模块级便于登出 / 权限变更时从任意位置调用 clearKeepAliveCache() 统一清理。 */
const keepAliveScrollCache = new Map<string, number>();

/** 清空全部 keepAlive 路由缓存（登出 / 会话失效 / 菜单权限变更后调用）。 */
export function clearKeepAliveCache(): void {
  keepAliveScrollCache.clear();
}

/**
 * 路由缓存（keepAlive）出口：替代裸 `<Outlet/>` 放在 AdminLayout 主体区。
 *
 * 基于菜单数据的 `keepAlive` 字段做「数据级路由缓存」适配：
 *
 * 1. **滚动位置保活**：命中 keepAlive 的路径，切换离开后回访自动恢复该页
 *    滚动位置（本项目滚动容器是 `<main>` 自定义 scroll 容器，不启用 TanStack
 *    全局 window 滚动恢复，这里显式维护）。
 * 2. **查询数据缓存**：keepAlive 路由的页面数据由 React Query 内置缓存
 *    （fetchMenus 等 query 已有 staleTime / gcTime），回访不重复请求；
 *    本组件不增加额外请求逻辑。
 * 3. **非 keepAlive 页面**：行为与裸 Outlet 一致（切换即重置滚动到顶部，
 *    数据按 query 自身缓存策略）。
 * 4. **生命周期**：菜单权限变更后，自动清理已不属于 keepAlive 集合的滚动记录。
 *
 * 说明：TanStack Router 的 `<Outlet/>` 始终渲染当前激活路由；React 组件实例的
 * state 无法真正跨路由切换永久保留（React 卸载即丢，属框架语义而非缺陷），
 * 因此 keepAlive 在本实现中保活的是「数据 + 滚动位置的跨页会话状态」。
 */
export function KeepAliveOutlet({
  menuTree,
}: {
  /** 当前用户可见菜单树（权限过滤后），用于取 keepAlive 路径集合。 */
  menuTree: MenuNode[] | undefined;
}) {
  const { pathname } = useLocation();

  // keepAlive 路径集合：由菜单数据派生，仅在菜单变化时重建。
  const keepAlivePaths = useMemo(
    () => (menuTree ? collectKeepAlivePaths(menuTree) : new Set<string>()),
    [menuTree],
  );

  // 上一次渲染的 path（用于离开时记录旧页滚动）。
  const prevPathRef = useRef(pathname);

  // 滚动恢复用 useLayoutEffect（同步于 commit、早于绘制与 VT 新帧捕获），
  // 避免过渡动画帧显示错误滚动位置。
  useLayoutEffect(() => {
    const main = document.querySelector<HTMLElement>("main");

    // 进入新页：
    // - keepAlive 页且有过滚动记录 → 恢复；否则回到顶部。
    // - 非 keepAlive 页 → 始终回到顶部（与裸 Outlet 语义一致）。
    if (main) {
      if (keepAlivePaths.has(pathname)) {
        main.scrollTop = keepAliveScrollCache.get(pathname) ?? 0;
      } else {
        main.scrollTop = 0;
      }
    }

    return () => {
      // 离开旧页：若旧页是 keepAlive，记录其滚动位置。
      if (keepAlivePaths.has(prevPathRef.current)) {
        const target = document.querySelector<HTMLElement>("main");

        if (target) {
          keepAliveScrollCache.set(prevPathRef.current, target.scrollTop);
        }
      }
    };
  }, [pathname, keepAlivePaths]);

  // 记录本次 path，供下一次 useLayoutEffect cleanup 使用（同步执行，保证时序）。
  useLayoutEffect(() => {
    prevPathRef.current = pathname;
  }, [pathname]);

  // 菜单（keepAlive 集合）变化后，清理已不属于 keepAlive 的滚动记录。
  useLayoutEffect(() => {
    for (const key of [...keepAliveScrollCache.keys()]) {
      if (!keepAlivePaths.has(key)) keepAliveScrollCache.delete(key);
    }
  }, [keepAlivePaths]);

  return (
    <div className="h-full min-h-0">
      <Outlet />
    </div>
  );
}

import {
  Activity,
  Suspense,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { useLocation } from "@tanstack/react-router";

import { KEEPALIVE_COMPONENTS } from "./keepalive-registry";

import { useMenus } from "@/hooks/use-menus";
import { type MenuNode } from "@/lib/api-types";
import {
  commitNavigation,
  registerDisplayed,
  type PoolEntry,
} from "@/lib/keepalive-pool";
import { collectKeepAlivePaths, findActivePath } from "@/lib/menu-utils";
import { findRouteLeafComponent } from "@/lib/route-component";
import { useDesignThemeStore } from "@/stores/design-theme-store";

/**
 * 单个池面板：某条路由的常驻宿主。
 *
 * <Activity> hidden 期间本面板与页面组件的 effects 被 React 卸载
 * （定时器/订阅/请求暂停），恢复 visible 时重建——数据请求因此天然
 * 延迟到页面真正可见后才发起；React Query 订阅随之暂停/恢复，hidden
 * 期间不产生请求，恢复时数据已 stale 则自动 refetch（保活 ≠ 数据冻结）。
 *
 * 面板不做独立滚动容器（滚动统一由 AdminLayout 的 <main> 承担，
 * 页面位置不参与保活，切换后统一回顶部）。
 */
function KeepAlivePane({ path }: { path: string }) {
  // 组件来源两级：注册表（手动覆盖入口）→ routeTree 动态解析（全量兜底）。
  const PageComponent: ComponentType | undefined =
    KEEPALIVE_COMPONENTS[path] ?? findRouteLeafComponent(path);

  if (!PageComponent) {
    // 未找到组件（理论上不会发生）：渲染空占位，不抛错。
    return null;
  }

  return (
    <>
      {/* Suspense 兜底：将来引入 React.lazy 页面组件时自动可用 */}
      <Suspense fallback={null}>
        <PageComponent />
      </Suspense>
    </>
  );
}

/** 菜单树中的层级深度（白名单等树外路径为 0），用于导航方向判定。 */
function menuDepthOf(path: string, menuTree: MenuNode[] | undefined): number {
  return menuTree ? findActivePath(menuTree, path).length : 0;
}

/**
 * 路由呈现管理器：替代裸 `<Outlet/>` 放在 AdminLayout 主体区，
 * 同时承担 **组件状态保活** 与 **路由过渡动画** 两项职责。
 *
 * == 保活 ==
 * 基于 React 官方 `<Activity>`（19.2 stable）：hidden 保留组件 state 与
 * DOM 结构、自动卸载 effects；visible 恢复。菜单 `keepAlive: true` 的
 * 页面永久驻留实例池（切走再回来 state 原样还原）；其余页面临时驻留
 * （仅为过渡期旧帧服务，切换完成后移除卸载，语义等同普通路由切换）。
 * 是否保活完全由菜单数据驱动，无需手工登记。池管理逻辑见
 * `lib/keepalive-pool.ts`（纯函数，含单测）。
 *
 * == 过渡 ==
 * 自管呈现路径（displayedPath），彻底修复旧 RouteTransition 双缓冲被
 * store 订阅击穿的问题：
 * - pathname ≠ displayedPath（pending）：渲染期**显式**输出 displayedPath
 *   的结构（不依赖元素引用 bailout——那会被子树自身的 location 订阅
 *   击穿，导致 DOM 提前切页、VT 旧快照拍到新页），DOM 保持旧页；
 * - layout effect 中 `startViewTransition`（此时捕获到真实旧帧）→
 *   回调内 flushSync 同步完成「清理临时池成员 + 切换 displayedPath」；
 * - 新帧快照后播放 CSS 预设动画（styles/route-transitions.css，
 *   html[data-route-transition] 选择器机制不变）；
 * - 导航方向感知：按新旧路径在菜单树中的层级深度判定前进/后退，
 *   写入 html[data-rt-direction]（"back" 时 CSS 反转位移类动画方向）。
 *
 * == 滚动 ==
 * 统一由 AdminLayout 的 <main> 滚动（滚动条贴合主体区边缘）；页面位置
 * 不做保活——每次切换完成后显式回到顶部。
 *
 * == 异常态（loading / 菜单校验失败 / 403）==
 * AdminLayout 以 overlay prop 传入异常内容：实例池保持挂载（全部转
 * hidden 保活状态），overlay 渲染于其上——异常恢复后原页面状态无损，
 * 不再像旧实现那样整树卸载销毁保活。
 *
 * 其它行为：
 * - 快速连续导航：新 VT 会 skip 未完成的旧 VT（ready 的 AbortError 已
 *   捕获忽略），apply 幂等直达最新 pathname；
 * - 登出 / 会话失效跳登录页 → _authenticated 整树卸载 → 池随组件树销毁；
 * - 已知边界：隐藏实例仍订阅 Router Context（不可见的轻量重渲染）；
 *   页面 UI 态建议放 store 而非 search params。
 */
export function KeepAliveOutlet({ overlay }: { overlay?: ReactNode }) {
  const { pathname } = useLocation();
  const { data: menuTree } = useMenus();
  const routeTransition = useDesignThemeStore((s) => s.routeTransition);
  const animate = routeTransition !== "none";

  // keepAlive 路径集合：由菜单数据派生，仅在菜单变化时重建。
  const keepAlivePaths = useMemo(
    () => (menuTree ? collectKeepAlivePaths(menuTree) : new Set<string>()),
    [menuTree],
  );

  // 最新值经 ref 供过渡回调读取（避免进入 effect deps 造成重跑抖动）。
  const keepAlivePathsRef = useRef(keepAlivePaths);
  const menuTreeRef = useRef(menuTree);

  keepAlivePathsRef.current = keepAlivePaths;
  menuTreeRef.current = menuTree;

  // 实际呈现的路由（与 pathname 分离：pending 期间二者不同）。
  const [displayedPath, setDisplayedPath] = useState(pathname);

  // 统一实例池（插入序稳定，不做重排——顺序变化会导致隐藏实例 DOM 移动，
  // 可能丢失元素内部状态）。
  const [pool, setPool] = useState<PoolEntry[]>([]);

  // 渲染期登记呈现路径 + 容量治理（纯函数，无变更返回原引用跳过更新）。
  const nextPool = registerDisplayed(
    pool,
    displayedPath,
    pathname,
    keepAlivePaths,
  );

  if (nextPool !== pool) setPool(nextPool);

  // 过渡编排：pathname 变化 → 冻结旧页 → VT（真旧帧）→ flushSync 切换。
  useLayoutEffect(() => {
    if (displayedPath === pathname) return;

    const apply = () => {
      flushSync(() => {
        // 清理临时成员并确保目标页在池（permanent 判定读最新菜单数据）。
        setPool((prev) =>
          commitNavigation(prev, pathname, keepAlivePathsRef.current),
        );
        setDisplayedPath(pathname);
      });

      // 切换完成、新帧快照捕获前：滚动回顶部（页面位置不做保活，
      // 见产品约定；flushSync 已提交 DOM，此处重置对 VT 新帧即时生效）。
      const main = document.querySelector<HTMLElement>("main");

      if (main) main.scrollTop = 0;
    };

    // 导航方向：目标深度更浅视为后退（供 CSS 反转位移类动画方向）。
    const prevDepth = menuDepthOf(displayedPath, menuTreeRef.current);
    const nextDepth = menuDepthOf(pathname, menuTreeRef.current);

    if (nextDepth < prevDepth) {
      document.documentElement.setAttribute("data-rt-direction", "back");
    } else {
      document.documentElement.removeAttribute("data-rt-direction");
    }

    const canVt =
      animate &&
      typeof document !== "undefined" &&
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (canVt) {
      const transition = document.startViewTransition(apply);

      // 快速连续导航时旧过渡被浏览器 skip，ready 以 AbortError reject——吞掉。
      transition.ready.catch(() => {});
    } else {
      apply();
    }
  }, [animate, displayedPath, pathname]);

  // 池常驻渲染：当前呈现项 visible，其余 hidden 保活（hidden 项
  // display:none 不占布局；可见项以自然高度撑开统一的 <main> 滚动区）。
  // overlay 存在时全部转 hidden、仅渲染 overlay——异常态不销毁保活。
  const showingOverlay = overlay != null;

  return (
    <>
      {pool.map(({ path }) => {
        const active = !showingOverlay && path === displayedPath;

        return (
          <Activity key={path} mode={active ? "visible" : "hidden"}>
            <KeepAlivePane path={path} />
          </Activity>
        );
      })}

      {showingOverlay && <>{overlay}</>}
    </>
  );
}

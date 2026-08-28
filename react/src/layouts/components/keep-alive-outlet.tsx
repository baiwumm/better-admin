import {
  Activity,
  Suspense,
  useEffect,
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
  reconcileWithTabs,
  registerDisplayed,
  type PoolEntry,
} from "@/lib/keepalive-pool";
import { collectKeepAlivePaths, findActivePath } from "@/lib/menu-utils";
import { findRouteLeafComponent } from "@/lib/route-component";
import { useDesignThemeStore } from "@/stores/design-theme-store";
import { useTabsStore } from "@/stores/tabs-store";

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

/** 主体滚动区回顶（页面位置不做保活，见产品约定；导航与刷新共用）。 */
function resetMainScroll() {
  const main = document.querySelector<HTMLElement>("main");

  if (main) main.scrollTop = 0;
}

/**
 * 启动带门控标记的路由 VT：VT 期间设置 html[data-route-vt]，结束后移除。
 *
 * HeroUI toast 每次增删也会启动**根级** ViewTransition（toast-queue 的
 * defaultWrapUpdate），而 html[data-route-transition] 是常驻属性——若不加
 * 门控，toast 的 VT 会命中 route-transitions.css 的 main-content/breadcrumbs
 * 动画选择器，把整套页面切换动画对着静止页面重放一遍（保存成功 toast 触发
 * 「页面重进了一次」即此根因；主题 VT 在 runViewTransition 里临时摘
 * data-route-transition 是同类规避先例）。标记仅由路由/刷新 VT 设置，
 * toast 等第三方 VT 不携带，动画选择器不生效。
 */
let routeVtSeq = 0;

function startRouteVt(update: () => void) {
  const root = document.documentElement;
  const seq = ++routeVtSeq;

  root.setAttribute("data-route-vt", "");

  const transition = document.startViewTransition(update);

  // 快速连续导航/刷新时旧过渡被浏览器 skip，ready 以 AbortError reject——吞掉；
  // finished 恒为 fulfill，标记延迟到结束后移除（仅最新一次负责移除，
  // 避免旧过渡收尾时摘掉正在播放中的新过渡的标记）。
  transition.ready.catch(() => {});
  transition.finished
    .finally(() => {
      if (seq === routeVtSeq) root.removeAttribute("data-route-vt");
    })
    .catch(() => {});

  return transition;
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
 *   html[data-route-transition] + startRouteVt 的 data-route-vt 门控）；
 * - 导航方向感知：按新旧路径在菜单树中的层级深度判定前进/后退，
 *   写入 html[data-rt-direction]（"back" 时 CSS 反转位移类动画方向）。
 *
 * == 刷新 ==
 * 标签右键「刷新」= 实例销毁重建（key 含刷新序号）。激活页的刷新复用
 * VT 编排：store 的刷新序号与已应用序号分离，序号差异在 layout effect
 * 检出后启动 VT、回调内 flushSync 落地——旧帧先被捕获，静态页也有
 * 「重切一遍」的动画反馈；非激活页 / 异常态 / 无 VT 立即提交（语义不变）。
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
  // 多标签页联动：已打开未关闭集合 + 刷新计数（key 重挂载实现「刷新」）。
  const openedPaths = useTabsStore((s) => s.paths);
  const refreshSeq = useTabsStore((s) => s.refreshSeq);

  // keepAlive 路径集合：由菜单数据派生，仅在菜单变化时重建。
  const keepAlivePaths = useMemo(
    () => (menuTree ? collectKeepAlivePaths(menuTree) : new Set<string>()),
    [menuTree],
  );

  // 已打开标签集合：仅在标签列表变化时重建。
  const openedTabs = useMemo(() => new Set(openedPaths), [openedPaths]);

  // 最新值经 ref 供过渡回调读取（避免进入 effect deps 造成重跑抖动）。
  const keepAlivePathsRef = useRef(keepAlivePaths);
  const menuTreeRef = useRef(menuTree);
  const openedTabsRef = useRef(openedTabs);

  keepAlivePathsRef.current = keepAlivePaths;
  menuTreeRef.current = menuTree;
  openedTabsRef.current = openedTabs;

  // 实际呈现的路由（与 pathname 分离：pending 期间二者不同）。
  const [displayedPath, setDisplayedPath] = useState(pathname);

  // 已应用的刷新序号（与 store 最新值分离）：激活页的刷新延迟到 VT 回调
  // 内提交，旧帧先被捕获，实例重挂载因此能重播切换动画；初始取 store
  // 快照，避免挂载时把已有序号回退成 0 造成多余重挂载。
  const [appliedRefreshSeq, setAppliedRefreshSeq] = useState<
    Record<string, number>
  >(() => useTabsStore.getState().refreshSeq);

  // 异常态 overlay：存在时全部池面板转 hidden、仅渲染 overlay——异常态
  // 不销毁保活；两个过渡 effect 依赖此值，需先于其声明。
  const showingOverlay = overlay != null;

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

    // 提交路由切换：清理临时池成员并确保目标页在池（permanent 判定读
    // 最新菜单/标签数据）。无 VT 时直接调用——useLayoutEffect 内的
    // setState 会在浏览器绘制前同步完成重渲染；flushSync 仅限 VT 回调内
    // 使用（浏览器异步调用回调，不在 React 生命周期内），在生命周期方法
    // 里同步调用会触发 "flushSync was called from inside a lifecycle
    // method" 警告。
    const commitChanges = () => {
      setPool((prev) =>
        commitNavigation(
          prev,
          pathname,
          keepAlivePathsRef.current,
          openedTabsRef.current,
        ),
      );
      setDisplayedPath(pathname);
    };

    const apply = () => {
      flushSync(commitChanges);
      // DOM 已提交，重置对 VT 新帧即时生效。
      resetMainScroll();
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
      startRouteVt(apply);
    } else {
      commitChanges();
      resetMainScroll();
    }
  }, [animate, displayedPath, pathname]);

  // 刷新编排：标签右键「刷新」= 实例销毁重建（key 含已应用序号）。激活页
  // 的刷新与导航共用 VT 编排——序号延迟到 VT 回调内提交，旧帧先被捕获，
  // 静态页也有「重切一遍」的动画反馈；非激活页 / 异常态 / 无 VT（含
  // reduced-motion）保持原行为立即提交（无动画但语义不变）。
  useLayoutEffect(() => {
    const pendingPaths = Object.keys(refreshSeq).filter(
      (path) => (refreshSeq[path] ?? 0) > (appliedRefreshSeq[path] ?? 0),
    );

    if (pendingPaths.length === 0) return;

    // 刷新即实例销毁重建：序号落地 + 滚动回顶（页面位置不做保活）。
    const commitRefresh = () => {
      setAppliedRefreshSeq(refreshSeq);
      resetMainScroll();
    };

    const canVt =
      animate &&
      typeof document !== "undefined" &&
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (
      canVt &&
      !showingOverlay &&
      displayedPath === pathname &&
      pendingPaths.includes(displayedPath)
    ) {
      // 刷新不是导航：清除上次导航遗留的方向标记，避免位移类动画反向播放。
      document.documentElement.removeAttribute("data-rt-direction");

      startRouteVt(() => {
        flushSync(commitRefresh);
      });
    } else {
      commitRefresh();
    }
  }, [
    animate,
    appliedRefreshSeq,
    displayedPath,
    pathname,
    refreshSeq,
    showingOverlay,
  ]);

  // 标签对账：关闭标签 → 清除对应保活实例；openPath 晚于渲染期登记时
  // 将已打开的 keepAlive transient 转正（幂等，无变更返回原引用）。
  useEffect(() => {
    setPool((prev) =>
      reconcileWithTabs(prev, openedTabs, displayedPath, keepAlivePaths),
    );
  }, [openedTabs, displayedPath, keepAlivePaths]);

  // 池常驻渲染：当前呈现项 visible，其余 hidden 保活（hidden 项
  // display:none 不占布局；可见项以自然高度撑开统一的 <main> 滚动区）。
  return (
    <>
      {pool.map(({ path }) => {
        const active = !showingOverlay && path === displayedPath;
        // key 含已应用刷新序号：VT 回调内提交序号递增后强制销毁重建实例
        // （「刷新」语义，激活页刷新时动画由刷新编排 effect 编排）。
        const poolKey = `${path}#${appliedRefreshSeq[path] ?? 0}`;

        return (
          <Activity key={poolKey} mode={active ? "visible" : "hidden"}>
            <KeepAlivePane path={path} />
          </Activity>
        );
      })}

      {showingOverlay && <>{overlay}</>}
    </>
  );
}

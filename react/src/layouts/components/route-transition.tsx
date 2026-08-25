import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

import { useDesignThemeStore } from "@/stores/design-theme-store";

/**
 * 路由过渡动画容器（双缓冲）。
 *
 * 挂在 AdminLayout 主体内容区（`<main>` 内、KeepAliveOutlet 外层），让「路由级切换」
 * 播放预设过渡动画（见 styles/route-transitions.css，作用于 main-content 快照组，
 * 不影响侧边栏/顶栏等布局）。
 *
 * 时序（确定、无 AbortError，不依赖 TanStack 内部实现）：
 * 1. 渲染期：path 相对「已呈现 path（displayPath）」变化时，本次渲染**保持输出旧内容**
 *   （ref 保存上一帧 children 引用 → React bailout，DOM 仍是旧页），不提前切页；
 * 2. useLayoutEffect（提交后、绘制前）：用 `startViewTransition(() => flushSync(提交新页))`
 *   —— 旧帧快照在 flushSync 之前（浏览器捕获旧页）→ 回调内 flushSync 强制提交新内容
 *   → 新帧快照 → CSS 播放动画。
 * 3. 动画关闭（none）或浏览器不支持 VT / 系统减弱动态效果 → 直接切换（无过渡）。
 *
 * 为什么不用 TanStack Router 的 defaultViewTransition：
 * 其内部 `document.startViewTransition` 在快速连续导航时会产生未捕获的
 * `AbortError: Transition was skipped`，导致未处理异常；自研双缓冲完全掌控时机与降级。
 */
export function RouteTransition({
  path,
  children,
}: {
  /** 当前路由 path（动画触发键；同一 path 下内容替换（loading/403 等）不触发动画）。 */
  path: string;
  children: ReactNode;
}) {
  const routeTransition = useDesignThemeStore((s) => s.routeTransition);
  const animate = routeTransition !== "none";

  // 已呈现给用户的 path；首次渲染与当前一致。
  const [displayPath, setDisplayPath] = useState(path);

  // 已呈现内容的引用（双缓冲：pending 期间保持渲染旧内容）。
  const shownRef = useRef<ReactNode>(children);

  // pending 路由（path 已变但尚未进入 DOM / 快照）。
  const pendingRef = useRef(path);

  // 提交钩子：渲染期 path != displayPath 时，layout effect 中执行 VT + flushSync。
  useLayoutEffect(() => {
    if (displayPath === path) return;

    const apply = () => {
      flushSync(() => setDisplayPath(pendingRef.current));
    };

    const canVT =
      animate &&
      typeof document !== "undefined" &&
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (canVT) {
      void document.startViewTransition(apply);
    } else {
      apply();
    }
  }, [animate, displayPath, path]);

  if (displayPath === path) {
    // 正常态：记录本次内容，供下次 pending 渲染期复用。
    shownRef.current = children;

    return <>{children}</>;
  }

  // 渲染期：path 已变化但尚未完成过渡——输出上一帧内容（引用不变 → bailout，
  // DOM 保持旧页，直到 layout effect 通过 VT + flushSync 提交新页）。
  pendingRef.current = path;

  return <>{shownRef.current}</>;
}

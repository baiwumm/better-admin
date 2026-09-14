/**
 * 路由 View Transition 门控工具（对齐 React 端 keep-alive-outlet 的 startRouteVt）。
 *
 * 路由切换与标签「刷新」的 VT 期间在 <html> 上设置 data-route-vt，结束后移除。
 * route-transitions.css 的动画选择器同时要求该标记与常驻的 data-route-transition：
 * 主题切换等其它根级 VT 不携带标记，不会把页面切换动画对着静止页面重放
 * （主题 VT 另在 runViewTransition 里临时摘 data-route-transition，双重规避）。
 */

type RouteViewTransition = ReturnType<Document["startViewTransition"]>;

let routeVtSeq = 0;

/** 浏览器支持 ViewTransition 且未开启系统「减弱动态效果」。 */
export function canRouteVt(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * 启动带门控标记的路由 VT。
 *
 * 快速连续导航 / 刷新时旧过渡被浏览器 skip，ready 以 AbortError reject——吞掉；
 * finished 恒为 fulfill，标记延迟到结束后移除（仅最新一次负责移除，避免旧过渡
 * 收尾时摘掉正在播放中的新过渡的标记）。
 *
 * @param update 快照回调：内部完成 DOM 变更并在变更提交后 resolve（返回 Promise 时
 *   浏览器会等待其结束再捕获新帧）
 */
export function startRouteVt(
  update: () => void | Promise<void>,
): RouteViewTransition {
  const root = document.documentElement;
  const seq = ++routeVtSeq;

  root.setAttribute("data-route-vt", "");

  const transition = document.startViewTransition(update);

  transition.ready.catch(() => {});
  transition.finished
    .finally(() => {
      if (seq === routeVtSeq) root.removeAttribute("data-route-vt");
    })
    .catch(() => {});

  return transition;
}

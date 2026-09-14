import { flushSync } from "react-dom";

/**
 * 主题切换动画方向
 *
 * 与 better-next 的 THEME_MODE_DIRECTION 语义一致：
 * 切换主题色 / 主题模式时，ViewTransition 的 clip-path 揭示方向。
 */

export type TransitionDirection = "ltr" | "rtl" | "ttb" | "btt";

export const TRANSITION_DIRECTIONS: TransitionDirection[] = [
  "ltr",
  "rtl",
  "ttb",
  "btt",
];

/** 根据方向返回 clip-path 起始裁切（to 恒为完全展开），供 CSS 变量消费。 */
function clipFrom(direction: TransitionDirection): string {
  switch (direction) {
    case "rtl":
      return "inset(0 0 0 100%)";
    case "ttb":
      return "inset(0 0 100% 0)";
    case "btt":
      return "inset(100% 0 0 0)";
    case "ltr":
    default:
      return "inset(0 100% 0 0)";
  }
}

/**
 * 执行 ViewTransition 动画（主题切换用）。
 *
 * 实现（声明式 CSS 驱动，见 styles/globals.css 的 data-theme-transition 区块）：
 * 1. 临时移除 data-route-transition，避免路由过渡预设的 main-content
 *    动画被主题 VT 误触发（必须在 startViewTransition 之前移除）；
 * 2. 设置 html[data-theme-transition="<direction>"] 激活 CSS 揭示动画——
 *    同时作用于 root 与 main-content 两组快照（main 拥有独立
 *    view-transition-name，若不纳入揭示会静止遮挡 root 组动画，
 *    表现为「页面内容盖住动画、结束后才恢复正常」）；
 * 3. mutate 以 flushSync 包裹：保证 React 提交收敛在 VT 回调内，
 *    new 快照捕获到的是新主题画面（异步调度会让提交漂移到快照之后，
 *    导致揭示的是旧画面 + 结束时内容突变的二次跳变）。
 *
 * @param mutate 在 transition 快照回调中同步执行的变更（含 React 状态更新）
 * @param direction 动画方向（决定 clip-path 揭示方向）
 * @returns Promise（VT 结束后 resolve；skip/abort 时同样正常收尾）
 */
/**
 * 执行 ViewTransition 动画（主题切换用）。
 *
 * 实现（声明式 CSS 驱动，见 styles/globals.css 的 data-theme-transition 区块）：
 * 1. 临时移除 data-route-transition，避免路由过渡预设的 main-content
 *    动画被主题 VT 误触发（必须在 startViewTransition 之前移除）；
 * 2. 设置 html[data-theme-transition="<direction>"] 激活 CSS 揭示动画——
 *    同时经 `html[data-theme-transition] [data-vt-name]` 规则临时摘掉各区域
 *    （admin-layout 的 main-content）的独立
 *    view-transition-name：带 name 的元素会被提升为独立快照组并叠放在 root 组
 *    之上，静止遮挡揭示动画；主题变化是全页级联，统一并入单组 root 揭示。
 *    摘名纯 CSS 属性驱动，随该属性的设置/移除原子生效，无 JS 时序竞态；
 * 3. mutate 以 flushSync 包裹：保证 React 提交收敛在 VT 回调内，
 *    new 快照捕获到的是新主题画面（异步调度会让提交漂移到快照之后，
 *    导致揭示的是旧画面 + 结束时内容突变的二次跳变）。
 *
 * @param mutate 在 transition 快照回调中同步执行的变更（含 React 状态更新）
 * @param direction 动画方向（决定 clip-path 揭示方向）
 * @returns Promise（VT 结束后 resolve；skip/abort 时同样正常收尾）
 */
export async function runViewTransition(
  mutate: () => void,
  direction: TransitionDirection,
): Promise<void> {
  // 不支持 ViewTransition 的浏览器（Firefox 旧版等）直接执行变更，无动画
  if (typeof document === "undefined" || !document.startViewTransition) {
    mutate();

    return;
  }

  const root = document.documentElement;

  const routeAttr = root.getAttribute("data-route-transition");

  if (routeAttr) {
    root.removeAttribute("data-route-transition");
  }

  root.setAttribute("data-theme-transition", direction);
  // clip-path 起始裁切经 CSS 变量下发（keyframes 内 var() 从应用元素解析）
  root.style.setProperty("--tt-from", clipFrom(direction));

  try {
    const transition = document.startViewTransition(() => {
      flushSync(mutate);
    });

    await transition.finished.catch(() => {});
  } finally {
    root.removeAttribute("data-theme-transition");
    root.style.removeProperty("--tt-from");

    // 还原路由过渡标记（覆盖 skip / abort 等提前退出的边界）
    if (
      routeAttr &&
      !document.documentElement.hasAttribute("data-route-transition")
    ) {
      document.documentElement.setAttribute("data-route-transition", routeAttr);
    }
  }
}

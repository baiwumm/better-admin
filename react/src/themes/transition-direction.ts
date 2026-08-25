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

/**
 * 根据方向返回 clip-path 关键帧 [from, to]。
 * from 为「旧快照被新快照覆盖」的起始裁切区域，to 为完全展开。
 *
 * 与 better-next getClipKeyframes 完全一致。
 */
export function getClipKeyframes(
  direction: TransitionDirection,
): [string, string] {
  switch (direction) {
    case "ltr":
      return ["inset(0 100% 0 0)", "inset(0 0 0 0)"];
    case "rtl":
      return ["inset(0 0 0 100%)", "inset(0 0 0 0)"];
    case "ttb":
      return ["inset(0 0 100% 0)", "inset(0 0 0 0)"];
    case "btt":
      return ["inset(100% 0 0 0)", "inset(0 0 0 0)"];
    default:
      return ["inset(0 100% 0 0)", "inset(0 0 0 0)"];
  }
}

/**
 * 执行 ViewTransition 动画（主题切换用）。
 *
 * @param mutate 在 transition 快照回调中同步执行的 DOM 变更
 * @param direction 动画方向（决定 clip-path 揭示方向）
 * @returns Promise（动画结束后 resolve）
 */
export async function runViewTransition(
  mutate: () => void,
  direction: TransitionDirection,
): Promise<void> {
  const [fromClip, toClip] = getClipKeyframes(direction);

  // 不支持 ViewTransition 的浏览器（Firefox 旧版等）直接执行变更，无动画
  if (typeof document === "undefined" || !document.startViewTransition) {
    mutate();

    return;
  }

  // 主题切换期间临时移除路由过渡标记（data-route-transition），
  // 避免 route-transitions.css 的 main-content 动画被主题 VT 误触发。
  // 必须在 startViewTransition 之前移除（否则旧帧快照捕获时属性仍在→CSS 命中）。
  const routeAttr = document.documentElement.getAttribute("data-route-transition");

  if (routeAttr) {
    document.documentElement.removeAttribute("data-route-transition");
  }

  try {
    const transition = document.startViewTransition(() => {
      mutate();
    });

    await transition.ready;

    // clip-path 动画结束后还原路由过渡标记（之前是 VT 动画期间）。
    // 用 finished 事件确保不干扰 VT 的 CSS 动画阶段。
    await document.documentElement
      .animate(
        { clipPath: [fromClip, toClip] },
        {
          duration: 700,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        },
      )
      .finished;
  } finally {
    // 确保标记已还原（覆盖 finally 与 finished 竞争的边界）
    if (routeAttr && !document.documentElement.hasAttribute("data-route-transition")) {
      document.documentElement.setAttribute("data-route-transition", routeAttr);
    }
  }
}

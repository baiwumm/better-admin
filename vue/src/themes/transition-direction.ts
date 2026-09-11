import { nextTick } from "vue";

/**
 * 主题切换动画方向
 *
 * 切换主题色 / 主题模式 / 色彩模式时，ViewTransition 的 clip-path 揭示方向。
 * 语义与 React 端 themes/transition-direction.ts 一致。
 */

export type TransitionDirection = "ltr" | "rtl" | "ttb" | "btt";

export const TRANSITION_DIRECTIONS: {
  id: TransitionDirection;
  /** 名称的 i18n key（layout.prefs.direction.<id>），渲染处经 t() 取词 */
  labelKey: string;
}[] = [
  { id: "ltr", labelKey: "layout.prefs.direction.ltr" },
  { id: "rtl", labelKey: "layout.prefs.direction.rtl" },
  { id: "ttb", labelKey: "layout.prefs.direction.ttb" },
  { id: "btt", labelKey: "layout.prefs.direction.btt" },
];

const DIRECTION_IDS: TransitionDirection[] = TRANSITION_DIRECTIONS.map(
  (d) => d.id,
);

/** 是否为合法的方向 id（兜底校验，失效值回退 ltr）。 */
export function isTransitionDirection(
  value: unknown,
): value is TransitionDirection {
  return (
    typeof value === "string" && (DIRECTION_IDS as string[]).includes(value)
  );
}

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
 * 执行 ViewTransition 揭示动画（主题切换用）。
 *
 * 实现（声明式 CSS 驱动，见 styles/theme-transition.css）：
 * 1. 临时移除 data-route-transition，避免路由过渡预设的 main-content 动画被
 *    主题 VT 误触发（必须在 startViewTransition 之前移除）；
 * 2. 设置 html[data-theme-transition="<direction>"] 激活 CSS 揭示动画，并经
 *    `html[data-theme-transition] .route-vt-main` 规则临时摘掉带独立
 *    view-transition-name 的区域（主体区 main-content），统一并入单组 root 揭示；
 * 3. 快照回调内先同步执行 mutate，再 `await nextTick()`：Vue 的响应式 DOM 更新
 *    （组件重渲染、@vueuse useColorMode 的 post-flush class 写入）是异步批处理的，
 *    VT 会等待回调返回的 Promise 结束后才捕获 new 快照——不等待会揭示旧画面、
 *    结束时内容再突变一次（对应 React 端 flushSync 收敛提交的语义）。
 *
 * @param mutate 在 transition 快照回调中同步执行的变更（含 store 状态更新与 DOM 写入）
 * @param direction 动画方向（决定 clip-path 揭示方向）
 * @returns Promise（VT 结束后 resolve；skip/abort 或不支持 VT 时同样正常收尾）
 */
export async function runViewTransition(
  mutate: () => void,
  direction: TransitionDirection,
): Promise<void> {
  // 不支持 ViewTransition 的浏览器直接执行变更，无动画
  if (typeof document === "undefined" || !document.startViewTransition) {
    mutate();
    await nextTick();

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
    const transition = document.startViewTransition(async () => {
      mutate();
      await nextTick();
    });

    await transition.finished.catch(() => {});
  } finally {
    root.removeAttribute("data-theme-transition");
    root.style.removeProperty("--tt-from");

    // 还原路由过渡标记（覆盖 skip / abort 等提前退出的边界）
    if (routeAttr && !root.hasAttribute("data-route-transition")) {
      root.setAttribute("data-route-transition", routeAttr);
    }
  }
}

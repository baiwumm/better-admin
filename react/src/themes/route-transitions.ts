/**
 * 路由过渡动画（页面切换）
 *
 * 与主题切换动画（transition-direction.ts）区分：
 * - 主题切换：ViewTransition 的 clip-path 揭示「方向」（已经存在，属于 design-theme-store）。
 * - 路由过渡：页面主体区切换时的预设动画（本次新增，属于本文件）。
 *
 * 每个预设对应一段 `::view-transition-old/new(root)` 关键帧动画，
 * 通过 `html[data-route-transition="<id>"]` 选择器启用（与 theme-color 的
 * `data-design-theme` DOM 约定同构），具体 CSS 见 styles/route-transitions.css。
 *
 * 该预设表（id / 中文名 / 交互行为）视为「导航偏好契约」，
 * 后续 Vue / Nuxt / Next.js 版本对其对齐一致。
 */

export type RouteTransitionId =
  | "none"
  | "fade"
  | "fade-up"
  | "fade-slide"
  | "zoom"
  | "flip";

export const ROUTE_TRANSITIONS: {
  id: RouteTransitionId;
  label: string;
}[] = [
  { id: "none", label: "无动画" },
  { id: "fade", label: "淡入淡出" },
  { id: "fade-up", label: "上滑淡入" },
  { id: "fade-slide", label: "右滑淡入" },
  { id: "zoom", label: "缩放淡入" },
  { id: "flip", label: "翻转" },
];

export const ROUTE_TRANSITION_IDS: RouteTransitionId[] = ROUTE_TRANSITIONS.map(
  (t) => t.id,
);

/** 是否为合法的路由过渡动画 id（兜底校验，失效值回退「无动画」）。 */
export function isRouteTransition(value: unknown): value is RouteTransitionId {
  return (
    typeof value === "string" &&
    (ROUTE_TRANSITION_IDS as string[]).includes(value)
  );
}

/** 过渡动画时长（毫秒）。新旧页面关键帧共用。 */
export const ROUTE_TRANSITION_DURATION_MS = 300;

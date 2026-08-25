/**
 * 路由过渡动画（页面切换）
 *
 * 与主题切换动画（transition-direction.ts）区分：
 * - 主题切换：ViewTransition 的 clip-path 揭示「方向」（已经存在，属于 design-theme-store）。
 * - 路由过渡：页面主体区切换时的预设动画（属于本文件）。
 *
 * 编排由 KeepAliveOutlet 完成（displayedPath 双缓冲 + VT + flushSync，
 * 见 layouts/components/keep-alive-outlet.tsx）；每个预设对应一段
 * `::view-transition-old/new(main-content)` 关键帧动画，通过
 * `html[data-route-transition="<id>"]` 选择器启用，
 * 具体 CSS 见 styles/route-transitions.css。
 *
 * 该预设表（id / 中文名 / 交互行为）视为「导航偏好契约」，
 * 后续 Vue / Nuxt / Next.js 版本对其对齐一致。
 */

export type RouteTransitionId =
  | "none"
  | "fade"
  | "glide"
  | "rise"
  | "zoom"
  | "reveal"
  | "cover"
  | "circle"
  | "blur";

export const ROUTE_TRANSITIONS: {
  id: RouteTransitionId;
  label: string;
}[] = [
  { id: "none", label: "无动画" },
  { id: "fade", label: "柔和淡化" },
  { id: "glide", label: "视差推滑" },
  { id: "rise", label: "浮现上升" },
  { id: "zoom", label: "纵深缩放" },
  { id: "reveal", label: "揭示展开" },
  { id: "cover", label: "覆盖推入" },
  { id: "circle", label: "圆形揭示" },
  { id: "blur", label: "景深聚焦" },
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

/** 过渡动画时长（毫秒）。标准速度下的基准值，实际时长 × 速度倍率。 */
export const ROUTE_TRANSITION_DURATION_MS = 340;

// ── 播放速度档位 ──

export type RouteTransitionSpeedId = "slow" | "normal" | "fast";

export const ROUTE_TRANSITION_SPEEDS: {
  id: RouteTransitionSpeedId;
  label: string;
}[] = [
  { id: "slow", label: "慢速" },
  { id: "normal", label: "标准" },
  { id: "fast", label: "快速" },
];

export const ROUTE_TRANSITION_SPEED_IDS: RouteTransitionSpeedId[] =
  ROUTE_TRANSITION_SPEEDS.map((s) => s.id);

/** 是否为合法的速度档位 id（兜底校验，失效值回退「标准」）。 */
export function isRouteTransitionSpeed(
  value: unknown,
): value is RouteTransitionSpeedId {
  return (
    typeof value === "string" &&
    (ROUTE_TRANSITION_SPEED_IDS as string[]).includes(value)
  );
}

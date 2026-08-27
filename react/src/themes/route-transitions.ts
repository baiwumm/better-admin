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
  /** 名称的 i18n key（layout.prefs.routeTransition.<id>），渲染处经 t() 取词 */
  labelKey: string;
}[] = [
  { id: "none", labelKey: "layout.prefs.routeTransition.none" },
  { id: "fade", labelKey: "layout.prefs.routeTransition.fade" },
  { id: "glide", labelKey: "layout.prefs.routeTransition.glide" },
  { id: "rise", labelKey: "layout.prefs.routeTransition.rise" },
  { id: "zoom", labelKey: "layout.prefs.routeTransition.zoom" },
  { id: "reveal", labelKey: "layout.prefs.routeTransition.reveal" },
  { id: "cover", labelKey: "layout.prefs.routeTransition.cover" },
  { id: "circle", labelKey: "layout.prefs.routeTransition.circle" },
  { id: "blur", labelKey: "layout.prefs.routeTransition.blur" },
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
  /** 名称的 i18n key（layout.prefs.speed.<id>），渲染处经 t() 取词 */
  labelKey: string;
}[] = [
  { id: "slow", labelKey: "layout.prefs.speed.slow" },
  { id: "normal", labelKey: "layout.prefs.speed.normal" },
  { id: "fast", labelKey: "layout.prefs.speed.fast" },
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

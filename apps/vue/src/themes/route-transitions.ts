/**
 * 路由过渡动画（页面切换）
 *
 * 与主题切换动画（transition-direction.ts）区分：
 * - 主题切换：ViewTransition 的 clip-path 揭示「方向」。
 * - 路由过渡：页面主体区切换时的预设动画（属于本文件）。
 *
 * 每个预设对应一段 `::view-transition-old/new(main-content)` 关键帧动画，
 * 通过 `html[data-route-transition="<id>"]` 选择器启用，具体 CSS 见
 * styles/route-transitions.css；编排由 AdminLayout 主体区的 KeepAlive 容器
 * 完成（对齐 React 端 KeepAliveOutlet 的编排位置）。
 *
 * 该预设表（id / 名称 / 交互行为）视为「导航偏好契约」，与 React / Next 端一致。
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
export const ROUTE_TRANSITION_DURATION_MS = 420;

/** 把路由过渡动画 id 应用到 <html> 的 data-route-transition 属性（none 移除）。 */
export function applyRouteTransitionToDOM(id: RouteTransitionId): void {
  const root = document.documentElement;

  if (id === "none") {
    root.removeAttribute("data-route-transition");
  } else {
    root.setAttribute("data-route-transition", id);
  }
}

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

/** 把路由过渡速度档位应用到 <html> 的 data-rt-speed 属性（normal 移除，供 CSS 倍率生效）。 */
export function applyRouteTransitionSpeedToDOM(
  speed: RouteTransitionSpeedId,
): void {
  const root = document.documentElement;

  if (speed === "normal") {
    root.removeAttribute("data-rt-speed");
  } else {
    root.setAttribute("data-rt-speed", speed);
  }
}

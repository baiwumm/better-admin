/**
 * 圆角（Border Radius）偏好（参考 better-nuxt `ThemePickerRadius.vue` 机制）
 *
 * Nuxt UI 的整条圆角刻度（--radius-xs … --radius-3xl）均由基准变量 `--ui-radius`
 * 派生（calc(var(--ui-radius) * N)），覆盖 <html> 上的基准变量即可全站整体缩放。
 *
 * 档位文案对齐 React 端（直角 / 小圆角 / 中圆角 / 大圆角），数值按 Nuxt UI 标度
 * 重定（Nuxt UI 默认 `--ui-radius: 0.25rem`；React/HeroUI 基准 `--radius` 为
 * 0.5rem，照搬其数值会整体偏大一倍）。中圆角为默认档：不写 DOM，沿用 Nuxt UI
 * 原始值。`rounded-full` 圆形件（头像 / Chip / Switch 手柄）不受档位影响。
 *
 * 该档位表（id / 名称）视为「外观偏好契约」，与 React / Next 端 id 一致。
 */

export type RadiusId = "none" | "small" | "medium" | "large";

export const RADII: {
  id: RadiusId;
  /** 名称的 i18n key（layout.prefs.radius.<id>），渲染处经 t() 取词 */
  labelKey: string;
  /** `--ui-radius` 取值（rem） */
  rem: number;
}[] = [
  { id: "none", labelKey: "layout.prefs.radius.none", rem: 0 },
  { id: "small", labelKey: "layout.prefs.radius.small", rem: 0.125 },
  { id: "medium", labelKey: "layout.prefs.radius.medium", rem: 0.25 },
  { id: "large", labelKey: "layout.prefs.radius.large", rem: 0.5 },
];

export const RADIUS_IDS: RadiusId[] = RADII.map((r) => r.id);

/** 默认档位：中圆角（Nuxt UI 原始值 0.25rem），不写 DOM 属性 */
export const DEFAULT_RADIUS_ID: RadiusId = "medium";

/** 是否为合法的圆角档位 id（兜底校验，失效值回退默认档）。 */
export function isRadiusId(value: unknown): value is RadiusId {
  return typeof value === "string" && (RADIUS_IDS as string[]).includes(value);
}

/** 把圆角档位应用到 <html>（覆盖 `--ui-radius`；默认档移除覆盖）。 */
export function applyRadiusToDOM(radius: RadiusId): void {
  const root = document.documentElement;

  if (radius === DEFAULT_RADIUS_ID) {
    root.style.removeProperty("--ui-radius");

    return;
  }

  const rem = RADII.find((r) => r.id === radius)?.rem ?? 0.25;

  root.style.setProperty("--ui-radius", `${rem}rem`);
}

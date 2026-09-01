/**
 * 圆角（Border Radius）偏好
 *
 * HeroUI v3 的整条圆角刻度（--radius-xs … --radius-4xl、--field-radius）
 * 均由基准变量 --radius 派生（calc(var(--radius) * N)），覆盖 html 上的
 * 基准变量即可全站整体缩放。各档位通过 `html[data-radius="<id>"]` 选择器
 * 覆盖 --radius / --field-radius，具体 CSS 见 styles/radius.css。
 *
 * 该档位表（id / 名称）视为「外观偏好契约」，
 * 后续 Vue / Nuxt / Next.js 版本对其对齐一致。
 */

export type RadiusId = "none" | "small" | "medium" | "large";

export const RADII: {
  id: RadiusId;
  /** 名称的 i18n key（layout.prefs.radius.<id>），渲染处经 t() 取词 */
  labelKey: string;
}[] = [
  { id: "none", labelKey: "layout.prefs.radius.none" },
  { id: "small", labelKey: "layout.prefs.radius.small" },
  { id: "medium", labelKey: "layout.prefs.radius.medium" },
  { id: "large", labelKey: "layout.prefs.radius.large" },
];

export const RADIUS_IDS: RadiusId[] = RADII.map((r) => r.id);

/** 默认档位：中圆角（HeroUI 主题原始值），不写 DOM 属性、不落存储 */
export const DEFAULT_RADIUS_ID: RadiusId = "medium";

/** 是否为合法的圆角档位 id（兜底校验，失效值回退默认档）。 */
export function isRadiusId(value: unknown): value is RadiusId {
  return typeof value === "string" && (RADIUS_IDS as string[]).includes(value);
}

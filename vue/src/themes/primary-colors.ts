import colors from "tailwindcss/colors";

/**
 * 主题色偏好（参考 better-nuxt `ThemePickerPrimaryColor.vue` 机制）
 *
 * 与 React 端「11 个预设色板 + data-design-theme 属性」不同，Vue 端直接使用
 * Nuxt UI 的 Color System：候选色 = Tailwind 全部色相色板（剔除中性系与
 * 特殊值），另有「Black」黑白主题档。
 *
 * 生效方式（纯 Vite + vue-plugin 模式下无 Nuxt colors 插件，不可改 appConfig）：
 * - 色板档：运行时覆盖 <html> 上 `--ui-color-primary-{50..950}` 共 11 个 shade
 *   变量；Nuxt UI 的 `--ui-primary → var(--ui-color-primary-500|400)` 间接链
 *   自动跟随（亮色取 500、暗色取 400 的分档由 Nuxt UI 自身规则完成），
 *   `bg-primary-*` 等 Tailwind 工具类同样经 `--color-primary-* → --ui-color-primary-*`
 *   映射同步。
 * - Black 档（blackAsPrimary）：清除 shade 覆盖，改覆盖 `--ui-primary` 为
 *   black / white（随明暗切换重算）；选中色板时反向清除该覆盖，二者互斥。
 * - 默认档：不写 DOM（沿用 vite 插件 ui() 生成的默认 primary）。
 *
 * 色名硬编码英文首字母大写展示，不走 i18n（vue-plan §3 i18n 键冻结规则的例外项）。
 */

/** Nuxt UI 的中性色板（不作主题色候选） */
const NEUTRAL_COLORS = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "taupe",
  "mauve",
  "mist",
  "olive",
] as const;

/** 从候选中剔除的键：非色板值 + 黑白 + 中性系 */
const OMITTED_KEYS: ReadonlySet<string> = new Set([
  "inherit",
  "current",
  "transparent",
  "black",
  "white",
  ...NEUTRAL_COLORS,
]);

/** 主题色 shade 刻度（与 Nuxt UI colors 插件 generateShades 一致） */
export const PRIMARY_SHADES = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

type ShadeScale = Record<(typeof PRIMARY_SHADES)[number], string>;

/**
 * 候选主题色名列表（Tailwind 色相色板，如 red / orange / … / rose）。
 * 顺序沿用 tailwindcss/colors 的定义顺序（色相环顺序）。
 */
export const PRIMARY_COLORS: readonly string[] = Object.keys(colors).filter(
  (key) =>
    !OMITTED_KEYS.has(key) &&
    typeof (colors as Record<string, unknown>)[key] === "object",
);

/**
 * 默认主题色：与 vite.config.ts 的 `ui()` 未配置 colors 时的 Nuxt UI 默认值
 * 一致（`green`）；若后续经 `ui({ ui: { colors: { primary } } })` 定制品牌色，
 * 此常量须同步（默认档 = 不写 DOM，实际取值来自插件生成的 CSS）。
 */
export const DEFAULT_PRIMARY_COLOR = "green";

/** 是否为合法的候选主题色名（兜底校验，失效值回退默认色）。 */
export function isPrimaryColor(value: unknown): value is string {
  return typeof value === "string" && PRIMARY_COLORS.includes(value);
}

/** 取某色板的指定 shade 色值（tailwindcss v4 为 oklch 字符串；未知色返回空串）。 */
export function getColorShade(
  color: string,
  shade: (typeof PRIMARY_SHADES)[number],
): string {
  const scale = (colors as Record<string, ShadeScale | string>)[color];

  if (!scale || typeof scale !== "object") return "";

  return scale[shade] ?? "";
}

/** 色名展示文案：英文首字母大写（Red / Orange / …）。 */
export function formatColorLabel(color: string): string {
  return color.charAt(0).toUpperCase() + color.slice(1);
}

/**
 * 把主题色偏好应用到 <html>（inline style 覆盖 Nuxt UI 的 :root 变量）。
 * @param color 色板名（默认色不写 shade 覆盖）
 * @param blackAsPrimary 是否启用 Black 黑白主题
 * @param isDark 当前是否暗色（决定 Black 档取 white 还是 black）
 */
export function applyPrimaryColorToDOM(
  color: string,
  blackAsPrimary: boolean,
  isDark: boolean,
): void {
  const root = document.documentElement;

  if (blackAsPrimary) {
    for (const shade of PRIMARY_SHADES) {
      root.style.removeProperty(`--ui-color-primary-${shade}`);
    }
    root.style.setProperty("--ui-primary", isDark ? "white" : "black");

    return;
  }

  root.style.removeProperty("--ui-primary");

  if (color === DEFAULT_PRIMARY_COLOR || !isPrimaryColor(color)) {
    for (const shade of PRIMARY_SHADES) {
      root.style.removeProperty(`--ui-color-primary-${shade}`);
    }

    return;
  }

  for (const shade of PRIMARY_SHADES) {
    root.style.setProperty(
      `--ui-color-primary-${shade}`,
      getColorShade(color, shade),
    );
  }
}

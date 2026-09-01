/**
 * 主题色色板定义
 *
 * 与 theme.css 中的 [data-design-theme="xxx"] 预设一一对应。
 * "default" 为内置默认主题（不设置 data-design-theme 属性）。
 */

export interface ThemeColorPalette {
  /** 唯一标识，对应 [data-design-theme="xxx"] */
  id: string;
  /** 名称的 i18n key（layout.prefs.themeColor.palettes.<id>），渲染处经 t() 取词 */
  labelKey: string;
  /** 主色 hex 值，用于 ColorSwatch 显示 */
  accentHex: string;
}

/**
 * 预设色板列表（11 个，与 theme.css 中的预设完全对应）
 */
const PALETTE_LABEL_PREFIX = "layout.prefs.themeColor.palettes";

export const THEME_PALETTES: ThemeColorPalette[] = [
  {
    id: "default",
    labelKey: `${PALETTE_LABEL_PREFIX}.default`,
    accentHex: "#0485f7",
  },
  { id: "sky", labelKey: `${PALETTE_LABEL_PREFIX}.sky`, accentHex: "#00cbff" },
  {
    id: "lavender",
    labelKey: `${PALETTE_LABEL_PREFIX}.lavender`,
    accentHex: "#c79ef7",
  },
  {
    id: "mint",
    labelKey: `${PALETTE_LABEL_PREFIX}.mint`,
    accentHex: "#80dba2",
  },
  {
    id: "netflix",
    labelKey: `${PALETTE_LABEL_PREFIX}.netflix`,
    accentHex: "#e50914",
  },
  {
    id: "uber",
    labelKey: `${PALETTE_LABEL_PREFIX}.uber`,
    accentHex: "#000000",
  },
  {
    id: "spotify",
    labelKey: `${PALETTE_LABEL_PREFIX}.spotify`,
    accentHex: "#1ed760",
  },
  {
    id: "coinbase",
    labelKey: `${PALETTE_LABEL_PREFIX}.coinbase`,
    accentHex: "#0052ff",
  },
  {
    id: "airbnb",
    labelKey: `${PALETTE_LABEL_PREFIX}.airbnb`,
    accentHex: "#ff385c",
  },
  {
    id: "discord",
    labelKey: `${PALETTE_LABEL_PREFIX}.discord`,
    accentHex: "#5865f2",
  },
  {
    id: "rabbit",
    labelKey: `${PALETTE_LABEL_PREFIX}.rabbit`,
    accentHex: "#FF6600",
  },
];

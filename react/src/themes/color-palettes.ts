/**
 * 主题色色板定义
 *
 * 与 theme.css 中的 [data-design-theme="xxx"] 预设一一对应。
 * "default" 为内置默认主题（不设置 data-design-theme 属性）。
 */

export interface ThemeColorPalette {
  /** 唯一标识，对应 [data-design-theme="xxx"] */
  id: string;
  /** 中文名称 */
  label: string;
  /** 主色 hex 值，用于 ColorSwatch 显示 */
  accentHex: string;
}

/**
 * 预设色板列表（11 个，与 theme.css 中的预设完全对应）
 */
export const THEME_PALETTES: ThemeColorPalette[] = [
  { id: "default", label: "默认", accentHex: "#0485f7" },
  { id: "sky", label: "天空蓝", accentHex: "#00cbff" },
  { id: "lavender", label: "薰衣草", accentHex: "#c79ef7" },
  { id: "mint", label: "薄荷绿", accentHex: "#80dba2" },
  { id: "netflix", label: "网飞红", accentHex: "#e50914" },
  { id: "uber", label: "极客黑", accentHex: "#000000" },
  { id: "spotify", label: "Spotify绿", accentHex: "#1ed760" },
  { id: "coinbase", label: "Coinbase蓝", accentHex: "#0052ff" },
  { id: "airbnb", label: "Airbnb红", accentHex: "#ff385c" },
  { id: "discord", label: "Discord蓝", accentHex: "#5865f2" },
  { id: "rabbit", label: "兔子橙", accentHex: "#FF6600" },
];

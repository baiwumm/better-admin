/**
 * 色彩模式偏好：正常 / 灰色（去色）/ 色弱（红绿色弱近似补色）
 *
 * 经 `html[data-color-vision]` 属性驱动 styles/color-vision.css 的全局滤镜，
 * 仅作用于视觉呈现，不改变任何组件变量与交互逻辑；normal 移除属性。
 * 色弱滤镜节点（feColorMatrix）定义在 index.html 的内联 <svg> 中。
 */

export type ColorVisionMode = "normal" | "grayscale" | "color-weak";

export const COLOR_VISION_MODES: {
  id: ColorVisionMode;
  /** 名称的 i18n key（layout.prefs.colorVision.<id>），渲染处经 t() 取词 */
  labelKey: string;
}[] = [
  { id: "normal", labelKey: "layout.prefs.colorVision.normal" },
  { id: "grayscale", labelKey: "layout.prefs.colorVision.grayscale" },
  { id: "color-weak", labelKey: "layout.prefs.colorVision.colorWeak" },
];

const COLOR_VISION_IDS: ColorVisionMode[] = COLOR_VISION_MODES.map((m) => m.id);

/** 是否为合法的色彩模式 id（兜底校验，失效值回退 normal）。 */
export function isColorVisionMode(value: unknown): value is ColorVisionMode {
  return (
    typeof value === "string" && (COLOR_VISION_IDS as string[]).includes(value)
  );
}

/** 把色彩模式应用到 <html> 的 data-color-vision 属性（normal 移除属性）。 */
export function applyColorVisionToDOM(mode: ColorVisionMode): void {
  const root = document.documentElement;

  if (mode === "normal") {
    root.removeAttribute("data-color-vision");
  } else {
    root.setAttribute("data-color-vision", mode);
  }
}

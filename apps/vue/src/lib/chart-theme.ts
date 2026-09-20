/**
 * 图表主题的 JS 侧部分（与 `styles/chart-theme.css` 配套）。
 *
 * CSS 能表达的（坐标轴 / Tooltip / 圆心标签配色）全部走 `--vis-*` → `--ui-*` 变量
 * 映射；这里只放 CSS 做不到的两件事：分类色标度与 Tooltip 内容构造。
 */

/** 扇区 / 系列色相轮转偏移（度，六段循环） */
const HUE_OFFSETS = [0, 42, -42, 84, -84, 126];

/**
 * 第 index 个分类色：由主色派生，恒定明度 L、彩度取品牌 0.72 倍、只轮转色相。
 *
 * 与 React / Next 基准同一色相标度，不新增色值。弃用「主色透明度阶梯」的原因：
 * alpha 是与卡片底色混合，深色模式下低 alpha 系列几乎与底色同化，相邻扇区无法分辨。
 */
export function chartColor(index: number): string {
  const offset = HUE_OFFSETS[index % HUE_OFFSETS.length];
  const sign = offset < 0 ? "-" : "+";

  return `oklch(from var(--ui-primary) l calc(c * 0.72) calc(h ${sign} ${Math.abs(offset)}))`;
}

/**
 * 构造 Unovis Tooltip 的内容节点。
 *
 * `VisTooltip.triggers` 允许直接返回 HTML 字符串，但角色名、公告标题这类是后台可
 * 编辑数据，拼进 innerHTML 等于开一个注入面 —— 一律走 createElement + textContent。
 */
export function chartTooltipNode(label: string, value: string): HTMLElement {
  const box = document.createElement("div");
  const labelEl = document.createElement("p");

  labelEl.className = "text-muted";
  labelEl.textContent = label;

  const valueEl = document.createElement("p");

  valueEl.className = "text-highlighted font-semibold tabular-nums";
  valueEl.textContent = value;

  box.append(labelEl, valueEl);

  return box;
}

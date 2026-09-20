<script setup lang="ts" generic="Datum extends object">
import type { CurveType, Spacing } from "@unovis/ts";

import {
  VisArea,
  VisAxis,
  VisCrosshair,
  VisTooltip,
  VisXYContainer,
} from "@unovis/vue";

/**
 * 面积 / 折线封装（Unovis）。
 *
 * 只包住「每个直角坐标图表都要重复写」的那一层：容器 + 两条轴 + 十字准星 +
 * Tooltip。数据形状与取值器由调用方给，因此后续菜单换一份数据即可复用。
 *
 * 尺寸走库默认 `Sizing.Fit`（容器内置 ResizeObserver），不需要外层再量像素；
 * 主题取色由 `.chart-theme` 把 `--vis-*` 接到 `--ui-*`（见 styles/chart-theme.css）。
 *
 * `data` 容器与叶子组件都挂一份：容器的 datamodel 驱动轴 / 十字准星 / Tooltip，
 * 叶子组件自己的 datamodel 才画图形（库内取值是 `容器 data ?? 组件 data`）。
 */

withDefaults(
  defineProps<{
    data: Datum[];
    /** x 取值器（Unovis 的 x 轴必须是数值，日期请传序号再用 xTickFormat 还原标签） */
    x: (datum: Datum) => number;
    y: (datum: Datum) => number;
    /** 悬停内容；返回 HTMLElement 而不是 HTML 字符串，避免后台数据进 innerHTML */
    tooltip: (datum: Datum) => HTMLElement | string;
    /** x 轴刻度文本格式化（入参是 x 取值器算出的数值） */
    xTickFormat?: (value: number) => string;
    /** 面积填充色；传 `url(#id)` 可配合 svgDefs 做渐变 */
    color?: (data: Datum[]) => string;
    /** 注入容器 `<defs>` 的原始 SVG（渐变等），内容必须是静态串、不拼业务数据 */
    svgDefs?: string;
    curveType?: CurveType | string;
    /** y 轴量程；不传则由库自动 nice-ticks（计数类图表要显式给整数量程，否则会出现 3.5 这种刻度） */
    yDomain?: [number | undefined, number | undefined];
    margin?: Spacing;
    ariaLabel?: string;
  }>(),
  {
    xTickFormat: undefined,
    color: () => "var(--ui-primary)",
    svgDefs: undefined,
    curveType: "monotoneX",
    yDomain: undefined,
    margin: undefined,
    ariaLabel: undefined,
  },
);
</script>

<template>
  <div class="chart-theme h-full min-h-0 w-full">
    <VisXYContainer
      :data="data"
      :margin="margin"
      :svg-defs="svgDefs"
      :y-domain="yDomain"
      :aria-label="ariaLabel"
    >
      <VisArea
        :data="data"
        :x="x"
        :y="y"
        :color="color"
        :curve-type="curveType"
      />
      <VisAxis
        type="x"
        :domain-line="false"
        :grid-line="false"
        :tick-format="xTickFormat"
        :tick-line="false"
        :tick-text-hide-overlapping="true"
      />
      <VisAxis
        type="y"
        :domain-line="false"
        :tick-line="false"
        :num-ticks="5"
      />
      <VisCrosshair :template="tooltip" />
      <VisTooltip />
    </VisXYContainer>
  </div>
</template>

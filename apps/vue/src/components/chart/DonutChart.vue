<script setup lang="ts" generic="Datum extends object">
import { computed } from "vue";

import {
  VisDonut,
  VisDonutSelectors,
  VisSingleContainer,
  VisTooltip,
} from "@unovis/vue";

import { chartColor } from "@/lib/chart-theme";

/**
 * 环形图封装（Unovis）。
 *
 * 圆心读数走库的 `centralLabel` / `centralSubLabel`，由库按几何算圆心 —— 这是换掉
 * 手写 SVG 的收益之一：nuxt-charts 的 default slot 覆盖层恒在容器 50%，内置图例又
 * 会把圆心 cy 顶上去，得在组件外测图例高度做补偿。
 *
 * 库没有通用 Legend 组件（React / Vue 两侧都没有），图例列表仍由调用方渲染。
 */

const props = withDefaults(
  defineProps<{
    data: Datum[];
    value: (datum: Datum) => number;
    /** 悬停内容；返回 HTMLElement 而不是 HTML 字符串，避免后台数据进 innerHTML */
    tooltip: (datum: Datum) => HTMLElement | string;
    centralLabel?: string;
    centralSubLabel?: string;
    /** 环带厚度（像素）。库默认 20，`0` 即退化为饼图 */
    arcWidth?: number;
    /** 扇区间隙角，单位「度」——库的 padAngle 用弧度，这里换算以免调用方踩单位 */
    padAngleDeg?: number;
    color?: (datum: Datum, index: number) => string;
    ariaLabel?: string;
  }>(),
  {
    centralLabel: undefined,
    centralSubLabel: undefined,
    arcWidth: 20,
    padAngleDeg: 2,
    color: (datum: Datum, index: number) => chartColor(index),
    ariaLabel: undefined,
  },
);

const padAngle = computed(() => (props.padAngleDeg * Math.PI) / 180);

const tooltipTriggers = {
  /**
   * 库给扇区触发器的是 d3 的 PieArcDatum（原始数据在 `.data`、数值在 `.value`），
   * 直接当原始切片用会拿到 undefined。这里统一拆包，对外仍暴露原始 datum。
   */
  [VisDonutSelectors.segment]: (arc: { data: Datum }) =>
    props.tooltip(arc.data),
};
</script>

<template>
  <div class="chart-theme h-full min-h-0 w-full">
    <VisSingleContainer :data="data" :aria-label="ariaLabel">
      <VisDonut
        :data="data"
        :value="value"
        :color="color"
        :arc-width="arcWidth"
        :pad-angle="padAngle"
        :central-label="centralLabel"
        :central-sub-label="centralSubLabel"
      />
      <VisTooltip :triggers="tooltipTriggers" />
    </VisSingleContainer>
  </div>
</template>

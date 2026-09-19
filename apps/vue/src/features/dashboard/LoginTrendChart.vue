<script setup lang="ts">
import type { StatsSeriesPoint } from "@/lib/api-types";

import { useElementSize } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import {
  AXIS_DIVISIONS,
  areaPath,
  axisScale,
  smoothPath,
  zeroBasedPoints,
} from "./chart-geometry";

/**
 * 登录趋势主图（对齐 React 端 login-trend-chart：主色垂直渐变面积 + 平滑曲线 +
 * 弱网格 + 毛玻璃 Tooltip）。
 *
 * React 端用 recharts，Vue 端按 AGENTS §15 / nuxt-ui-guide §1 不引入图表库
 * （Nuxt UI v4 无图表组件，接入需新增 chart.js 依赖），改为内联 SVG 手写：
 * 画布尺寸经 useElementSize 实测后按真实像素绘制，因此文字不被拉伸变形，
 * 无需 recharts 的 ResponsiveContainer。
 */

/** 画布留白：左侧给纵轴刻度、底部给横轴日期（对齐 recharts margin + YAxis width） */
const PAD = { top: 12, right: 12, bottom: 22, left: 32 };
/** 横轴日期标签的最小间隔像素（同 recharts minTickGap 的避让思路） */
const LABEL_GAP = 68;
/** Tooltip 相对数据点的偏移，避免压在光标正下方 */
const TIP_OFFSET = 14;

const props = defineProps<{ series: StatsSeriesPoint[] }>();

const { t } = useI18n();
const box = ref<HTMLElement | null>(null);
const { width, height } = useElementSize(box);

const counts = computed(() => props.series.map((point) => point.count));
const scale = computed(() => axisScale(Math.max(...counts.value, 0)));

const plot = computed(() => ({
  x: PAD.left,
  y: PAD.top,
  width: Math.max(0, width.value - PAD.left - PAD.right),
  height: Math.max(0, height.value - PAD.top - PAD.bottom),
}));

const points = computed(() =>
  zeroBasedPoints(counts.value, plot.value, scale.value.top),
);

const curve = computed(() => {
  const line = smoothPath(points.value);

  return {
    line,
    area: areaPath(line, points.value, plot.value.y + plot.value.height),
  };
});

/** 水平网格线 + 纵轴刻度（0 基线到顶值四等分，步长为整数） */
const gridLines = computed(() =>
  Array.from({ length: AXIS_DIVISIONS + 1 }, (_, index) => {
    const value = scale.value.step * index;
    const ratio = value / scale.value.top;

    return {
      value,
      y: plot.value.y + plot.value.height - ratio * plot.value.height,
    };
  }),
);

/** 日期标签抽稀：按点间距决定间隔，使相邻标签至少留 LABEL_GAP 像素 */
const labelStride = computed(() => {
  const stepX =
    points.value.length > 1
      ? plot.value.width / (points.value.length - 1)
      : plot.value.width;

  if (stepX >= LABEL_GAP) return 1;

  return Math.max(1, Math.ceil(LABEL_GAP / stepX));
});

/**
 * Hover：单条连续 mousemove 反查最近数据点（与 React 端环形图同一模型，
 * 元素常驻只切 data-visible，Tooltip 在点之间滑行而非反复重挂）。
 */
const hoverIndex = ref<number | null>(null);
const lastIndex = ref(0);
const tipPos = ref({ x: 0, y: 0 });

function onMove(event: MouseEvent) {
  const rect = box.value?.getBoundingClientRect();

  if (!rect || points.value.length === 0) return;

  const stepX =
    points.value.length > 1 ? plot.value.width / (points.value.length - 1) : 0;
  const raw = stepX ? (event.clientX - rect.left - plot.value.x) / stepX : 0;
  const index = Math.min(Math.max(Math.round(raw), 0), points.value.length - 1);

  lastIndex.value = index;
  hoverIndex.value = index;
  tipPos.value = { x: points.value[index].x, y: points.value[index].y };
}

const shown = computed(() => {
  const index = hoverIndex.value ?? lastIndex.value;
  const point = points.value[index];

  return {
    index,
    date: props.series[index]?.date ?? "",
    count: counts.value[index] ?? 0,
    x: point?.x ?? 0,
    y: point?.y ?? 0,
  };
});
</script>

<template>
  <div
    ref="box"
    class="dashboard-trend-glow relative h-full min-h-56 w-full flex-1"
    @mouseleave="hoverIndex = null"
    @mousemove="onMove"
  >
    <svg
      v-if="curve.line && width > 0"
      aria-hidden
      class="h-full w-full"
      :viewBox="`0 0 ${width} ${height}`"
    >
      <defs>
        <linearGradient id="login-trend-fill" x1="0" x2="0" y1="0" y2="1">
          <stop
            offset="0%"
            style="stop-color: var(--ui-primary); stop-opacity: 0.32"
          />
          <stop
            offset="100%"
            style="stop-color: var(--ui-primary); stop-opacity: 0.02"
          />
        </linearGradient>
      </defs>

      <g style="stroke: var(--ui-border)" stroke-dasharray="3 3">
        <line
          v-for="line in gridLines"
          :key="line.value"
          :x1="PAD.left"
          :x2="width - PAD.right"
          :y1="line.y"
          :y2="line.y"
        />
      </g>
      <g style="fill: var(--ui-text-muted)">
        <text
          v-for="line in gridLines"
          :key="line.value"
          :x="PAD.left - 8"
          :y="line.y"
          font-size="11"
          text-anchor="end"
          dominant-baseline="middle"
        >
          {{ line.value }}
        </text>
        <text
          v-for="(point, index) in points"
          v-show="index % labelStride === 0"
          :key="index"
          :x="point.x"
          :y="height - 6"
          font-size="11"
          text-anchor="middle"
        >
          {{ series[index]?.date }}
        </text>
      </g>

      <line
        v-if="hoverIndex !== null"
        :x1="shown.x"
        :x2="shown.x"
        :y1="PAD.top"
        :y2="plot.y + plot.height"
        style="stroke: var(--ui-border)"
      />
      <path :d="curve.area" style="fill: url(#login-trend-fill)" />
      <path
        :d="curve.line"
        style="fill: none; stroke: var(--ui-primary); stroke-width: 2"
      />
      <circle
        v-if="hoverIndex !== null"
        :cx="shown.x"
        :cy="shown.y"
        r="3.5"
        style="fill: var(--ui-bg); stroke: var(--ui-primary); stroke-width: 2"
      />
    </svg>

    <div
      class="dashboard-chart-tooltip dashboard-hover-tooltip"
      :data-visible="hoverIndex !== null"
      :style="{
        transform: `translate(${tipPos.x + TIP_OFFSET}px, ${tipPos.y}px) translateY(-50%)`,
      }"
    >
      <p class="text-muted text-xs">{{ shown.date }}</p>
      <p class="text-highlighted text-xs font-semibold tabular-nums">
        {{ t("features.dashboard.chart.logins") }}：{{ shown.count }}
      </p>
    </div>
  </div>
</template>

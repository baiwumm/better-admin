<script setup lang="ts">
import type { StatsSeriesPoint } from '@/lib/api-types'

import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * 登录趋势主图（对齐 React 端 login-trend-chart：主色渐变面积 + 平滑曲线 +
 * 水平弱网格 + 毛玻璃 Tooltip）。
 *
 * 图表用 nuxt-charts AreaChart（vccs 引擎，Recharts 的 Vue 移植——与 React
 * 基准同源）：不传系列色时组件回落到 `--vc-series-0` = `--ui-primary`（其
 * theme.css 原生对接 Nuxt UI token 并跟随 .dark），主色渐变面积与暗色适配
 * 即为默认行为；curveType monotoneX 对齐 recharts `type="monotone"`。
 * 高度经 useElementSize 实测容器后按像素传入（AreaChart height 为必填像素值），
 * 宽度由组件自适应，行为等价于 recharts ResponsiveContainer。
 */

const props = defineProps<{ series: StatsSeriesPoint[] }>()

const { t } = useI18n()
const box = ref<HTMLElement | null>(null)
const { width, height } = useElementSize(box)

/** 骨架高度兜底：容器尚未布局时给 AreaChart 一个合法像素高度 */
const chartHeight = computed(() => Math.max(0, Math.round(height.value)))

/**
 * x 轴刻度格式化。v3 各组件对 xFormatter 的取值语义不一（Candlestick 传
 * 索引、直角坐标轴传 tick 值），这里两种都兼容：整数索引查序列，其余原样
 * 透传（date 即刻度文本本身）。
 */
function xFormatter(value: number): string {
  const index = Number(value)

  return props.series[index]?.date ?? String(value)
}

const categories = computed(() => ({
  count: { name: t('features.dashboard.chart.logins') }
}))

/** v3 曲线枚举（CurveType 由模块自动导入）：对齐 recharts `type="monotone"` */
const curveType = CurveType.MonotoneX
</script>

<template>
  <div
    ref="box"
    class="dashboard-trend-glow relative h-full min-h-56 w-full flex-1"
  >
    <AreaChart
      v-if="width > 0 && chartHeight > 0"
      aria-hidden
      class="h-full w-full"
      :categories="categories"
      :curve-type="curveType"
      :data="series"
      :height="chartHeight"
      hide-legend
      :x-grid-line="false"
      :x-formatter="xFormatter"
      x-axis="date"
      :y-grid-line="true"
      tooltip-variant="frosted-glass"
    />
  </div>
</template>

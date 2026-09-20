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

/** 纵轴刻度槽位宽度（nuxt-charts 数值轴固定 40px），抽稀前先按它扣掉可用宽度 */
const Y_AXIS_WIDTH = 40
/** vccs 图表默认左右 margin（实测首刻度圆心 45 = 5 + 40，末刻度圆心 = 宽 - 5） */
const X_MARGIN = 5
/**
 * 相邻日期标签的最小像素间距：`YYYY-MM-DD` 实测 72px 宽，留 12px 呼吸。
 * 口径对齐 React 基准的 `minTickGap` 与 Vue 端手写的 LABEL_GAP。
 */
const LABEL_GAP = 84
/** 标签半宽：圆心居中的标签最多向两侧各溢出这么多像素 */
const LABEL_HALF = 36

/**
 * 横轴抽稀：显式给 ticks 而不是传 xNumTicks。内置等距刻度（xNumTicks）首尾必定落在
 * 两个端点上，而末点圆心距 SVG 右缘只有 5px、居中标签固定溢出 31px，SVG 是
 * `overflow: hidden`、卡片只剩 24px 内边距，末格必然被裁（7 / 30 日都一样）。
 *
 * 这里按「最小索引步长」取点（与 Vue 端 labelStride 同一算法）：先让相邻标签间距
 * ≥ LABEL_GAP 消除拥挤，再把圆心距右边界不足 LABEL_HALF 的刻度一并舍弃消除截断。
 * 注意不能改成「按可用宽度算刻度数」——点数被序列长度封顶后，实际步长会退化到 1
 * 个数据点（72px 标签挤在 71px 间距里），窄卡上反而互相压字。
 */
const xTicks = computed(() => {
  const points = props.series
  const lastIndex = points.length - 1

  if (lastIndex < 1) return points.map(point => point.date)

  const usable = Math.max(0, width.value - Y_AXIS_WIDTH - X_MARGIN * 2)
  const stepX = usable / lastIndex
  const stride = Math.max(1, Math.ceil(LABEL_GAP / (stepX || LABEL_GAP)))
  const edgeGuard = Math.ceil(LABEL_HALF / (stepX || LABEL_HALF))

  return points
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => index % stride === 0 && index <= lastIndex - edgeGuard)
    .map(({ point }) => point.date)
})

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
      :x-explicit-ticks="xTicks"
      :x-formatter="xFormatter"
      x-axis="date"
      :y-grid-line="true"
      tooltip-variant="frosted-glass"
    />
  </div>
</template>

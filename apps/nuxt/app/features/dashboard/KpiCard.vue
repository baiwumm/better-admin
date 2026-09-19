<script setup lang="ts">
import type { StatsSeriesPoint } from '@/lib/api-types'

import NumberFlow from '@number-flow/vue'
import { computed, useId } from 'vue'

import { areaPath, relativePoints, smoothPath } from './sparkline-geometry'

/**
 * KPI 统计卡（对齐 React 端 kpi-card / Vue 端 KpiCard）：卡头 = 左上图标徽标
 * + 标题 + 右侧状态 badge；卡体 = NumberFlow 大数字 + 底部通栏迷你 sparkline。
 *
 * sparkline 用 `preserveAspectRatio="none"` 铺满卡宽，因此描边必须带
 * `vector-effect="non-scaling-stroke"`——否则非等比缩放会让线宽随方向变化。
 * 颜色一律走内联 style 的 CSS 变量：SVG 呈现属性在部分引擎里不解析 var()，
 * style 属性才是可靠通道。
 * 渐变 id 用 Vue 3.5 useId()：`<script setup>` 顶层每个实例都会重新执行，
 * React 端「模块级自增序号」写法平移过来会让所有卡拿到同一个 id。
 * 无 series 的卡（组织规模）不留空带，数字顶部对齐（同排四卡大数字共基线）。
 */

/** sparkline 内部坐标系（viewBox 单位，与归一化取值范围配套） */
const SPARK_WIDTH = 100
const SPARK_HEIGHT = 40
/** 上下各留 2 单位，避免曲线贴边被裁 */
const SPARK_INSET = 2

/** badge 色调 → Nuxt UI Badge color */
const BADGE_TONE_COLOR = {
  up: 'success',
  down: 'error',
  accent: 'primary',
  neutral: 'neutral'
} as const

const props = withDefaults(
  defineProps<{
    label: string
    value: number
    /** 左上角图标徽标（主色 10% 底 + 主色图标） */
    icon: string
    /** 状态文案（环比 / 今日增量等；缺省不展示） */
    badge?: string
    /** badge 色调（up=涨 / down=跌 / accent=主色 / neutral=中性） */
    badgeTone?: keyof typeof BADGE_TONE_COLOR
    /** 近 7 日序列（底部迷你折线数据；缺省时不出趋势带） */
    series?: StatsSeriesPoint[]
  }>(),
  {
    badge: undefined,
    badgeTone: 'neutral',
    series: undefined
  }
)

const gradientId = `kpi-spark-${useId()}`

const spark = computed(() => {
  const series = props.series

  if (!series?.length) return { line: '', area: '' }

  const points = relativePoints(
    series.map(point => point.count),
    {
      x: 0,
      y: SPARK_INSET,
      width: SPARK_WIDTH,
      height: SPARK_HEIGHT - SPARK_INSET * 2
    }
  )
  const line = smoothPath(points)

  return { line, area: areaPath(line, points, SPARK_HEIGHT) }
})
</script>

<template>
  <!-- 卡体即 flex 容器（ui.body 覆盖）：同排四卡被 grid 拉到等高后，
       底部 sparkline 靠 mt-auto 贴住卡底，数字才共用同一条基线 -->
  <UCard
    class="dashboard-card flex flex-col"
    :ui="{ body: 'flex flex-1 flex-col gap-2' }"
  >
    <template #header>
      <div class="flex items-center gap-2.5">
        <span
          aria-hidden
          class="bg-primary/10 text-primary grid size-8 shrink-0 place-items-center rounded-lg"
        >
          <UIcon
            :name="icon"
            class="size-4"
          />
        </span>
        <span class="text-muted min-w-0 flex-1 truncate text-sm">
          {{ label }}
        </span>
        <UBadge
          v-if="badge"
          :color="BADGE_TONE_COLOR[badgeTone]"
          :label="badge"
          size="sm"
          variant="soft"
        />
      </div>
    </template>

    <NumberFlow
      :value="value"
      class="text-highlighted text-3xl font-semibold tabular-nums"
    />
    <svg
      v-if="spark.line"
      aria-hidden
      class="mt-auto h-8 w-full"
      preserveAspectRatio="none"
      :viewBox="`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`"
    >
      <defs>
        <linearGradient
          :id="gradientId"
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop
            offset="0%"
            style="stop-color: var(--ui-primary); stop-opacity: 0.25"
          />
          <stop
            offset="100%"
            style="stop-color: var(--ui-primary); stop-opacity: 0"
          />
        </linearGradient>
      </defs>
      <path
        :d="spark.area"
        :style="`fill: url(#${gradientId})`"
      />
      <path
        :d="spark.line"
        style="fill: none; stroke: var(--ui-primary); stroke-width: 1.5"
        stroke-linecap="round"
        vector-effect="non-scaling-stroke"
      />
    </svg>
  </UCard>
</template>

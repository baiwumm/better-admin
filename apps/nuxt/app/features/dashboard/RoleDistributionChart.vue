<script setup lang="ts">
import type { StatsRoleSlice } from '@/lib/api-types'

import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * 角色占比环形图（对齐 React 端 role-distribution-chart）：环形扇区 +
 * 圆心成员总数 + 图例列表。
 *
 * 图表用 nuxt-charts DonutChart：padAngle 2° 对齐 React recharts
 * `paddingAngle={2}`；内径比（30% 厚度）经容器实测后换算为 arcWidth 像素，
 * 对齐 recharts `innerRadius="70%"` 比例；圆心总数走组件 default slot。
 * 分段配色不逐段指定——组件回落到 `--vc-series-0..N`（theme.css 映射
 * --ui-primary / secondary / success / info / warning / error 等 Nuxt UI
 * 分类色 token，暗色自动适配），符合 AGENTS §21「直接使用 Nuxt UI 默认
 * Design Tokens」；React 端的主色色相轮转属 HeroUI 侧等价决策，视觉语义
 * （多色分类色）两端一致。
 * 图例用组件内置 Legend（圆点 + 角色名，legend-variant="circle"）：内置图例
 * 渲染在图表自身的 `.vue-chrts` 作用域内，`--vc-series-N` 取得到，圆点才有色；
 * 代价是内置 Legend 无 formatter / 无 content 插槽（3.0.0 源码与上游 main 一致），
 * 成员数不再出现在图例上，只在 Tooltip 与无障碍数据表里给。
 */

const props = defineProps<{ slices: StatsRoleSlice[] }>()

const { t } = useI18n()
const box = ref<HTMLElement | null>(null)
const { width, height } = useElementSize(box)

/** 有成员的角色才出扇区（零值扇区在图上不可见，图例一并隐藏） */
const sectors = computed(() => props.slices.filter(slice => slice.count > 0))

/** 内径比：React 基准 recharts innerRadius="70%"（厚度 = 外径 30%） */
const INNER_RATIO = 0.7

/**
 * 内置图例是绝对定位在图表底部的覆盖层，vccs 会按它的实测高度把圆心 cy 上移到
 * (图表高 - 图例高) / 2，但半径和组件 default slot 的覆盖层都不跟着动：前者会让扇区
 * 压在图例上，后者会让圆心读数偏离真圆心。所以这条带高要实测后再分别喂给两处补偿。
 * 首帧拿不到实测值，先按最坏换行兜底（行高 18px（0.75rem / 1.5）× 5 行 + 组件下内缩
 * 12px ≈ 102，取 96）：宁可环小一点，也不要第一帧就压住图例。
 */
const LEGEND_RESERVE = 96
const legendHeight = ref(0)

/** 半径让出的图例带高（未实测前用估值兜底） */
const legendBand = computed(() => legendHeight.value || LEGEND_RESERVE)
/** 圆心读数回到 vccs 实际使用的圆心：只按实测高度补偿，估值会把首帧推歪 */
const centerOffsetY = computed(() => -Math.round(legendHeight.value / 2))

/** 外径自适应容器（留 8px 边距），厚度按内径比换算为像素 */
const radius = computed(() =>
  Math.max(0, Math.min(width.value, Math.max(0, height.value - legendBand.value)) / 2 - 8)
)
const arcWidth = computed(() => Math.round(radius.value * (1 - INNER_RATIO)))

/**
 * 图例节点由 vccs 经 Teleport 异步挂到 portal 上，首帧查询常常落空，且落空后没有
 * 任何依赖变化会再触发重查（实测补偿量恒为 0、圆心读数压在环下方）——所以用
 * MutationObserver 盯容器子树补挂，再用 ResizeObserver 跟图例自身的换行高度。
 * 半径变化不改变图例宽度，两个观察器都不会互相激发成死循环。
 */
let boxEl: Element | null = null
let boxMo: MutationObserver | null = null
let legendEl: Element | null = null
let legendRo: ResizeObserver | null = null

function readLegendHeight() {
  legendHeight.value = legendEl
    ? Math.round(legendEl.getBoundingClientRect().height)
    : 0
}

function trackLegend() {
  const el = boxEl?.querySelector('.v-charts-legend-wrapper') ?? null

  if (el === legendEl) return
  legendEl = el
  legendRo ??= new ResizeObserver(readLegendHeight)
  legendRo.disconnect()
  if (!el) {
    legendHeight.value = 0
    return
  }
  legendRo.observe(el)
  readLegendHeight()
}

watch(
  box,
  (el) => {
    if (el === boxEl) return
    boxEl = el
    boxMo ??= new MutationObserver(trackLegend)
    boxMo.disconnect()
    if (el) boxMo.observe(el, { childList: true, subtree: true })
    trackLegend()
  },
  { flush: 'post' }
)

onBeforeUnmount(() => {
  boxMo?.disconnect()
  legendRo?.disconnect()
  boxMo = null
  boxEl = null
  legendRo = null
  legendEl = null
})

/** DonutChart categories：键为段名（nameKey 值），色不指定走 --vc-series-N */
const categories = computed(() =>
  Object.fromEntries(
    sectors.value.map(slice => [slice.roleName, { name: slice.roleName }])
  )
)

const total = computed(() =>
  props.slices.reduce((acc, slice) => acc + slice.count, 0)
)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div
      ref="box"
      class="role-donut-box relative min-h-40 w-full flex-1"
    >
      <DonutChart
        v-if="radius > 0 && sectors.length > 0"
        aria-hidden
        :arc-width="arcWidth"
        :categories="categories"
        :data="sectors"
        :height="Math.max(0, Math.round(height))"
        legend-variant="circle"
        name-key="roleName"
        :pad-angle="2"
        :radius="radius"
        tooltip-variant="frosted-glass"
        value-key="count"
      >
        <div
          class="flex flex-col items-center"
          :style="`transform: translateY(${centerOffsetY}px)`"
        >
          <span class="text-highlighted text-2xl font-semibold tabular-nums">
            {{ total }}
          </span>
          <span class="text-muted text-xs">
            {{ t('features.dashboard.chart.totalMembers') }}
          </span>
        </div>
      </DonutChart>

      <!-- 全部角色零成员时的空态（复用 DataTable 通用空态键，语言包由
           sync-locales 以 React 端为真源覆盖，本端不自造键） -->
      <div
        v-else-if="radius > 0"
        class="text-muted absolute inset-0 grid place-items-center text-sm"
      >
        {{ t('common.datatable.empty') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * 圆心读数与内置 Tooltip 的避让：vccs 把扇区 Tooltip 锚在扇区质心、再 clamp 回
 * viewBox，1/3 卡宽下浮层实测 128px 宽、六个扇区全部压住圆心总数，而 3.0.0 没有
 * 透出 position / offset 可改落点。Tooltip 未激活时它的 wrapper 只剩一个 v-if 注释
 * 节点（:empty 成立），据此在浮层可见期间淡出圆心，环心同时只留一份读数。
 */
.role-donut-box :deep(.donut-chart__center) {
  transition: opacity 120ms ease;
}

.role-donut-box:has(.v-charts-tooltip-wrapper:not(:empty)) :deep(.donut-chart__center) {
  opacity: 0;
}
</style>

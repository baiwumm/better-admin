<script setup lang="ts">
import type { StatsRoleSlice } from '@/lib/api-types'

import { computed, ref } from 'vue'
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
 * 图例（名称 + 成员数）自绘：组件内置 legend 不含数值，与两端差异过大。
 */

const props = defineProps<{ slices: StatsRoleSlice[] }>()

const { t } = useI18n()
const box = ref<HTMLElement | null>(null)
const { width, height } = useElementSize(box)

/** 有成员的角色才出扇区（零值扇区在图上不可见，图例一并隐藏） */
const sectors = computed(() => props.slices.filter(slice => slice.count > 0))

/** 内径比：React 基准 recharts innerRadius="70%"（厚度 = 外径 30%） */
const INNER_RATIO = 0.7

/** 外径自适应容器（留 8px 边距），厚度按内径比换算为像素 */
const radius = computed(() =>
  Math.max(0, Math.min(width.value, height.value) / 2 - 8)
)
const arcWidth = computed(() => Math.round(radius.value * (1 - INNER_RATIO)))

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
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div
      ref="box"
      class="relative min-h-40 w-full flex-1"
    >
      <DonutChart
        v-if="radius > 0 && sectors.length > 0"
        aria-hidden
        :arc-width="arcWidth"
        :categories="categories"
        :data="sectors"
        :height="Math.max(0, Math.round(height))"
        hide-legend
        name-key="roleName"
        :pad-angle="2"
        :radius="radius"
        tooltip-variant="frosted-glass"
        value-key="count"
      >
        <div class="flex flex-col items-center">
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

    <ul class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      <li
        v-for="(slice, index) in sectors"
        :key="slice.roleCode"
        class="flex items-center gap-1.5 text-xs"
      >
        <span
          aria-hidden
          class="size-2.5 shrink-0 rounded-full"
          :style="`background: var(--vc-series-${index % 8})`"
        />
        <span class="text-default whitespace-nowrap">{{ slice.roleName }}</span>
        <span class="text-muted shrink-0 text-xs tabular-nums">
          {{ slice.count }}
        </span>
      </li>
    </ul>
  </div>
</template>

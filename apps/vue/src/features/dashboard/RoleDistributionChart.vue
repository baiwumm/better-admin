<script setup lang="ts">
import type { StatsRoleSlice } from "@/lib/api-types";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

import DonutChart from "@/components/chart/DonutChart.vue";
import { chartColor, chartTooltipNode } from "@/lib/chart-theme";

/**
 * 角色占比环形图（对齐 React 端 role-distribution-chart）：环形扇区 + 圆心成员
 * 总数 + 「圆点 + 名称 + 数量」图例。
 *
 * 图表本体交给 Unovis 封装，圆心读数走库的 centralLabel（由库按几何算圆心，天然
 * 居中）；图例仍自绘——Unovis 不提供通用 Legend 组件（React / Vue 两侧都没有）。
 *
 * 分类色全部由主色派生（恒定明度、彩度取品牌 0.72 倍、色相六段轮转），与 React /
 * Next 端同一色相标度，见 lib/chart-theme.ts 的弃用 alpha 阶梯原因。
 */

/**
 * 环带厚度（像素）。React 基准是 innerRadius 68% / outerRadius 88%，即厚度约为
 * 外径的 30%；Unovis 的 arcWidth 只收像素值，按卡片典型尺寸（外径约 105px）取 32。
 */
const ARC_WIDTH = 32;

const props = defineProps<{ slices: StatsRoleSlice[] }>();

const { t } = useI18n();

/** 有成员的角色才出扇区与图例（零值扇区在图上不可见） */
const sectors = computed(() => props.slices.filter((slice) => slice.count > 0));

const total = computed(() =>
  sectors.value.reduce((acc, slice) => acc + slice.count, 0),
);

const value = (slice: StatsRoleSlice) => slice.count;
const color = (_slice: StatsRoleSlice, index: number) => chartColor(index);

function tooltip(slice: StatsRoleSlice): HTMLElement {
  return chartTooltipNode(
    slice.roleName,
    `${t("features.dashboard.chart.members")}：${slice.count}`,
  );
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div class="min-h-40 w-full flex-1">
      <DonutChart
        v-if="sectors.length > 0"
        :arc-width="ARC_WIDTH"
        :central-label="String(total)"
        :central-sub-label="t('features.dashboard.chart.totalMembers')"
        :color="color"
        :data="sectors"
        :tooltip="tooltip"
        :value="value"
        :aria-label="t('features.dashboard.chart.roles')"
      />

      <!-- 全部角色零成员时的空态（复用 DataTable 通用空态键，语言包由
           sync-locales 以 React 端为真源覆盖，本端不自造键） -->
      <div
        v-else
        class="text-muted grid h-full w-full place-items-center text-sm"
      >
        {{ t("common.datatable.empty") }}
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
          :style="`background: ${chartColor(index)}`"
        />
        <span class="text-default whitespace-nowrap">{{ slice.roleName }}</span>
        <span class="text-muted shrink-0 text-xs tabular-nums">
          {{ slice.count }}
        </span>
      </li>
    </ul>
  </div>
</template>

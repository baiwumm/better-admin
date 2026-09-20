<script setup lang="ts">
import type { StatsRoleSlice } from "@/lib/api-types";

import { VisBulletLegend } from "@unovis/vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import DonutChart from "@/components/chart/DonutChart.vue";
import { chartColor, chartTooltipNode } from "@/lib/chart-theme";

/**
 * 角色占比环形图（对齐 React 端 role-distribution-chart）：环形扇区 + 圆心成员
 * 总数 + 「圆点 + 名称 + 数量」图例。
 *
 * 图表与图例都用库内置件：圆心读数走 `VisDonut.centralLabel`（按几何算圆心，天然
 * 居中），图例走 `VisBulletLegend`。
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

/**
 * 图例项。`VisBulletLegend` 的 item 只有 name（库源码用 d3 `.text(d => d.name)`
 * 渲染，没有 value / extra 字段），所以成员数并进 name 文本。
 */
const legendItems = computed(() =>
  sectors.value.map((slice, index) => ({
    color: chartColor(index),
    name: `${slice.roleName} ${slice.count}`,
  })),
);

function tooltip(slice: StatsRoleSlice): HTMLElement {
  return chartTooltipNode(
    slice.roleName,
    `${t("features.dashboard.chart.members")}：${slice.count}`,
  );
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <!-- 图表容器必须有确定高度：库取高是 `clientHeight || config.height || 0`，
         而 flex 子项没有 flex-1 时高度是内容高、内层 h-full 又解析成 auto → 0，
         环形图会整个不画。故这里用 flex-1 撑 + min-h-40 兜底。 -->
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

    <!-- 图例根节点是块级 flex、内容左对齐：用 flex!（Tailwind v4 的 important 后缀）
         压过 emotion 未分层的 display，再 justify-center 居中。项间距由库的
         `margin-right: var(--vis-legend-item-spacing)` 决定，不要再叠 gap——
         两者会相加成双重间距，且末项的 margin-right 会让居中偏左。 -->
    <VisBulletLegend
      v-if="legendItems.length"
      :items="legendItems"
      class="flex! flex-wrap justify-center"
    />
  </div>
</template>

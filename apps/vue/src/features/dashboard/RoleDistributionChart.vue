<script setup lang="ts">
import type { StatsRoleSlice } from "@/lib/api-types";

import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { donutSlicePath } from "./chart-geometry";

/**
 * 角色占比环形图（对齐 React 端 role-distribution-chart）：SVG 环形扇区 +
 * 圆心成员总数 + 色相轮转分类色图例。
 *
 * 圆心空心即信息区（卡片与左图等高时中心不再是空洞）。
 * Tooltip 自绘跟随指针：元素常驻不卸载，只切 data-visible 的透明度，
 * 扇区间切换不闪、移出即淡出（与 React 端同一实现，绕开图表库的事件竞态）。
 *
 * 分类色全部由主色派生（恒定明度 L、彩度取品牌 0.72 倍、色相六段轮转），
 * 与 React / Next 端同一色相标度，不新增色值。弃用「主色透明度阶梯」的原因：
 * alpha 是与卡片底色混合，深色模式下低 alpha 扇区几乎与底色同化，相邻扇区
 * 无法分辨。
 */

/** 扇区色相轮转偏移（度，六段循环） */
const SLICE_HUE_OFFSETS = [0, 42, -42, 84, -84, 126];
/** 环形几何（viewBox 100 单位）：外径 / 内径 / 扇区间隙角 */
const RING = { cx: 50, cy: 50, outer: 44, inner: 34, pad: 2 };
/** Tooltip 相对指针的偏移，避免压在光标正下方 */
const TIP_OFFSET = 14;

const props = defineProps<{ slices: StatsRoleSlice[] }>();

const { t } = useI18n();
const box = ref<HTMLElement | null>(null);
const hoverIndex = ref<number | null>(null);
const lastIndex = ref(0);
const tipPos = ref({ x: 0, y: 0 });

/** 第 i 个扇区填充色：仅改色相与彩度，明度与品牌色一致 */
function sliceFill(index: number): string {
  const offset = SLICE_HUE_OFFSETS[index % SLICE_HUE_OFFSETS.length];
  const sign = offset < 0 ? "-" : "+";

  return `oklch(from var(--ui-primary) l calc(c * 0.72) calc(h ${sign} ${Math.abs(offset)}))`;
}

const sectors = computed(() => {
  const list = props.slices.filter((slice) => slice.count > 0);
  const sum = list.reduce((acc, slice) => acc + slice.count, 0);
  let angle = 0;

  return list.map((slice, index) => {
    const start = angle;
    const sweep = (slice.count / (sum || 1)) * 360;

    angle += sweep;

    return {
      ...slice,
      color: sliceFill(index),
      path: donutSlicePath(
        start,
        start + sweep,
        RING.outer,
        RING.inner,
        RING.cx,
        RING.cy,
        RING.pad,
      ),
    };
  });
});

const total = computed(() =>
  props.slices.reduce((acc, slice) => acc + slice.count, 0),
);

const shown = computed(() => {
  const slice = sectors.value[hoverIndex.value ?? lastIndex.value];

  return {
    roleName: slice?.roleName ?? "",
    count: slice?.count ?? 0,
    visible: hoverIndex.value !== null,
  };
});

function focusSlice(index: number) {
  lastIndex.value = index;
  hoverIndex.value = index;
}

function onMove(event: MouseEvent) {
  const rect = box.value?.getBoundingClientRect();

  if (rect) {
    tipPos.value = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col gap-3">
    <div
      ref="box"
      class="relative min-h-40 w-full flex-1"
      @mouseleave="hoverIndex = null"
      @mousemove="onMove"
    >
      <svg
        aria-hidden
        class="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 100 100"
      >
        <path
          v-for="(sector, index) in sectors"
          :key="sector.roleCode"
          :d="sector.path"
          :style="`fill: ${sector.color}`"
          @mouseenter="focusSlice(index)"
        />
      </svg>

      <div class="pointer-events-none absolute inset-0 grid place-items-center">
        <div class="flex flex-col items-center">
          <span class="text-highlighted text-2xl font-semibold tabular-nums">
            {{ total }}
          </span>
          <span class="text-muted text-xs">
            {{ t("features.dashboard.chart.totalMembers") }}
          </span>
        </div>
      </div>

      <div
        class="dashboard-chart-tooltip dashboard-hover-tooltip"
        :data-visible="shown.visible"
        :style="{
          transform: `translate(${tipPos.x + TIP_OFFSET}px, ${tipPos.y + TIP_OFFSET}px)`,
        }"
      >
        <p class="text-muted text-xs">{{ shown.roleName }}</p>
        <p class="text-highlighted text-xs font-semibold tabular-nums">
          {{ t("features.dashboard.chart.members") }}：{{ shown.count }}
        </p>
      </div>
    </div>

    <ul class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      <li
        v-for="sector in sectors"
        :key="sector.roleCode"
        class="flex items-center gap-1.5 text-xs"
      >
        <span
          aria-hidden
          class="size-2.5 shrink-0 rounded-full"
          :style="`background: ${sector.color}`"
        />
        <span class="text-default whitespace-nowrap">{{
          sector.roleName
        }}</span>
        <span class="text-muted shrink-0 text-xs tabular-nums">
          {{ sector.count }}
        </span>
      </li>
    </ul>
  </div>
</template>

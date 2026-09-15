<script setup lang="ts">
import type { Contribution, FormatDay } from "./github-activity-types";

import { useResizeObserver } from "@vueuse/core";
import { computed, nextTick, ref, watch } from "vue";

/**
 * 贡献热力图网格（按 rare-ui `github-activity` 的 ContributionGrid 重写）：
 * 列 = 周、按容器宽度自适应裁列；格子入场 stagger / 月份标签模糊揭示以 CSS 动画等效；
 * 单日 Tooltip 经 `<Teleport to="body">` + `<Transition>` 定位到格子上方并夹在视口内。
 */
const props = defineProps<{
  contributions: Contribution[];
  scale: { backgroundColor: string; opacity: number }[];
  cellSize: number;
  months: number;
  showMonths: boolean;
  label: string;
  reduceMotion: boolean;
  formatDay: FormatDay;
}>();

const WEEKS_PER_MONTH = 365.25 / 12 / 7;
const MIN_LABEL_WEEKS = 3;
const TOOLTIP_EDGE = 8;
const COLUMN_STAGGER_MS = 12;
const CELL_FADE_MS = 200;
const LABEL_BLUR = 6;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const gapFor = (cellSize: number) => Math.max(2, Math.round(cellSize / 4));
// 永不为零：weeks.slice(-0) 会返回全部历史而非空
const weeksFor = (months: number) =>
  Math.max(1, Math.ceil(months * WEEKS_PER_MONTH));

function toWeeks(contributions: Contribution[]) {
  const weeks: Contribution[][] = [];

  for (let i = 0; i < contributions.length; i += 7) {
    weeks.push(contributions.slice(i, i + 7));
  }

  return weeks;
}

function toMonthLabels(weeks: Contribution[][]) {
  const labels: (string | null)[] = weeks.map(() => null);
  const monthAt = (index: number) => weeks[index]?.[0]?.date.slice(5, 7);

  let start = 0;

  for (let i = 1; i <= weeks.length; i++) {
    if (i < weeks.length && monthAt(i) === monthAt(start)) continue;
    // 太短的月份段比标签本身还窄，会压到下个月
    if (i - start >= MIN_LABEL_WEEKS) {
      labels[start] = MONTH_NAMES[Number(monthAt(start)) - 1] ?? null;
    }
    start = i;
  }

  return labels;
}

const gridRef = ref<HTMLDivElement | null>(null);
const columns = ref<number>();
const gap = computed(() => gapFor(props.cellSize));

function measure() {
  const el = gridRef.value;

  if (!el) return;
  columns.value = Math.max(
    1,
    Math.floor((el.clientWidth + gap.value) / (props.cellSize + gap.value)),
  );
}

useResizeObserver(gridRef, measure);
watch([() => props.cellSize, gridRef], measure, { immediate: true });

const weeks = computed(() => toWeeks(props.contributions));
const visible = computed(() => {
  const cap = Math.min(weeks.value.length, weeksFor(props.months));

  return weeks.value.slice(-Math.min(cap, columns.value ?? cap));
});
const monthLabels = computed(() => toMonthLabels(visible.value));
/** 最后一列入场结束的时刻：月份标签在其后揭示 */
const sweepEndMs = computed(
  () => (visible.value.length - 1) * COLUMN_STAGGER_MS + CELL_FADE_MS,
);

// ---------------- Tooltip ----------------
type HoveredDay = { day: Contribution; x: number; y: number };

const hovered = ref<HoveredDay>();
const tooltipRef = ref<HTMLDivElement | null>(null);
const tooltipLeft = ref(0);

function hover(day: Contribution, event: PointerEvent) {
  const cell = (event.currentTarget as HTMLElement).getBoundingClientRect();

  hovered.value = { day, x: cell.left + cell.width / 2, y: cell.top };
}

watch(hovered, async (next) => {
  if (!next) return;
  tooltipLeft.value = next.x;
  await nextTick();
  const half = (tooltipRef.value?.offsetWidth ?? 0) / 2;
  const edge = TOOLTIP_EDGE + half;

  tooltipLeft.value = Math.min(
    Math.max(next.x, edge),
    window.innerWidth - edge,
  );
});

function cellStyle(weekIndex: number) {
  return {
    width: `${props.cellSize}px`,
    height: `${props.cellSize}px`,
    animationDelay: props.reduceMotion
      ? "0ms"
      : `${weekIndex * COLUMN_STAGGER_MS}ms`,
  };
}
</script>

<template>
  <div
    ref="gridRef"
    :aria-label="label"
    class="relative"
    data-slot="github-activity-grid"
    role="img"
  >
    <div
      v-if="showMonths"
      :class="reduceMotion ? undefined : 'ga-labels'"
      :style="{
        gap: `${gap}px`,
        marginBottom: `${gap}px`,
        animationDelay: `${reduceMotion ? 0 : sweepEndMs}ms`,
        '--ga-label-blur': `${LABEL_BLUR}px`,
      }"
      class="flex justify-center"
    >
      <div
        v-for="(month, index) in monthLabels"
        :key="index"
        :style="{ width: `${cellSize}px` }"
        class="relative h-3 shrink-0"
      >
        <span
          v-if="month"
          class="absolute top-0 left-0 text-[10px] leading-none text-muted"
        >
          {{ month }}
        </span>
      </div>
    </div>

    <div
      :style="{ gap: `${gap}px` }"
      class="flex justify-center overflow-hidden"
      @pointerleave="hovered = undefined"
    >
      <div
        v-for="(week, weekIndex) in visible"
        :key="weekIndex"
        :style="{ gap: `${gap}px` }"
        class="flex flex-col"
      >
        <div
          v-for="day in week"
          :key="day.date"
          :class="reduceMotion ? undefined : 'ga-cell'"
          :style="cellStyle(weekIndex)"
          class="shrink-0 rounded-[3px] bg-inverted/8"
          @pointerenter="hover(day, $event)"
        >
          <div
            :style="scale[day.level] ?? scale[0]"
            class="h-full w-full rounded-[3px]"
          />
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition :name="reduceMotion ? 'ga-tip-fade' : 'ga-tip'">
        <div
          v-if="hovered"
          :style="{
            left: `${tooltipLeft}px`,
            top: `${hovered.y}px`,
            transform: 'translate(-50%, calc(-100% - 8px))',
          }"
          class="pointer-events-none fixed z-50"
        >
          <div
            ref="tooltipRef"
            class="rounded-lg bg-inverted px-2 py-1 text-[11px] font-medium whitespace-nowrap text-inverted shadow-md"
          >
            {{ formatDay(hovered.day) }}
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* 格子入场：透明 + 缩放 → 实体，按列 stagger（对齐 motion initial/animate + delay） */
.ga-cell {
  animation: ga-cell-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes ga-cell-in {
  from {
    opacity: 0;
    transform: scale(0.4);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
/* 月份标签：模糊揭示，延迟到最后一列入场完成 */
.ga-labels {
  animation: ga-labels-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes ga-labels-in {
  from {
    opacity: 0;
    filter: blur(var(--ga-label-blur));
  }
  to {
    opacity: 1;
    filter: blur(0);
  }
}
.ga-tip-enter-active,
.ga-tip-leave-active {
  transition: opacity 0.14s cubic-bezier(0.22, 1, 0.36, 1);
}
.ga-tip-enter-active > div,
.ga-tip-leave-active > div {
  transition: transform 0.14s cubic-bezier(0.22, 1, 0.36, 1);
}
.ga-tip-enter-from,
.ga-tip-leave-to {
  opacity: 0;
}
/* 定位 transform 在外层，缩放过渡下沉到内层避免覆盖 */
.ga-tip-enter-from > div,
.ga-tip-leave-to > div {
  transform: scale(0.94);
}
.ga-tip-fade-enter-active,
.ga-tip-fade-leave-active {
  transition: opacity 0.01s;
}
.ga-tip-fade-enter-from,
.ga-tip-fade-leave-to {
  opacity: 0;
}
</style>

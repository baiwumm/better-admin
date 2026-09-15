<script setup lang="ts">
import type {
  Contribution,
  ContributionLevel,
  FormatDay,
  FormatHeading,
  RepoContribution,
  ToggleLabels,
} from "./github-activity-types";

import { usePreferredReducedMotion } from "@vueuse/core";
import { computed, ref, useId } from "vue";

import ContributionGrid from "./ContributionGrid.vue";

import { cn } from "@/lib/cn";

/**
 * GitHub 贡献热力图卡片（按 rare-ui `github-activity` 视觉重写，MIT）：热力图 + 仓库榜折叠面板。
 * 与 React 端差异：数据只经 props 注入（不内置 GitHub API 拉取——演示本就不请求外部 API）；
 * 面板展开用 grid-template-rows 0fr → 1fr 过渡、头像堆叠淡出、列表滑入，motion 的共享元素
 * 飞行（layoutId）不做；`formatHeading` / `formatDay` / `toggleLabels` 三个 i18n 出口与 React 端同名。
 */
const props = withDefaults(
  defineProps<{
    contributions: Contribution[];
    repos?: RepoContribution[];
    year?: number;
    accent?: string | string[];
    cellSize?: number;
    months?: number;
    showMonths?: boolean;
    label?: string;
    defaultOpen?: boolean;
    formatHeading?: FormatHeading;
    formatDay?: FormatDay;
    toggleLabels?: ToggleLabels;
    class?: string;
  }>(),
  {
    repos: () => [],
    year: undefined,
    accent: "#39d353",
    cellSize: 11,
    months: 12,
    showMonths: false,
    label: "Top contributions in:",
    defaultOpen: false,
    formatHeading: (total: number, year: number | null) =>
      `${total} contributions${year ? ` in ${year}` : ""}`,
    formatDay: (day: Contribution) => {
      const noun = day.count === 1 ? "contribution" : "contributions";
      const date = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(`${day.date}T00:00:00`));

      return `${day.count} ${noun} on ${date}`;
    },
    toggleLabels: () => ({
      show: "Show top repositories",
      hide: "Hide top repositories",
    }),
    class: undefined,
  },
);

const open = defineModel<boolean>("open");

const WEEKS_PER_MONTH = 365.25 / 12 / 7;
const STACK_LIMIT = 3;
const MIN_CARD_WIDTH = 320;
// 卡片两侧 p-4；宽度计算要加回来
const CARD_PADDING = 32;
const LEVELS = [0, 1, 2, 3, 4] as const;
const LEVEL_OPACITY: Record<ContributionLevel, number> = {
  0: 0,
  1: 0.3,
  2: 0.52,
  3: 0.76,
  4: 1,
};

const gapFor = (cellSize: number) => Math.max(2, Math.round(cellSize / 4));
const weeksFor = (months: number) =>
  Math.max(1, Math.ceil(months * WEEKS_PER_MONTH));

function toScale(accent: string | string[]) {
  if (typeof accent === "string") {
    return LEVELS.map((level) => ({
      backgroundColor: accent,
      opacity: LEVEL_OPACITY[level],
    }));
  }

  const colors = accent.length > 4 ? accent : ["transparent", ...accent];

  return LEVELS.map((level) => {
    const color = colors[level] ?? colors.at(-1) ?? "transparent";

    return { backgroundColor: color, opacity: color === "transparent" ? 0 : 1 };
  });
}

const reducedMotion = usePreferredReducedMotion();
const reduceMotion = computed(() => reducedMotion.value === "reduce");
const uid = useId();

const openState = ref(props.defaultOpen);
const isOpen = computed(() => open.value ?? openState.value);

function toggle() {
  const next = !isOpen.value;

  openState.value = next;
  open.value = next;
}

const scale = computed(() => toScale(props.accent));
const total = computed(() =>
  props.contributions.reduce((sum, day) => sum + day.count, 0),
);
const heading = computed(() => {
  const parsedYear = Number(props.contributions.at(-1)?.date.slice(0, 4));
  const displayYear =
    props.year ?? (Number.isFinite(parsedYear) ? parsedYear : null);

  return props.formatHeading(total.value, displayYear);
});

const width = computed(() => {
  const gap = gapFor(props.cellSize);
  const columns = Math.min(
    Math.ceil(props.contributions.length / 7),
    weeksFor(props.months),
  );

  return Math.max(
    MIN_CARD_WIDTH,
    columns * (props.cellSize + gap) - gap + CARD_PADDING,
  );
});

const stacked = computed(() => props.repos.slice(0, STACK_LIMIT));
</script>

<template>
  <div
    :class="
      cn(
        'relative max-w-full overflow-hidden rounded-[28px] bg-default p-4',
        repos.length > 0 && 'pb-[76px]',
        props.class,
      )
    "
    :style="{ width: `${width}px` }"
    data-slot="github-activity"
  >
    <p class="mb-4 px-1.5 text-base font-medium text-highlighted">
      {{ heading }}
    </p>

    <ContributionGrid
      :cell-size="cellSize"
      :contributions="contributions"
      :format-day="formatDay"
      :label="heading"
      :months="months"
      :reduce-motion="reduceMotion"
      :scale="scale"
      :show-months="showMonths"
    />

    <div
      v-if="repos.length > 0"
      :id="`${uid}-panel`"
      :data-state="isOpen ? 'open' : 'closed'"
      class="absolute inset-x-3 bottom-3 overflow-hidden rounded-[18px] bg-default/90 backdrop-blur-xl"
      data-slot="github-activity-panel"
    >
      <div class="flex items-center justify-between gap-3 px-4 py-3">
        <span class="truncate text-sm text-highlighted">{{ label }}</span>

        <div class="flex items-center gap-3">
          <Transition :name="reduceMotion ? 'ga-none' : 'ga-stack'">
            <div v-if="!isOpen" class="flex items-center">
              <span
                v-for="(repo, index) in stacked"
                :key="index"
                class="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-elevated text-[11px] font-medium text-muted uppercase ring-2 ring-default -ml-2 first:ml-0"
              >
                <img
                  v-if="repo.logo"
                  :src="repo.logo"
                  alt=""
                  class="size-full object-cover"
                />
                <template v-else>{{ repo.name.charAt(0) }}</template>
              </span>
            </div>
          </Transition>

          <button
            :aria-controls="`${uid}-panel`"
            :aria-expanded="isOpen"
            :aria-label="isOpen ? toggleLabels.hide : toggleLabels.show"
            class="grid size-7 shrink-0 place-items-center rounded-full bg-elevated"
            type="button"
            @click="toggle"
          >
            <svg
              :class="
                cn(
                  'size-7 text-muted',
                  !reduceMotion &&
                    'transition-transform duration-600 ease-[cubic-bezier(0.34,1.4,0.64,1)]',
                )
              "
              :style="{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m16 10-4 4-4-4" />
            </svg>
          </button>
        </div>
      </div>

      <!-- grid-template-rows 0fr → 1fr：高度可过渡的展开 / 收起 -->
      <div
        :class="
          cn(
            'grid',
            !reduceMotion &&
              'transition-[grid-template-rows] duration-600 ease-[cubic-bezier(0.34,1.2,0.64,1)]',
          )
        "
        :style="{ gridTemplateRows: isOpen ? '1fr' : '0fr' }"
      >
        <div class="min-h-0 overflow-hidden">
          <ul
            :class="
              cn(
                'px-0.5 pb-1',
                !reduceMotion &&
                  'transition-[opacity,transform] duration-500 ease-out',
                isOpen
                  ? 'translate-0 opacity-100'
                  : 'translate-x-4 translate-y-4 opacity-0',
              )
            "
          >
            <li v-for="(repo, index) in repos" :key="index">
              <component
                :is="repo.href ? 'a' : 'div'"
                :href="repo.href"
                :rel="repo.href ? 'noreferrer' : undefined"
                :target="repo.href ? '_blank' : undefined"
                class="mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-elevated"
              >
                <span
                  class="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-elevated text-[11px] font-medium text-muted uppercase ring-2 ring-default"
                >
                  <img
                    v-if="repo.logo"
                    :src="repo.logo"
                    alt=""
                    class="size-full object-cover"
                  />
                  <template v-else>{{ repo.name.charAt(0) }}</template>
                </span>
                <span class="flex-1 truncate text-sm text-highlighted">
                  {{ repo.name }}
                </span>
                <span class="text-sm text-muted tabular-nums">
                  {{ repo.count }}
                </span>
              </component>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ga-stack-enter-active,
.ga-stack-leave-active {
  transition:
    opacity 0.3s ease-out,
    transform 0.3s ease-out;
}
.ga-stack-enter-from,
.ga-stack-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  prefersReducedMotion,
  supportsViewTransition,
} from "theme-switch-animation";
import {
  ThemeAnimationDirection,
  ThemeAnimationType,
} from "theme-switch-animation/vue";

import { useDesignThemeStore } from "@/stores/design-theme-store";

import DemoControl from "../DemoControl.vue";
import DemoSection from "../DemoSection.vue";
import DemoSegmented from "../DemoSegmented.vue";
import DemoSlider from "../DemoSlider.vue";
import DemoStage from "../DemoStage.vue";
import PlaygroundPage from "../PlaygroundPage.vue";

import AlignedTrigger from "./AlignedTrigger.vue";
import AnimationTypeCard from "./AnimationTypeCard.vue";
import {
  DEMO_ANIMATION_TYPES,
  type DemoAnimationType,
} from "./animation-types";
import { themeSwitchAnimationMeta } from "./meta";
import { useDemoThemeAnimation } from "./use-demo-theme-animation";

const DURATION_RANGE = { min: 200, max: 1500, step: 50 };
const BLUR_RANGE = { min: 1, max: 10, step: 0.5 };
/** BLINDS 叶片宽度合法域（库约定 16–200px，越界静默回落默认 72） */
const SLAT_WIDTH_RANGE = { min: 16, max: 200, step: 2 };
const SLAT_WIDTH_DEFAULT = 72;

/** 消费 `direction` 选项的三种属性驱动类型（其余类型传入无效果） */
const DIRECTION_CONSUMING_TYPES: readonly DemoAnimationType[] = [
  ThemeAnimationType.BLINDS,
  ThemeAnimationType.SCAN,
  ThemeAnimationType.QR_GRID,
];

const DIRECTION_PRESETS = [
  ThemeAnimationDirection.LTR,
  ThemeAnimationDirection.RTL,
  ThemeAnimationDirection.TTB,
  ThemeAnimationDirection.BTT,
] as const;

const EASING_PRESETS = [
  { id: "ease-in-out", label: "ease-in-out" },
  { id: "cubic-bezier(0.4, 0, 0.2, 1)", label: "cubic-bezier" },
  { id: "linear", label: "linear" },
] as const;

type EasingId = (typeof EASING_PRESETS)[number]["id"];

/** `DemoSegmented` 收 `{ id, label }[]`（可变数组），由只读预设映射而来。 */
const EASING_OPTIONS: { id: EasingId; label: string }[] = EASING_PRESETS.map(
  (preset) => ({ id: preset.id, label: preset.label }),
);

/** 区块三三个触发点的水平对齐类（下标 + 1 即展示序号）。 */
const TRIGGER_ALIGNS = [
  "justify-start",
  "justify-center",
  "justify-end",
] as const;

/**
 * 演示场 › 主题切换动画：`theme-switch-animation`（View Transitions API 蒙版揭示）。
 *
 * 与项目既有主题切换（`stores/design-theme-store` 的 clip-path 四向揭示）**并存**：
 * 本页只演示库的 12 种蒙版动画，受控模式接入同一主题 store，不替换业务的主题动画实现。
 */
const { t } = useI18n();
const store = useDesignThemeStore();

const animationType = ref<DemoAnimationType>(ThemeAnimationType.CIRCLE);
const duration = ref(750);
const easing = ref<EasingId>("ease-in-out");
const blurAmount = ref(2);
const direction = ref<ThemeAnimationDirection>(ThemeAnimationDirection.LTR);
const slatWidth = ref(SLAT_WIDTH_DEFAULT);

/** `DemoSegmented` 收 `{ id, label }[]`（可变数组），方向文案走 i18n 动态映射。 */
const DIRECTION_OPTIONS = computed(() =>
  DIRECTION_PRESETS.map((preset) => ({
    id: preset,
    label: t(`features.playground.themeSwitchAnimation.direction.${preset}`),
  })),
);

// 区块二专属实例：以当前参数触发一次切换
const {
  isAnimating: paramsAnimating,
  triggerRef: paramsTriggerRef,
  toggle: toggleParams,
} = useDemoThemeAnimation<HTMLDivElement>(() => ({
  animationType: animationType.value,
  blurAmount: blurAmount.value,
  direction: direction.value,
  duration: duration.value,
  easing: easing.value,
  slatWidth: slatWidth.value,
}));

/** 与页头主题选择器、Logo 深浅色同一状态源，演示页切换后全站同步。 */
const isDark = computed(() => store.isDark);

function selectAnimationType(type: DemoAnimationType): void {
  animationType.value = type;
}

// 区块四：能力探测只在客户端执行（渲染阶段不触碰 window / document）
const env = ref<{ reduced: boolean; supported: boolean } | null>(null);

onMounted(() => {
  env.value = {
    reduced: prefersReducedMotion(window),
    supported: supportsViewTransition(document),
  };
});
</script>

<template>
  <PlaygroundPage :meta="themeSwitchAnimationMeta">
    <!-- 区块一：12 种动画类型，逐类型点击体验（圆钮即扩散圆心，网格不同位置即不同起点） -->
    <DemoSection
      :description="
        t('features.playground.themeSwitchAnimation.gridDescription')
      "
      :title="t('features.playground.themeSwitchAnimation.gridTitle')"
    >
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimationTypeCard
          v-for="(item, index) in DEMO_ANIMATION_TYPES"
          :key="item.type"
          :blur-amount="blurAmount"
          :direction="direction"
          :duration="duration"
          :easing="easing"
          :hint-key="item.hintKey"
          :icon="item.icon"
          :index="index"
          :slat-width="slatWidth"
          :type="item.type"
        />
      </div>
    </DemoSection>

    <!-- 区块二：选中一种动画并调节时长 / 缓动 / 模糊强度 / 方向 / 叶宽，再以该参数触发一次切换 -->
    <DemoSection
      :description="
        t('features.playground.themeSwitchAnimation.paramsDescription')
      "
      :title="t('features.playground.themeSwitchAnimation.paramsTitle')"
    >
      <template #controls>
        <DemoControl :label="t('features.playground.common.duration')">
          <DemoSlider
            v-model="duration"
            :format-options="{ style: 'unit', unit: 'millisecond' }"
            :label="t('features.playground.common.duration')"
            :max="DURATION_RANGE.max"
            :min="DURATION_RANGE.min"
            :step="DURATION_RANGE.step"
          />
        </DemoControl>
        <DemoControl
          :label="t('features.playground.themeSwitchAnimation.easing')"
        >
          <DemoSegmented
            v-model="easing"
            :label="t('features.playground.themeSwitchAnimation.easing')"
            :options="EASING_OPTIONS"
          />
        </DemoControl>
        <DemoControl
          v-if="animationType === ThemeAnimationType.CIRCLE_BLUR"
          :label="t('features.playground.themeSwitchAnimation.blurAmount')"
        >
          <DemoSlider
            v-model="blurAmount"
            :label="t('features.playground.themeSwitchAnimation.blurAmount')"
            :max="BLUR_RANGE.max"
            :min="BLUR_RANGE.min"
            :step="BLUR_RANGE.step"
          />
        </DemoControl>
        <DemoControl
          v-if="DIRECTION_CONSUMING_TYPES.includes(animationType)"
          :label="t('features.playground.themeSwitchAnimation.direction')"
        >
          <DemoSegmented
            v-model="direction"
            :label="t('features.playground.themeSwitchAnimation.direction')"
            :options="DIRECTION_OPTIONS"
          />
        </DemoControl>
        <DemoControl
          v-if="animationType === ThemeAnimationType.BLINDS"
          :label="t('features.playground.themeSwitchAnimation.slatWidth')"
        >
          <!-- 像素值不传 format-options：Intl 单位无 "pixel"，传入会抛 RangeError -->
          <DemoSlider
            v-model="slatWidth"
            :label="t('features.playground.themeSwitchAnimation.slatWidth')"
            :max="SLAT_WIDTH_RANGE.max"
            :min="SLAT_WIDTH_RANGE.min"
            :step="SLAT_WIDTH_RANGE.step"
          />
        </DemoControl>
      </template>

      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1.5">
          <span class="text-muted text-xs">
            {{ t("features.playground.themeSwitchAnimation.animationType") }}
          </span>
          <div class="flex flex-wrap gap-2">
            <UButton
              v-for="item in DEMO_ANIMATION_TYPES"
              :key="item.type"
              :aria-label="item.type"
              :label="item.type"
              :variant="item.type === animationType ? 'solid' : 'outline'"
              class="font-mono text-xs"
              size="sm"
              @click="selectAnimationType(item.type)"
            />
          </div>
        </div>
        <div ref="paramsTriggerRef" class="flex">
          <UButton
            :disabled="paramsAnimating"
            :label="t('features.playground.themeSwitchAnimation.triggerLabel')"
            color="neutral"
            icon="i-lucide-wand-sparkles"
            variant="soft"
            @click="toggleParams"
          />
        </div>
      </div>
    </DemoSection>

    <!-- 区块三：同一动画类型、三个水平位置不同的触发点，验证圆心跟随触发元素中心 -->
    <DemoSection
      :description="
        t('features.playground.themeSwitchAnimation.pointDescription')
      "
      :title="t('features.playground.themeSwitchAnimation.pointTitle')"
    >
      <DemoStage class="flex-col items-stretch justify-between gap-6">
        <AlignedTrigger
          v-for="(align, position) in TRIGGER_ALIGNS"
          :key="align"
          :align="align"
          :animation-type="animationType"
          :blur-amount="blurAmount"
          :direction="direction"
          :duration="duration"
          :easing="easing"
          :index="position + 1"
          :slat-width="slatWidth"
        />
      </DemoStage>
    </DemoSection>

    <!-- 区块四：运行环境与降级行为，以及「回到跟随系统」的收尾入口 -->
    <DemoSection
      :description="
        t('features.playground.themeSwitchAnimation.envDescription')
      "
      :title="t('features.playground.themeSwitchAnimation.envTitle')"
    >
      <template #controls>
        <UButton
          :label="t('features.playground.themeSwitchAnimation.resetToSystem')"
          color="neutral"
          icon="i-lucide-monitor"
          size="sm"
          variant="soft"
          @click="store.applyThemeModeInstant('system')"
        />
      </template>

      <div class="flex flex-wrap items-center gap-3 text-xs">
        <span
          class="border-default flex items-center gap-1.5 rounded-full border px-3 py-1"
        >
          <span
            :class="[
              'size-2 rounded-full',
              env?.supported ? 'bg-success' : 'bg-error',
            ]"
          />
          {{
            t(
              env?.supported
                ? "features.playground.themeSwitchAnimation.supported"
                : "features.playground.themeSwitchAnimation.unsupported",
            )
          }}
        </span>
        <span
          class="border-default flex items-center gap-1.5 rounded-full border px-3 py-1"
        >
          <span
            :class="[
              'size-2 rounded-full',
              env?.reduced ? 'bg-warning' : 'bg-accented',
            ]"
          />
          {{
            t(
              env?.reduced
                ? "features.playground.themeSwitchAnimation.reduceMotion"
                : "features.playground.themeSwitchAnimation.reduceMotionOff",
            )
          }}
        </span>
        <span
          class="border-default flex items-center gap-1.5 rounded-full border px-3 py-1"
        >
          <UIcon
            :name="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
            class="size-3.5"
          />
          {{
            t(
              isDark
                ? "features.playground.themeSwitchAnimation.currentTheme.dark"
                : "features.playground.themeSwitchAnimation.currentTheme.light",
            )
          }}
        </span>
      </div>
      <p class="text-muted text-xs">
        {{ t("features.playground.themeSwitchAnimation.fallbackNote") }}
      </p>
    </DemoSection>
  </PlaygroundPage>
</template>

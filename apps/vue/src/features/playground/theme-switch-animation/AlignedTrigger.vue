<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { ThemeAnimationDirection } from "theme-switch-animation/vue";

import { cn } from "@/lib/cn";

import type { DemoAnimationType } from "./animation-types";
import { useDemoThemeAnimation } from "./use-demo-theme-animation";

/**
 * 区块三的一个触发点：同一动画类型、水平位置不同，验证「扩散圆心跟随触发元素中心」。
 * 每个触发点各自持有一个 `useThemeAnimation` 实例。
 */
const props = defineProps<{
  /** 水平对齐类（justify-start / justify-center / justify-end） */
  align: string;
  /** 展示序号（从 1 开始） */
  index: number;
  animationType: DemoAnimationType;
  duration: number;
  easing: string;
  blurAmount: number;
  /** 扫描方向，仅 BLINDS / SCAN / QR_GRID 消费 */
  direction: ThemeAnimationDirection;
  /** 百叶窗叶片宽度 px，仅 BLINDS 消费 */
  slatWidth: number;
}>();

const { t } = useI18n();

const { isAnimating, triggerRef, toggle } =
  useDemoThemeAnimation<HTMLDivElement>(() => ({
    animationType: props.animationType,
    blurAmount: props.blurAmount,
    direction: props.direction,
    duration: props.duration,
    easing: props.easing,
    slatWidth: props.slatWidth,
  }));
</script>

<template>
  <div :class="cn('flex', align)">
    <div ref="triggerRef">
      <UButton
        :disabled="isAnimating"
        :label="
          t('features.playground.themeSwitchAnimation.pointLabel', { index })
        "
        color="neutral"
        size="sm"
        variant="soft"
        @click="toggle"
      />
    </div>
  </div>
</template>

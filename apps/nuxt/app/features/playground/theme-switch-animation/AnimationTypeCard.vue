<script setup lang="ts">
import type { DemoAnimationType } from './animation-types'

import { computed } from 'vue'

import { DEMO_ACCENTS } from '../demo-palette'

import { useDemoThemeAnimation } from './use-demo-theme-animation'

/**
 * 单张动画类型卡：左侧形状示意图标 + 中间类型名与提示 + 右侧圆形触发按钮。
 *
 * 卡片本身**不是**触发点——只有右侧圆钮可点（避免整卡误触，也让「扩散圆心」在视觉上
 * 指向一个明确的圆）。每张卡各自持有一个 `useThemeAnimation` 实例（组件即实例边界）。
 */
const props = defineProps<{
  type: DemoAnimationType
  hintKey: string
  /** Lucide 图标名（`i-lucide-*`） */
  icon: string
  index: number
  duration: number
  easing: string
  blurAmount: number
}>()

const { t } = useI18n()

const { isAnimating, isDark, triggerRef, toggle }
  = useDemoThemeAnimation<HTMLDivElement>(() => ({
    animationType: props.type,
    blurAmount: props.blurAmount,
    duration: props.duration,
    easing: props.easing
  }))

// 强调色按数组下标循环取演示色板：色板是演示参数值（见 demo-palette.ts 注释），
// 卡片结构与交互一律走项目 Design Token，不引入第二套视觉变量。
const accent = computed(() => DEMO_ACCENTS[props.index % DEMO_ACCENTS.length])

const actionLabel = computed(() =>
  t(
    isDark.value
      ? 'features.playground.themeSwitchAnimation.switchToLight'
      : 'features.playground.themeSwitchAnimation.switchToDark'
  )
)
</script>

<template>
  <div
    class="border-default bg-default/40 flex items-center gap-3 rounded-2xl border p-3"
  >
    <span
      class="grid size-10 shrink-0 place-items-center rounded-xl"
      :style="{
        backgroundImage: `linear-gradient(135deg, ${accent}33, ${accent}12)`,
        color: accent
      }"
    >
      <UIcon
        :name="icon"
        class="size-5"
      />
    </span>

    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <!-- 类型名是技术专名，保留英文不译；提示文案走 i18n -->
      <span class="font-mono text-xs font-medium">{{ type }}</span>
      <span class="text-muted text-xs leading-snug">{{ t(hintKey) }}</span>
    </div>

    <!--
      渐变描边圆钮：外层 p-px 只留 1px 渐变环，内层按钮以 bg-default 实心底遮出圆面。
      Nuxt UI 按钮内部样式经 tv() 的 tailwind-merge 归并，class 里的
      size-10 / rounded-full / p-0 能稳定覆盖默认的圆角与内边距，得到正圆；
      justify-center 必须显式声明——UButton 基础类只有 items-center（垂直居中），
      水平居中类仅 block 变体提供，p-0 清掉默认左右 padding 后图标会贴左。
      ref 挂外层：与按钮同心、尺寸仅差 1px 环，库取该元素 rect 中心即按钮圆心，
      不依赖 UButton 的 ref 透传实现。
    -->
    <div
      ref="triggerRef"
      class="shrink-0 rounded-full p-px"
      :style="{
        backgroundImage: `linear-gradient(135deg, ${accent}e6, ${accent}4d)`
      }"
    >
      <UButton
        :aria-label="`${type} · ${actionLabel}`"
        :disabled="isAnimating"
        :icon="isDark ? 'i-lucide-moon' : 'i-lucide-sun'"
        class="bg-default text-default size-10 justify-center rounded-full p-0 shadow-sm hover:shadow-md"
        color="neutral"
        variant="ghost"
        @click="toggle"
      />
    </div>
  </div>
</template>

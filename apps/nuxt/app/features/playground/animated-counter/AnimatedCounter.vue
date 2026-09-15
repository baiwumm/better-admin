<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

import AnimatedCounterDigit from './AnimatedCounterDigit.vue'
import {
  format,
  measure,
  toCells,
  type Grouping
} from './animated-counter-utils'

import { cn } from '@/lib/cn'

/**
 * 数字滚动计数器（按 rare-ui `animated-counter` 视觉重写，MIT）。
 * 与 React 端差异：motion 的 layout / AnimatePresence popLayout 改为 Vue `<TransitionGroup>`
 * 内置 FLIP（`.ac-move`）+ 进出场淡入淡出；每列滚轮见 AnimatedCounterDigit.vue。零 npm 依赖。
 */
const props = withDefaults(
  defineProps<{
    value: number
    decimals?: number
    duration?: number
    padStart?: number
    separator?: string
    decimalSeparator?: string
    grouping?: Grouping
    prefix?: string
    suffix?: string
    class?: string
  }>(),
  {
    decimals: 0,
    duration: 0.6,
    padStart: 1,
    separator: ',',
    decimalSeparator: '.',
    grouping: 'western',
    prefix: undefined,
    suffix: undefined,
    class: undefined
  }
)

const reducedMotion = usePreferredReducedMotion()
const reduced = computed(() => reducedMotion.value === 'reduce')

const shape = computed(() =>
  measure(props.value, props.decimals, props.padStart, props.duration)
)
const chars = computed(() =>
  format(shape.value, props.separator, props.decimalSeparator, props.grouping)
)
const cells = computed(() => toCells(chars.value, shape.value.width))
const negative = computed(
  () => shape.value.amount < 0 && shape.value.scaled > 0
)

// 变化方向：递减时滚轮反向（绕远路）
const dir = ref(1)

watch(
  () => shape.value.amount,
  (next, prev) => {
    dir.value = next >= prev ? 1 : -1
  }
)

// 挂载时各列的起始面；后出现的列从 0 滚入
const seed: Record<number, number> = {}

for (const cell of cells.value) {
  if (cell.kind === 'digit') seed[cell.key] = cell.digit
}

const moveStyle = computed(() => ({
  '--ac-duration': reduced.value ? '0s' : `${shape.value.pace}s`
}))
</script>

<template>
  <span
    :class="cn('inline-flex items-center tabular-nums', props.class)"
    :style="moveStyle"
    data-slot="animated-counter"
  >
    <span
      v-if="prefix != null || $slots.prefix"
      class="inline-block"
    >
      <slot name="prefix">{{ prefix }}</slot>
    </span>

    <span class="sr-only">{{ negative ? "-" : "" }}{{ chars }}</span>

    <span
      aria-hidden="true"
      class="inline-flex select-none items-center"
    >
      <span
        v-if="negative"
        class="inline-block"
      >-</span>
      <TransitionGroup
        class="relative inline-flex items-center"
        name="ac"
        tag="span"
      >
        <template
          v-for="cell in cells"
          :key="cell.key"
        >
          <AnimatedCounterDigit
            v-if="cell.kind === 'digit'"
            :digit="cell.digit"
            :dir="dir"
            :duration="shape.pace"
            :from="seed[cell.key] ?? 0"
            :reduced="reduced"
          />
          <span
            v-else
            class="inline-block"
            data-slot="animated-counter-mark"
          >{{
            cell.char
          }}</span>
        </template>
      </TransitionGroup>
    </span>

    <span
      v-if="suffix != null || $slots.suffix"
      class="inline-block"
    >
      <slot name="suffix">{{ suffix }}</slot>
    </span>
  </span>
</template>

<style scoped>
/*
 * FLIP 位移 / 进出场过渡分声明：各自只声明实际会变化的属性，transitionend 与 Vue Transition
 * 的等待计数精确对应（不落到其按最长时长的超时兜底）——move 只管 transform，enter / leave 只管 opacity。
 */
.ac-move {
  transition: transform var(--ac-duration) cubic-bezier(0.22, 1, 0.36, 1);
}
.ac-enter-active {
  transition: opacity var(--ac-duration) ease-out;
}
.ac-leave-active {
  transition: opacity 0.18s cubic-bezier(0.22, 1, 0.36, 1);
  /* 离场元素脱离文档流，其余列的 FLIP 才能立即计算终点 */
  position: absolute;
}
.ac-enter-from,
.ac-leave-to {
  opacity: 0;
}
</style>

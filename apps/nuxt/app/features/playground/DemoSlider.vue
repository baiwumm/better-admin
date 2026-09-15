<script setup lang="ts">
import { computed } from 'vue'

import { cn } from '@/lib/cn'

/**
 * 带输出值的紧凑滑块（单值，对齐 React 端 `DemoSlider`）。
 * Nuxt UI `USlider` 无 output 槽位，输出值以 `Intl.NumberFormat` 按当前语言格式化后并排展示。
 */
const props = withDefaults(
  defineProps<{
    label: string
    min: number
    max: number
    step?: number
    formatOptions?: Intl.NumberFormatOptions
    class?: string
  }>(),
  { step: 1, formatOptions: undefined, class: undefined }
)

const model = defineModel<number>({ required: true })

const { locale } = useI18n()

const output = computed(() =>
  new Intl.NumberFormat(locale.value, props.formatOptions).format(model.value)
)

function onUpdate(value: number | number[] | undefined) {
  if (value === undefined) return
  model.value = Array.isArray(value) ? (value[0] ?? model.value) : value
}
</script>

<template>
  <div :class="cn('flex w-48 items-center gap-3', props.class)">
    <USlider
      :aria-label="label"
      :max="max"
      :min="min"
      :model-value="model"
      :step="step"
      class="flex-1"
      size="sm"
      @update:model-value="onUpdate"
    />
    <span class="shrink-0 text-xs text-muted tabular-nums">{{ output }}</span>
  </div>
</template>

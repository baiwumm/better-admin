<script setup lang="ts">
import { cn } from '@/lib/cn'

/**
 * 颜色色板单选（对齐 React 端 HeroUI `ColorSwatchPicker`）。
 * Nuxt UI 仅有完整取色器 `UColorPicker`、无预设色板单选组件，故按 §21 优先级以原生
 * radiogroup 语义自定义：圆形色块 + 选中态外环，键盘方向键可达。
 */
defineProps<{
  label: string
  colors: readonly string[]
}>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <div
    :aria-label="label"
    class="flex items-center gap-2"
    role="radiogroup"
  >
    <button
      v-for="color in colors"
      :key="color"
      :aria-checked="model === color"
      :aria-label="color"
      :class="
        cn(
          'size-6 rounded-full ring-2 ring-offset-2 ring-offset-default transition-[transform,box-shadow] duration-150 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          model === color ? 'ring-highlighted' : 'ring-transparent'
        )
      "
      :style="{ backgroundColor: color }"
      role="radio"
      type="button"
      @click="model = color"
    />
  </div>
</template>

<script setup lang="ts">
import { cn } from '@/lib/cn'

/** 演示内容的展示台：居中、留白、浅底，供 orb / 计数器等视觉组件落位。 */
defineProps<{ class?: string }>()
</script>

<template>
  <div
    :class="
      cn(
        'flex min-h-40 flex-wrap items-center justify-center gap-6 rounded-3xl bg-elevated/60 p-6',
        $props.class
      )
    "
  >
    <slot />
  </div>
</template>

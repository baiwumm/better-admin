<script setup lang="ts">
import { cn } from "@/lib/cn";

/**
 * 单个演示区块：标题 / 描述 + 可选控件栏（`controls` slot，自动换行）+ 演示内容，统一各页视觉。
 * 对齐 React 端 `DemoSection`，卡片用 Nuxt UI `UCard`。
 */
defineProps<{
  title: string;
  description?: string;
  /** 演示内容容器附加类 */
  contentClass?: string;
}>();

const slots = defineSlots<{
  default(): unknown;
  controls?(): unknown;
}>();
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-col gap-1">
        <h3 class="font-bold text-highlighted">{{ title }}</h3>
        <p v-if="description" class="text-xs text-muted">{{ description }}</p>
      </div>
    </template>
    <div class="flex flex-col gap-4">
      <div
        v-if="slots.controls"
        class="flex flex-wrap items-end gap-x-4 gap-y-3"
      >
        <slot name="controls" />
      </div>
      <div :class="cn('flex flex-col gap-4', contentClass)">
        <slot />
      </div>
    </div>
  </UCard>
</template>

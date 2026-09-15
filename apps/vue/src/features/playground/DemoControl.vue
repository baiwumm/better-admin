<script setup lang="ts">
import { cn } from "@/lib/cn";

/** 控件栏内的单个带标签控件。 */
defineProps<{ label: string; class?: string }>();
</script>

<template>
  <div :class="cn('flex flex-col gap-1.5', $props.class)">
    <span class="text-xs text-muted">{{ label }}</span>
    <slot />
  </div>
</template>

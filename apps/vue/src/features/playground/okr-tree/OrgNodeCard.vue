<script setup lang="ts">
import { computed } from "vue";
import type { TreeNode } from "vue3-okr-tree";

import type { OrgNodeData } from "./okr-tree-data";

/**
 * 组织架构节点卡片（unstyled 模式下的自有外观，随 Nuxt UI 语义类明暗切换）。
 * 对齐 React 基准 `OrgNodeCard`：w-44、根节点带 building 图标、负责人 + 人数行。
 */
const { node, data } = defineProps<{
  node: TreeNode;
  data: OrgNodeData;
}>();

const isRoot = computed(() => node.level === 1);
</script>

<template>
  <div
    class="flex w-44 flex-col gap-1 rounded-xl border bg-elevated p-3 text-left shadow-sm transition-colors"
    :class="node.isCurrent ? 'border-primary' : 'border-default'"
  >
    <div class="flex items-center gap-1.5">
      <UIcon
        v-if="isRoot"
        aria-hidden
        class="size-3.5 shrink-0 text-primary"
        name="i-lucide-building-2"
      />
      <span class="text-highlighted truncate text-sm font-medium">
        {{ data.label }}
      </span>
    </div>
    <div class="text-muted flex items-center justify-between gap-2 text-xs">
      <span class="truncate">{{ data.leader }}</span>
      <span class="shrink-0 tabular-nums">{{ data.count }}</span>
    </div>
  </div>
</template>

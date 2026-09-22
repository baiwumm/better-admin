<script setup lang="ts">
import { computed } from 'vue'
import type { TreeNode } from 'vue3-okr-tree'

import type { OkrNodeData } from './okr-tree-data'

/**
 * OKR 节点卡片。对齐 React 基准 `OkrNodeCard`：根 = 目标 O（accent 描边加宽），
 * 右树二级 = KR（常规卡片），左树 = 关键举措（虚线描边弱化）；带进度条。
 */
const { node, data } = defineProps<{
  node: TreeNode
  data: OkrNodeData
}>()

const isLeft = computed(() => node.isLeftChild)
const isRoot = computed(() => !node.isLeftChild && node.level === 1)
</script>

<template>
  <div
    class="flex flex-col gap-1.5 rounded-xl border bg-elevated p-3 text-left shadow-sm"
    :class="[
      isLeft
        ? 'w-40 border-dashed bg-elevated/40'
        : isRoot
          ? 'w-60 border-primary'
          : 'w-52 border-default'
    ]"
  >
    <div class="flex items-center justify-between gap-2">
      <span
        class="text-highlighted truncate"
        :class="isRoot ? 'text-sm font-semibold' : 'text-xs font-medium'"
      >
        {{ data.label }}
      </span>
      <span
        v-if="data.meta"
        class="text-muted shrink-0 text-xs"
      >
        {{ data.meta }}
      </span>
    </div>
    <div
      v-if="typeof data.progress === 'number'"
      class="bg-default h-1 overflow-hidden rounded-full"
    >
      <div
        class="bg-primary h-full rounded-full"
        :style="{ width: `${data.progress}%` }"
      />
    </div>
  </div>
</template>

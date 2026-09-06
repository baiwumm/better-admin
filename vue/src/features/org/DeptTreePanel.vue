<script setup lang="ts">
import type { DeptSortItem, DeptTreeNode } from "@/lib/api-types";

import { useI18n } from "vue-i18n";

import DeptTree from "./DeptTree.vue";

/**
 * 组织树面板（组织管理 / 人员通讯录共用，对应 React 端 dept-tree-panel.tsx）：
 * 标题 + 计数 + 头部操作区 + 加载骨架屏 + 空态 + DeptTree。
 *
 * - 骨架屏与树行同形（展开箭头 + 名称条，逐行缩进模拟层级）；
 * - canReorder / onReorder 仅组织管理使用（同级拖拽排序）；
 * - headerAction / emptyAction 为插槽：头部操作区与空态操作区由页面按
 *   各自权限语义传入。
 */
withDefaults(
  defineProps<{
    nodes: DeptTreeNode[];
    isLoading: boolean;
    /** 有数据时的刷新遮罩（增删改/排序后 refetch 全程可见，数据保留不闪白） */
    isFetching?: boolean;
    selectedId: string | null;
    /** 同级拖拽排序（可选；通讯录不启用） */
    canReorder?: boolean;
    /** 空态主文案（如「暂无组织」） */
    emptyTitle: string;
  }>(),
  { isFetching: false, canReorder: false },
);

const emit = defineEmits<{
  select: [node: DeptTreeNode];
  reorder: [items: DeptSortItem[]];
}>();

const { t } = useI18n();
</script>

<script lang="ts">
export default { name: "DeptTreePanel" };
</script>

<template>
  <UCard class="flex flex-col gap-3 rounded-3xl p-4" variant="outline">
    <div class="flex items-center justify-between gap-2">
      <span class="text-sm font-medium">
        {{ t("features.depts.tree.title") }}
        <span class="text-muted ms-1">({{ nodes.length }})</span>
      </span>
      <slot name="header-action" />
    </div>

    <!-- 骨架屏：与树行同形的占位（展开箭头 + 名称条，逐行缩进模拟层级） -->
    <div v-if="isLoading" class="flex flex-col gap-1">
      <div
        v-for="index in 6"
        :key="index"
        :style="{ paddingInlineStart: ((index - 1) % 3) * 16 + 8 }"
        class="flex items-center gap-2 rounded-xl py-2"
      >
        <USkeleton class="size-3.5 rounded" />
        <USkeleton
          :style="{ width: `${52 - ((index - 1) % 3) * 8}%` }"
          class="h-3.5 rounded-md"
        />
      </div>
    </div>

    <div
      v-else-if="nodes.length === 0"
      class="text-muted flex flex-col items-center justify-center gap-2 py-8"
    >
      <p class="text-sm">{{ emptyTitle }}</p>
      <slot name="empty-action" />
    </div>

    <div v-else class="relative">
      <!-- 树刷新遮罩：增删改/排序后 refetch 全程可见（数据保留不闪白） -->
      <div
        v-if="isFetching"
        class="bg-default/30 absolute inset-0 z-10 grid place-items-center rounded-xl backdrop-blur-[1px]"
      >
        <UIcon
          class="size-6 animate-spin text-muted"
          name="i-lucide-loader-circle"
        />
      </div>
      <DeptTree
        :can-reorder="canReorder"
        :nodes="nodes"
        :selected-id="selectedId"
        @reorder="emit('reorder', $event)"
        @select="emit('select', $event)"
      />
    </div>
  </UCard>
</template>

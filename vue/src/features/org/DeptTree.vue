<script setup lang="ts">
import type { DeptSortItem, DeptTreeNode } from "@/lib/api-types";

import { ref } from "vue";

import DeptTreeItem from "./DeptTreeItem.vue";

/**
 * 组织树（左栏，对应 React 端 dept-tree.tsx）：递归渲染 DeptTreeNode，
 * 支持展开/收起与同级拖拽排序（vue-draggable-plus，对应 React 端 @dnd-kit）。
 *
 * - 展开状态用 Set<string> | null 表达（null = 全展开默认态，随数据动态生效）；
 * - 每组兄弟节点各挂一个 useSortable 实例（不设 group → 仅组内排序，
 *   嵌套子容器不参与），拖拽结束由页面回调整组新顺序
 *   （整组重编号 sort = len-1-idx，数字越大越靠前）；
 * - 拖拽结束先撤销 sortablejs 的 DOM 移动再回调提交：DOM 顺序始终由
 *   数据驱动，提交后失效树缓存 refetch 回真实状态（失败自动回拉）；
 * - 停用组织整行置灰 + 「停用」角标；拖拽把手仅 canReorder 时渲染。
 */

export interface DeptTreeProps {
  nodes: DeptTreeNode[];
  selectedId: string | null;
  canReorder: boolean;
  onSelect: (node: DeptTreeNode) => void;
  /** 同级拖拽结束：整组按新顺序提交（含未移动的兄弟节点，保证编号一致） */
  onReorder: (items: DeptSortItem[]) => void;
}

const props = defineProps<DeptTreeProps>();

/** 展开集合：null = 全展开（默认态） */
const expanded = ref<Set<string> | null>(null);

function collectIds(nodes: DeptTreeNode[], acc: string[] = []): string[] {
  for (const node of nodes) {
    acc.push(node.id);
    collectIds(node.children, acc);
  }

  return acc;
}

function handleToggle(id: string) {
  if (expanded.value === null) {
    // 从「全展开」切换到显式集合：先收录全部节点 id 再移除目标
    expanded.value = new Set(
      collectIds(props.nodes).filter((nodeId) => nodeId !== id),
    );

    return;
  }

  const next = new Set(expanded.value);

  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  expanded.value = next;
}
</script>

<script lang="ts">
export default { name: "DeptTree" };
</script>

<template>
  <DeptTreeItem
    v-for="node in props.nodes"
    :key="node.id"
    :can-reorder="props.canReorder"
    :depth="0"
    :expanded="expanded"
    :node="node"
    :selected-id="props.selectedId"
    @select="props.onSelect"
    @toggle="handleToggle"
  />
</template>

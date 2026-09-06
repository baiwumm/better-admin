<script setup lang="ts">
import type { DeptSortItem, DeptTreeNode } from "@/lib/api-types";

import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { VueDraggable } from "vue-draggable-plus";

/**
 * 组织树节点（递归组件）：行渲染 + 子列表容器。
 * 子列表用 <VueDraggable>（vue-draggable-plus 组件形态）实现同级拖拽：
 * - 组件随 v-if 天然挂卸（hook 形态的 Sortable 实例在动态容器上会泄漏，
 *   实测破坏页面渲染调度——按钮点击后视图不更新）；
 * - 本地镜像数组承接拖拽后的顺序（乐观 UI），props.children 变化
 *   （提交后 refetch 回来）时重置，DOM 顺序始终跟随数据；
 * - handle 限定拖拽把手；不设 group → 仅组内排序，嵌套子容器不参与；
 * - 拖拽结束整组重编号（sort = len-1-idx，数字越大越靠前）回调提交。
 */
const props = defineProps<{
  node: DeptTreeNode;
  depth: number;
  selectedId: string | null;
  /** null = 全展开（默认态） */
  expanded: Set<string> | null;
  canReorder: boolean;
}>();

const emit = defineEmits<{
  select: [node: DeptTreeNode];
  toggle: [id: string];
  reorder: [items: DeptSortItem[]];
}>();

const { t } = useI18n();

const hasChildren = computed(() => props.node.children.length > 0);
// null = 全展开（默认态）
const isExpanded = () =>
  props.expanded === null || props.expanded.has(props.node.id);
const isSelected = () => props.node.id === props.selectedId;

// ---- 同级拖拽（本地镜像数组） ----

const localChildren = ref<DeptTreeNode[]>([...props.node.children]);

watch(
  () => props.node.children,
  (children) => {
    localChildren.value = [...children];
  },
);

function onDragEnd() {
  emit(
    "reorder",
    localChildren.value.map((sibling, idx) => ({
      id: sibling.id,
      parentId: props.node.id,
      sort: localChildren.value.length - 1 - idx,
    })),
  );
}

function onHandleClick(event: MouseEvent) {
  // 点击把手（未达拖拽阈值）不触发整行的展开/收起与选中
  event.stopPropagation();
}
</script>

<script lang="ts">
export default { name: "DeptTreeItem" };
</script>

<template>
  <div class="mb-1">
    <div
      :aria-pressed="isSelected()"
      :class="[
        'group flex w-full cursor-pointer items-center gap-1 rounded-xl py-2 pe-2 text-start transition-colors',
        isSelected() ? 'bg-elevated' : 'hover:bg-elevated/60',
        props.node.status === 'disabled' && 'text-muted',
      ]"
      :style="{ paddingInlineStart: props.depth * 16 + 8 }"
      role="button"
      tabindex="0"
      @click="emit('select', props.node)"
      @keydown.enter.prevent="emit('select', props.node)"
      @keydown.space.prevent="emit('select', props.node)"
    >
      <button
        v-if="props.canReorder"
        :aria-label="t('features.depts.tree.dragHandle')"
        class="text-muted rounded p-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
        data-drag-handle
        type="button"
        @click="onHandleClick"
      >
        <UIcon class="size-3.5" name="i-lucide-grip-vertical" />
      </button>
      <button
        :aria-label="
          isExpanded()
            ? t('features.depts.tree.collapse')
            : t('features.depts.tree.expand')
        "
        :class="!hasChildren && 'invisible'"
        class="text-muted hover:text-default rounded p-0.5 transition-colors"
        type="button"
        @click.stop="
          () => {
            if (hasChildren) emit('toggle', props.node.id);
          }
        "
      >
        <UIcon
          :class="isExpanded() && 'rotate-90'"
          class="size-3.5 transition-transform duration-200 ease-out"
          name="i-lucide-chevron-right"
        />
      </button>
      <span class="min-w-0 flex-1 truncate text-sm">{{ props.node.name }}</span>
      <span
        v-if="props.node.status === 'disabled'"
        class="text-muted shrink-0 text-xs"
      >
        {{ t("features.depts.status.disabled") }}
      </span>
    </div>

    <VueDraggable
      v-if="isExpanded() && hasChildren"
      v-model="localChildren"
      :animation="150"
      :handle="props.canReorder ? '[data-drag-handle]' : 'body[data-none]'"
      class="flex flex-col"
      tag="div"
      @end="onDragEnd"
    >
      <DeptTreeItem
        v-for="child in localChildren"
        :key="child.id"
        :can-reorder="props.canReorder"
        :depth="props.depth + 1"
        :expanded="props.expanded"
        :node="child"
        :selected-id="props.selectedId"
        @reorder="emit('reorder', $event)"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
      />
    </VueDraggable>
  </div>
</template>

<script setup lang="ts">
import type { DeptSortItem, DeptTreeNode } from "@/lib/api-types";

import { computed, ref, watch } from "vue";
import { useSortable } from "@vueuse/integrations/useSortable";

/**
 * 组织树（左栏，对应 React 端 dept-tree.tsx）：UTree（`:nested="false"` 扁平
 * 模式）+ useSortable 拖拽，选中 / 展开 / 行交互均使用 reka（Nuxt UI 底层）
 * 原生链路，不自定义 slot 覆盖。参考：
 * https://ui.nuxt.com/docs/components/tree#with-drag-and-drop
 *
 * - 节点信息：行内只显示名称（label）；停用状态用 trailingIcon（lucide-x）表达，
 *   不在行内放复杂元素；
 * - 拖拽（canReorder）：useSortable 挂 UTree 根元素（$el），按官方 flatten + moveItem
 *   逻辑处理同级拖拽；跨父级移动由 flatten 的 parent 数组约束（天然禁止）；
 * - 展开：受控 expanded（初始全展开；refetch 后新节点并入展开集，保留用户收起状态）；
 * - 停用组织：禁用 select（item.disabled = true）+ trailingIcon 标识。
 */

/**
 * 选项类型：不 extends TreeItem（其 ui 字段引用 ComponentConfig<AppConfig> 深链
 * 会令 vue-tsc 递归展开爆栈 TS2589）；UTree 接受 TreeItem（带 [key: string]: any），
 * 结构兼容的普通对象可直接传入。
 */
interface DeptTreeOption {
  label: string;
  /** 原始树节点（选中回传 / 拖拽组定位用） */
  dept: DeptTreeNode;
  children?: DeptTreeOption[];
  disabled?: boolean;
  defaultExpanded?: boolean;
  /** Iconify icon name（停用节点行尾 x 图标） */
  trailingIcon?: string;
  [key: string]: unknown;
}

const props = defineProps<{
  nodes: DeptTreeNode[];
  selectedId: string | null;
  canReorder: boolean;
}>();

const emit = defineEmits<{
  select: [node: DeptTreeNode];
  reorder: [items: DeptSortItem[]];
}>();

// ---- items 镜像（DeptTreeNode[] → TreeItem[]） ----

function toTreeOption(node: DeptTreeNode): DeptTreeOption {
  return {
    label: node.name,
    dept: node,
    // 停用节点：行内用 lucide-x 角标 + 禁用交互
    ...(node.status === "disabled"
      ? { trailingIcon: "i-lucide-x", disabled: true }
      : {}),
    ...(node.children.length
      ? { children: node.children.map(toTreeOption) }
      : {}),
  };
}

/** 本地镜像数组：拖拽移动（乐观 UI）落在这里，props 变化（refetch）时重置 */
const items = ref<DeptTreeOption[]>([]);

function collectIds(nodes: DeptTreeNode[], acc: string[] = []): string[] {
  for (const node of nodes) {
    acc.push(node.id);
    collectIds(node.children, acc);
  }

  return acc;
}

/** 展开集合（组织 id）；初始化 = 全展开，refetch 只并入新节点、保留用户收起状态 */
const expandedIds = ref<Set<string>>(new Set());

const expandedList = computed(() => [...expandedIds.value]);

watch(
  () => [props.nodes, props.selectedId] as const,
  ([nodes]) => {
    items.value = nodes.map(toTreeOption);
    const ids = collectIds(nodes);

    expandedIds.value =
      expandedIds.value.size === 0
        ? new Set(ids)
        : new Set([...expandedIds.value, ...ids]);
  },
  { immediate: true },
);

// ---- 选中（reka 原生链路 → TreeItem select 事件 → UTree onSelect prop） ----

function handleSelect(_event: unknown, item: unknown) {
  if (
    item &&
    typeof item === "object" &&
    "dept" in item &&
    item.dept &&
    typeof item.dept === "object" &&
    "id" in item.dept
  ) {
    emit("select", item.dept as DeptTreeNode);
  }
}

function handleExpandedUpdate(keys: string[]) {
  expandedIds.value = new Set(keys);
}

// 受控选中：reka 对 modelValue 同样应用 get-key，须传 items 中的 item 对象
// （经 :get-key 映射为组织 id 与点击选中对齐）；找不到时传 null = 无选中
const selectedItem = computed<DeptTreeOption | null>(() => {
  const find = (list: DeptTreeOption[]): DeptTreeOption | null => {
    for (const option of list) {
      if (option.dept.id === props.selectedId) return option;

      const found = find(option.children ?? []);

      if (found) return found;
    }

    return null;
  };

  return find(items.value);
});

// ---- 拖拽（官方参考示例的 flatten + moveItem） ----

function flatten(
  list: DeptTreeOption[],
  parent: DeptTreeOption[] = list,
): { item: DeptTreeOption; parent: DeptTreeOption[]; index: number }[] {
  return list.flatMap((item, index) => [
    { item, parent, index },
    ...(item.children?.length && expandedIds.value.has(item.dept.id)
      ? flatten(item.children, item.children)
      : []),
  ]);
}

function moveItem(oldIndex: number, newIndex: number) {
  if (oldIndex === newIndex) return;

  const flat = flatten(items.value);
  const source = flat[oldIndex];
  const target = flat[newIndex];

  if (!source || !target) return;

  const [moved] = source.parent.splice(source.index, 1);

  if (!moved) return;

  const updatedFlat = flatten(items.value);
  const updatedTarget = updatedFlat.find(({ item }) => item === target.item);

  if (!updatedTarget) return;

  const insertIndex =
    oldIndex < newIndex ? updatedTarget.index + 1 : updatedTarget.index;

  updatedTarget.parent.splice(insertIndex, 0, moved);

  // 受影响组整组重编号提交；顶级组 parentId 为 null
  emit(
    "reorder",
    updatedTarget.parent.map((sibling, idx) => ({
      id: sibling.dept.id,
      parentId: moved.dept.parentId ?? null,
      sort: updatedTarget.parent.length - 1 - idx,
    })),
  );
}

const tree = ref<HTMLElement | null>(null);

useSortable(tree, items, {
  animation: 150,
  ghostClass: "opacity-50",
  onUpdate: (e) => {
    if (e.oldIndex !== undefined && e.newIndex !== undefined) {
      moveItem(e.oldIndex, e.newIndex);
    }
  },
});
</script>

<script lang="ts">
export default { name: "DeptTree" };
</script>

<template>
  <!-- UTree 原生模式：选中受控（model-value = selectedId，get-key 映射为组织 id），
       保证刷新 / URL 恢复（通讯录 ?deptId=）时高亮与数据筛选一致，不依赖 reka 点击内部态 -->
  <UTree
    ref="tree"
    :items="items"
    :expanded="expandedList"
    :get-key="(item: DeptTreeOption) => item.dept.id"
    :model-value="selectedItem ?? undefined"
    :nested="false"
    :unmount-on-hide="false"
    :ui="{ linkLeadingIcon: 'hidden' }"
    @update:expanded="handleExpandedUpdate"
    @select="handleSelect"
  />
</template>

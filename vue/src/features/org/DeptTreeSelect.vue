<script setup lang="ts">
import type { DeptTreeNode } from "@/lib/api-types";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 组织树下拉选择器（USelectMenu + 扁平树选项，层级用全角空格缩进 + 「└ 」
 * 前缀表达；Nuxt UI 无 Tree 组件。flattenTree 写法对齐 better-nuxt 端
 * FormModal.vue）。
 *
 * 组织表单（父级，M2）与用户表单（所属组织）共用：
 * - 选项 = 全量组织树扁平化：全角空格（U+3000）按层级重复缩进 + 子级前缀
 *   「└ 」（不用普通空格：HTML 会折叠）；label 附编码（有 code 时）；
 *   value 为组织 id，"" = 未选择；
 * - selfId 传入时禁选自身及其全部后代（组织父级防环）；
 * - 停用组织一律禁选（停用后不可关联新数据）；
 * - clear 内置清除（替代此前外挂关闭 Button）。
 */
const modelValue = defineModel<string>({ default: "" });

const props = withDefaults(
  defineProps<{
    tree: DeptTreeNode[];
    /** 禁选自身及后代（组织表单编辑防环场景）；缺省不禁 */
    selfId?: string | null;
    isDisabled?: boolean;
  }>(),
  { selfId: null, isDisabled: false },
);

const { t } = useI18n();

interface DeptOption {
  label: string;
  value: string;
  disabled: boolean;
}

const options = computed<DeptOption[]>(() => {
  const list: DeptOption[] = [];

  const flattenTree = (
    nodes: DeptTreeNode[],
    depth: number,
    underSelf: boolean,
  ) => {
    for (const node of nodes) {
      const isSelf = node.id === props.selfId;
      const disabled = node.status !== "enabled" || underSelf || isSelf;
      const prefix = "\u3000".repeat(depth) + (depth > 0 ? "└ " : "");

      list.push({
        label: prefix + (node.code ? `${node.name}(${node.code})` : node.name),
        value: node.id,
        disabled,
      });
      flattenTree(node.children, depth + 1, underSelf || isSelf);
    }
  };

  flattenTree(props.tree, 0, false);

  return list;
});

function onSelect(key: unknown) {
  modelValue.value = key === null || key === undefined ? "" : String(key);
}
</script>

<template>
  <USelectMenu
    :items="options"
    :model-value="modelValue || undefined"
    :disabled="isDisabled"
    :placeholder="t('features.org.deptTreeSelect.placeholder')"
    class="w-full"
    clear
    value-key="value"
    @update:model-value="onSelect"
  />
</template>

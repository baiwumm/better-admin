<script setup lang="ts">
import type { DeptTreeNode } from "@/lib/api-types";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 组织树下拉选择器（平铺缩进表达树形层级；Nuxt UI 无 Tree 组件）。
 *
 * 组织表单（父级，M2）与用户表单（所属组织）共用：
 * - 选项 = 全量组织树平铺，逐级缩进（不换行空格）；value 为组织 id，"" = 未选择；
 * - selfId 传入时禁选自身及其全部后代（组织父级防环）；
 * - 停用组织一律禁选（停用后不可关联新数据）。
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

function onSelect(key: unknown) {
  modelValue.value = key === null || key === undefined ? "" : String(key);
}

interface DeptOption {
  label: string;
  value: string;
  disabled: boolean;
}

const options = computed<DeptOption[]>(() => {
  const list: DeptOption[] = [];

  const walk = (nodes: DeptTreeNode[], depth: number, underSelf: boolean) => {
    for (const node of nodes) {
      const isSelf = node.id === props.selfId;
      const disabled = node.status !== "enabled" || underSelf || isSelf;

      list.push({
        // 缩进用不换行空格（HTML 普通空格会折叠）
        label: `${"\u00A0".repeat(depth * 4)}${node.name}`,
        value: node.id,
        disabled,
      });
      walk(node.children, depth + 1, underSelf || isSelf);
    }
  };

  walk(props.tree, 0, false);

  return list;
});
</script>

<template>
  <USelect
    :items="options"
    :model-value="modelValue || undefined"
    :disabled="isDisabled"
    :placeholder="t('features.org.deptTreeSelect.placeholder')"
    class="w-full"
    @update:model-value="onSelect"
  />
</template>

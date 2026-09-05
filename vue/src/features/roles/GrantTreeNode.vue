<script setup lang="ts">
import type { MenuNode } from "@/lib/api-types";

import { computed, inject, ref } from "vue";
import { useI18n } from "vue-i18n";

import type { GrantTreeContext } from "./use-grant-tree";

/**
 * 授权树节点（递归渲染，Antd Tree 风格）：菜单行 = Checkbox + 图标 + 名称；
 * 权限位复选框作为叶子菜单的**子行**渲染。勾选级联语义见 use-grant-tree.ts。
 */
defineOptions({ name: "GrantTreeNode" });

const props = defineProps<{
  node: MenuNode;
  depth: number;
}>();

const grantTree = inject<GrantTreeContext>("grantTree")!;
const { t } = useI18n();

const children = computed(() => props.node.children ?? []);
const hasChildren = computed(() => children.value.length > 0);
const leafItems = computed(() =>
  hasChildren.value ? [] : grantTree.declaredItems(props.node),
);
const name = computed(() => getMenuLabel(props.node));
const state = computed(() => grantTree.checkState(props.node));
const expanded = computed(() => grantTree.isExpanded(props.node.id));
const expandable = computed(
  () => hasChildren.value || leafItems.value.length > 0,
);

const chevronIcon = computed(() =>
  expanded.value ? "i-lucide-chevron-down" : "i-lucide-chevron-right",
);

const masterModel = computed({
  get: () => state.value === "checked",
  set: () => grantTree.toggleMaster(props.node),
});

function getMenuLabel(node: MenuNode): string {
  return node.i18nKey ? t(node.i18nKey) : node.label;
}

/** 位切换的本地 UI 状态（勾选框即时反馈，状态推导走 grantTree） */
const bitChecked = ref<Record<string, boolean>>({});

function isBitChecked(itemValue: string): boolean {
  if (bitChecked.value[itemValue] !== undefined) {
    return bitChecked.value[itemValue];
  }

  const current = BigInt(grantTree.getBits(props.node.id) || "0");
  const item = leafItems.value.find((it) => it.value === itemValue);

  if (!item) return false;

  return (current & BigInt(item.bits)) === BigInt(item.bits);
}

function onBitToggle(item: (typeof leafItems.value)[number], checked: boolean) {
  bitChecked.value[item.value] = checked;
  grantTree.togglePermissionBit(props.node, item, checked);
}
</script>

<template>
  <div>
    <div
      class="flex items-center gap-2.5 py-1.5"
      :style="{ paddingInlineStart: `${depth * 20}px` }"
    >
      <UButton
        v-if="expandable"
        :aria-label="
          t(
            expanded
              ? 'features.roles.grant.collapse'
              : 'features.roles.grant.expand',
            { name },
          )
        "
        :icon="chevronIcon"
        class="size-6 shrink-0"
        color="neutral"
        size="xs"
        variant="ghost"
        @click="grantTree.toggleExpanded(node.id)"
      />
      <span v-else aria-hidden class="size-6 shrink-0" />

      <UCheckbox
        v-model="masterModel"
        :aria-label="t('features.roles.grant.visibleOf', { name })"
      />

      <UIcon
        v-if="node.icon"
        :name="`i-lucide-${node.icon}`"
        class="text-muted size-4 shrink-0"
      />
      <span class="shrink-0 text-sm font-medium">{{ name }}</span>
      <span v-if="!node.enabled" class="text-muted shrink-0 text-xs">
        ({{ t("features.roles.grant.disabledTag") }})
      </span>
    </div>

    <!-- 叶子 + 有声明位 → 权限位作为子行渲染 -->
    <template v-if="expanded && leafItems.length > 0">
      <div
        v-for="item in leafItems"
        :key="item.value"
        class="flex items-center gap-2.5 py-1"
        :style="{ paddingInlineStart: `${(depth + 1) * 20}px` }"
      >
        <span aria-hidden class="size-6 shrink-0" />
        <UCheckbox
          :aria-label="grantTree.permissionLabel(item)"
          :icon="item.icon ? `i-lucide-${item.icon}` : undefined"
          :label="grantTree.permissionLabel(item)"
          :model-value="isBitChecked(item.value)"
          @update:model-value="
            (checked: unknown) => onBitToggle(item, Boolean(checked))
          "
        />
      </div>
    </template>

    <!-- 子菜单子树：仅展开时渲染（自引用递归） -->
    <template v-if="hasChildren && expanded">
      <GrantTreeNode
        v-for="child in children"
        :key="child.id"
        :depth="depth + 1"
        :node="child"
      />
    </template>
  </div>
</template>

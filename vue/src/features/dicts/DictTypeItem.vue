<script setup lang="ts">
import type { DictType } from "@/lib/api-types";

import { useI18n } from "vue-i18n";

/**
 * 字典类型列表项组件：左栏列表的单个可点击项。
 *
 * - 支持选中/未选中状态高亮
 * - 悬停显示编辑/删除操作按钮
 * - 键盘导航支持（Enter、Space）
 * - 阻止事件冒泡避免父容器点击
 */

const props = defineProps<{
  /** 字典类型数据 */
  type: DictType;
  /** 是否为当前选中项 */
  isActive: boolean;
  /** 是否显示编辑按钮 */
  canEdit: boolean;
  /** 是否显示删除按钮 */
  canDelete: boolean;
}>();

const emit = defineEmits<{
  /** 点击选中 */
  select: [];
  /** 编辑按钮点击 */
  edit: [];
  /** 删除按钮点击 */
  delete: [];
}>();

const { t } = useI18n();

function handleSelect() {
  emit("select");
}

function handleEdit(e: MouseEvent) {
  e.stopPropagation();
  emit("edit");
}

function handleDelete(e: MouseEvent) {
  e.stopPropagation();
  emit("delete");
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    emit("select");
  }
}
</script>

<template>
  <div
    :class="
      isActive
        ? 'bg-elevated/60'
        : 'hover:bg-elevated/30'
    "
    class="group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors"
    role="button"
    tabindex="0"
    @click="handleSelect"
    @keydown="handleKeydown"
  >
    <div class="min-w-0 flex-1">
      <div class="truncate text-sm font-medium">{{ type.name }}</div>
      <div class="text-muted truncate text-xs">{{ type.code }}</div>
    </div>
    <div
      class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
    >
      <UButton
        v-if="canEdit"
        :aria-label="t('common.edit')"
        color="neutral"
        icon="i-lucide-pencil"
        size="xs"
        variant="ghost"
        @click="handleEdit"
      />
      <UButton
        v-if="canDelete"
        :aria-label="t('common.delete')"
        color="error"
        icon="i-lucide-trash-2"
        size="xs"
        variant="ghost"
        @click="handleDelete"
      />
    </div>
  </div>
</template>

<script setup lang="ts" generic="TData extends RowData">
import type { RowData } from "@tanstack/vue-table";

import type { AppTable } from "./table-types";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/** 底部浮动批量操作条：有勾选时显示（已选 N 项 + 清空选择 + 批量按钮 slot）。 */
const props = defineProps<{
  table: AppTable<TData>;
}>();

const { t } = useI18n();

const selectedCount = computed(
  () => props.table.getSelectedRowModel().rows.length,
);
</script>

<template>
  <div
    v-if="selectedCount > 0"
    class="bg-inverted text-inverted fixed inset-x-4 bottom-4 z-50 flex items-center gap-3 rounded-lg px-4 py-2 shadow-lg sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
  >
    <span class="text-sm font-medium">
      {{ t("common.datatable.selected", { count: selectedCount }) }}
    </span>
    <UButton
      :label="t('common.datatable.clearSelection')"
      color="neutral"
      size="xs"
      variant="soft"
      @click="table.resetRowSelection()"
    />
    <div class="flex items-center gap-1">
      <slot />
    </div>
  </div>
</template>

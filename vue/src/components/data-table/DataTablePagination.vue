<script setup lang="ts" generic="TData extends RowData">
import type { RowData } from "@tanstack/vue-table";

import type { AppTable } from "./table-types";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 分页条（服务端分页受控）：pageSize 下拉（10/20/30/40/50，切页大小回第 1 页
 * 由列表 store 负责）+ 范围统计 + 页码（Nuxt UI UPagination，首末页自适应）。
 */
const props = defineProps<{
  table: AppTable<TData>;
  total: number;
  /** 当前页（从 1 开始；受控——页面列表 store 为真源） */
  pageIndex: number;
  /** 每页条数（受控） */
  pageSize: number;
}>();

const { t } = useI18n();

const pageSize = computed(() => props.pageSize);
const pageIndex = computed(() => props.pageIndex);

const pageSizeOptions = [10, 20, 30, 40, 50].map((count) => ({
  label: t("common.datatable.pageSizeItem", { count }),
  value: count,
}));

const total = computed(() => props.total);

const rangeText = computed(() => {
  const start = total.value === 0 ? 0 : pageIndex.value * pageSize.value + 1;
  const end = Math.min((pageIndex.value + 1) * pageSize.value, total.value);

  return t("common.datatable.rangeTotal", {
    start,
    end,
    total: total.value,
  });
});

function onPageChange(page: number) {
  props.table.setPageIndex(page - 1);
}

function onPageSizeChange(value: number) {
  props.table.setPageSize(value);
}
</script>

<template>
  <div class="flex flex-col-reverse items-center gap-2 py-2 sm:flex-row">
    <div class="text-muted flex-1 text-sm">
      {{ rangeText }}
    </div>
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="text-muted text-sm">{{
          t("common.datatable.pageSizeLabel")
        }}</span>
        <USelect
          :model-value="pageSize"
          :items="pageSizeOptions"
          aria-label="pageSize"
          class="w-32"
          size="sm"
          value-key="value"
          @update:model-value="onPageSizeChange"
        />
      </div>
      <UPagination
        :page="pageIndex + 1"
        :item-count="total"
        :items-per-page="pageSize"
        :sibling-count="1"
        size="sm"
        @update:page="onPageChange"
      />
    </div>
  </div>
</template>

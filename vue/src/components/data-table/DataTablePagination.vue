<script setup lang="ts" generic="TData extends RowData">
import type { RowData } from "@tanstack/vue-table";

import type { AppTable } from "./table-types";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 分页条（服务端分页受控，三列布局对齐 React 端 data-table-pagination）：
 * 左侧范围统计 + 中间页码（Nuxt UI UPagination，首末页自适应）+ 右侧 pageSize
 * 下拉（10/20/30/40/50，切页大小回第 1 页由列表 store 负责）。
 * 注意：UPagination 的总条数属性是 total（无 itemCount，勿用 HeroUI 命名）。
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

// computed 包裹保证 i18n 切换语言时下拉文案实时更新（t 依赖 locale 响应式）
const pageSizeOptions = computed(() =>
  [10, 20, 30, 40, 50].map((count) => ({
    label: t("common.datatable.pageSizeItem", { count }),
    value: count,
  })),
);

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
  <div
    class="mt-3 grid grid-cols-1 items-center gap-3 px-1 sm:grid-cols-[1fr_auto_1fr]"
  >
    <div class="text-muted flex items-center text-xs">
      {{ rangeText }}
    </div>
    <div class="flex items-center justify-start sm:justify-center">
      <UPagination
        :page="pageIndex + 1"
        :total="total"
        :items-per-page="pageSize"
        :sibling-count="1"
        size="sm"
        @update:page="onPageChange"
      />
    </div>
    <div class="flex items-center justify-start gap-2 sm:justify-end">
      <span class="text-muted text-xs">{{
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
  </div>
</template>

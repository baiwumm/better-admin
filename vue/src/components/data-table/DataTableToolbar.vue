<script setup lang="ts" generic="TData extends RowData">
import type { RowData } from "@tanstack/vue-table";
import type { AppTableLike } from "./table-types";
import DataTableViewOptions from "./DataTableViewOptions.vue";

/**
 * 表格工具栏（纯布局壳，对齐 React 端 DataTableToolbar）：左侧筛选区 + 右侧操作区。
 * 左侧（默认插槽）放什么完全由页面决定（搜索框 / 筛选器 / 新增按钮等）；
 * 右侧固定为 actions 插槽 + 可选列设置（传入 table 即渲染，columnSettingKey 持久化）。
 */
defineProps<{
  /** 列设置（传入 table 即渲染右侧「列设置」下拉） */
  table?: AppTableLike<TData>;
  /** 列设置持久化 key（column-setting:{userId}:{routePath}），不传则不持久化 */
  columnSettingKey?: string;
}>();
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    <div class="flex flex-1 flex-wrap items-center gap-2">
      <slot />
    </div>
    <div class="flex items-center gap-2">
      <slot name="actions" />
      <DataTableViewOptions
        v-if="table"
        :storage-key="columnSettingKey"
        :table="table"
      />
    </div>
  </div>
</template>

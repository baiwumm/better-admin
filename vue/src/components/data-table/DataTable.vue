<script setup lang="ts" generic="TData extends RowData">
import type { RowData, RowSelectionState } from "@tanstack/vue-table";
import type { AppTableLike } from "./table-types";
import LoadingContent from "@/components/ui/loading-content/index.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/**
 * DataTable（Nuxt UI UTable 渲染层）：薄包装层，从页面传入的 TanStack table
 * 实例提取原始 data / columns 交给 UTable 渲染。排序 / 空态 / 加载态由
 * UTable 内置管理。
 *
 * 行选择桥接（关键）：UTable 内部自建一个 TanStack 实例渲染单元格，select
 * 列的勾选写的是 UTable 内部实例的 rowSelection；若不桥接，页面级 table
 * 实例（DataTableBulkActions / getSelectedRowModel 的真源）永远为空。
 * 这里以 v-model:row-selection 双向转发到页面实例，并转发 getRowId 保证
 * 两边行 ID 一致。
 *
 * 后台刷新对齐 React 端 data-table：保留当前数据 + 半透明遮罩 + Spinner。
 * 样式对齐 better-nuxt 参考项目（border-separate + 表头圆角描边 + 行分隔）。
 */

const props = defineProps<{
  table: AppTableLike<TData>;
  /** 首载（当前 key 无数据）→ UTable 内置 loading 动画 */
  loading?: boolean;
  /** 后台刷新（搜索 / 翻页 / 筛选变更等 refetch）→ 当前数据 + 遮罩 */
  refreshing?: boolean;
}>();

const { t } = useI18n();

// TanStack v8 实例的 options 保存原始 data / columns
const data = computed(() => (props.table.options?.data ?? []) as TData[]);
const columns = computed(() => (props.table.options?.columns ?? []) as never[]);
const getRowId = computed(() => props.table.options?.getRowId);

/** UTable 内部实例勾选状态 ↔ 页面 table 实例 rowSelection 双向桥接 */
const rowSelection = computed<RowSelectionState>({
  get: () => props.table.getState().rowSelection,
  set: (value) => props.table.setRowSelection(value),
});
</script>

<template>
  <div class="relative">
    <UTable
      v-model:row-selection="rowSelection"
      sticky
      :loading="refreshing"
      :data
      :columns="columns"
      :get-row-id="getRowId"
      :ui="{
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tr: 'group',
        td: 'group-has-[td:not(:empty)]:border-b border-default text-start',
      }"
    >
      <template #empty>
        <div class="flex items-center justify-center w-full">
          <UEmpty
            icon="i-lucide-inbox"
            :title="t('common.datatable.empty')"
            class="ring-0"
          />
        </div>
      </template>
    </UTable>

    <!-- 后台刷新遮罩（对齐 React 端：旧数据保留 + 半透明模糊 + 居中 Spinner） -->
    <LoadingContent v-if="refreshing" />
  </div>
</template>

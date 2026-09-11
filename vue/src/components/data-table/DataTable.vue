<script setup lang="ts" generic="TData extends RowData">
import type {
  ColumnOrderState,
  RowData,
  RowSelectionState,
  VisibilityState,
} from "@tanstack/vue-table";
import type { AppTableLike } from "./table-types";
import LoadingContent from "@/components/ui/loading-content/index.vue";
import ErrorContent from "@/components/common/ErrorContent.vue";
import DataTablePagination from "./DataTablePagination.vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/**
 * DataTable（Nuxt UI UTable 渲染层）：薄包装层，从页面传入的 TanStack table
 * 实例提取原始 data / columns 交给 UTable 渲染。排序 / 空态 / 加载态由
 * UTable 内置管理。
 *
 * 状态桥接（关键）：UTable 内部自建一个 TanStack 实例渲染单元格，select
 * 列的勾选写的是 UTable 内部实例的 rowSelection；若不桥接，页面级 table
 * 实例（DataTableBulkActions / getSelectedRowModel 的真源）永远为空。
 * 这里以 v-model 双向转发 rowSelection / columnVisibility / columnOrder 到
 * 页面实例（后两者由 DataTableViewOptions 列设置写入页面实例、经此生效到
 * 渲染层），并转发 getRowId 保证两边行 ID 一致。
 *
 * 错误态 / 分页内聚（对齐 React 端 data-table）：isError 时强制清空行，
 * 经 #empty 槽渲染错误占位（重试按钮走 emit('retry')，页面接 refetch），
 * 此时隐藏分页条（旧 total 已不可信）；total 传入时在表格下方渲染分页条，
 * 页面无需自行拼装 ErrorContent / DataTable / 分页条三段模板。
 *
 * 后台刷新对齐 React 端 data-table：保留当前数据 + 半透明遮罩 + Spinner。
 * 样式对齐 better-nuxt 参考项目（border-separate + 表头圆角描边 + 行分隔）。
 */

const props = defineProps<{
  table: AppTableLike<TData>;
  /** 首载（当前 key 无数据）→ 骨架行 + 遮罩 */
  loading?: boolean;
  /** 后台刷新（搜索 / 翻页 / 筛选变更等 refetch）→ 当前数据 + 遮罩 */
  refreshing?: boolean;
  /** 数据加载失败：强制清空行并渲染错误占位（重试走 retry 事件） */
  isError?: boolean;
  /** 服务端分页总数；传入时渲染分页条（isError 时隐藏） */
  total?: number;
}>();

const emit = defineEmits<{ retry: [] }>();

const { t } = useI18n();

// TanStack v8 实例的 options 保存原始 data / columns
const data = computed(() => (props.table.options?.data ?? []) as TData[]);
const columns = computed(() => (props.table.options?.columns ?? []) as never[]);
const getRowId = computed(() => props.table.options?.getRowId);

/** 错误态强制清空行（refetch 失败时 vue-query 仍持有旧数据），
 * 以触发 #empty 槽展示错误占位（同 React 端 data-table 的 isError 分支） */
const tableData = computed(() => (props.isError ? [] : data.value));

/** UTable 内部实例勾选状态 ↔ 页面 table 实例 rowSelection 双向桥接 */
const rowSelection = computed<RowSelectionState>({
  get: () => props.table.getState().rowSelection,
  set: (value) => props.table.setRowSelection(value),
});

/** 列可见性 / 列顺序桥接（UTable 仅在初值非 undefined 时注册 onChange，页面实例默认 {} / []） */
const columnVisibility = computed<VisibilityState>({
  get: () => props.table.getState().columnVisibility,
  set: (value) => props.table.setColumnVisibility(value),
});
const columnOrder = computed<ColumnOrderState>({
  get: () => props.table.getState().columnOrder,
  set: (value) => props.table.setColumnOrder(value),
});
</script>

<template>
  <div class="relative">
    <UTable
      v-model:row-selection="rowSelection"
      v-model:column-visibility="columnVisibility"
      v-model:column-order="columnOrder"
      sticky
      :loading="refreshing"
      :data="tableData"
      :columns="columns"
      :get-row-id="getRowId"
      :ui="{
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tr: 'group',
        td: 'group-has-[td:not(:empty)]:border-b border-default text-start',
      }"
    >
      <template #empty>
        <!-- 错误占位内聚（对齐 React 端 renderEmptyState 的 isError 分支） -->
        <ErrorContent
          v-if="isError"
          :retry-label="t('common.retry')"
          :title="t('common.loadError')"
          class="my-6"
          @retry="emit('retry')"
        />
        <div v-else class="flex items-center justify-center w-full">
          <UEmpty
            icon="i-lucide-inbox"
            :title="t('common.datatable.empty')"
            class="ring-0"
          />
        </div>
      </template>
    </UTable>

    <!-- 分页条内聚（对齐 React 端 Table.Footer：isError 时隐藏，旧 total 不可信） -->
    <DataTablePagination
      v-if="total !== undefined && !isError"
      :table="table"
      :total="total"
    />

    <!-- 后台刷新遮罩（对齐 React 端：旧数据保留 + 半透明模糊 + 居中 Spinner） -->
    <LoadingContent v-if="refreshing || loading" />
  </div>
</template>

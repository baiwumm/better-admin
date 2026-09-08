<script setup lang="ts">
import type { Log, LogType } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/data-table/table-types";

import { computed, h, ref, resolveComponent } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useVueTable } from "@tanstack/vue-table";
import { getCoreRowModel } from "@tanstack/vue-table";
import { useToast } from "@nuxt/ui/composables";

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UCheckbox = resolveComponent("UCheckbox");
const UDropdownMenu = resolveComponent("UDropdownMenu");

import {
  batchDeleteLogs,
  deleteLog,
  getLogErrorMessage,
  LOGS_QUERY_KEY,
  logOperator,
} from "./log-api";
import {
  isLogType,
  LOG_TYPE_VALUES,
  logTypeColor,
  logTypeLabel,
} from "./log-type";
import LogDetailDrawer from "./LogDetailDrawer.vue";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import ErrorContent from "@/components/common/ErrorContent.vue";
import UserInfo from "@/components/common/UserInfo.vue";
import DataTable from "@/components/data-table/DataTable.vue";
import DataTableBulkActions from "@/components/data-table/DataTableBulkActions.vue";
import DataTablePagination from "@/components/data-table/DataTablePagination.vue";
import DataTableSearchReset from "@/components/data-table/DataTableSearchReset.vue";
import DataTableToolbar from "@/components/data-table/DataTableToolbar.vue";
import { type AppTable } from "@/components/data-table/table-types";
import { dictItemsQueryKey, fetchDictItems } from "@/features/dicts/dict-api";
import { useMenuPermissions } from "@/composables/use-permissions";
import { useListQuery } from "@/composables/use-list-query";
import { createListStore } from "@/lib/list-store";
import { formatDateTime } from "@/lib/format-date";

/**
 * 日志管理页（对齐 React 端 logs-page）：服务端分页列表
 * （page/pageSize/search/type）+ 详情抽屉 + 单条/批量删除（契约 v1.4.8）。
 *
 * - 日志为系统自动写入，页面只读：无新增/编辑，仅人工清理（删除）；
 * - 列表固定 created_at 倒序（后端不支持排序参数），不提供排序交互；
 * - 类型筛选与类型显示名以字典 log_type 为真源（value 限于契约四枚举，
 *   字典不可用时回退内置 i18n 文案，见 log-type.ts）；
 * - search 仅匹配 action 字段（后端 ILIKE）；
 * - 删除后清理勾选残留（与 users 页口径一致）。
 */

/** 列表 store（模块级单例：导航返回复用同一份分页/筛选状态） */
const logsListStore = createListStore<{ type: string | null }>({
  type: null,
});

const { t, locale } = useI18n();
const toast = useToast();
const queryClient = useQueryClient();
const store = logsListStore;

const { canDelete, canBatchDelete } = useMenuPermissions();

const {
  data,
  pagination,
  isLoading,
  isFetching,
  isError,
  refetch,
  submitSearch,
} = useListQuery<Log, { type: string | null }>({
  store,
  queryKeyPrefix: LOGS_QUERY_KEY,
  path: "/logs",
  buildFilters: (f) => (f.type ? { type: f.type } : {}),
});

// 搜索（提交式后端过滤，后端匹配 action 字段）；
// 条件未变化时 submitSearch 走 refetch，搜索按钮即「刷新列表」入口
const searchInput = ref(store.search);

function applySearch() {
  submitSearch(searchInput.value.trim());
}

const searchDirty = computed(() => searchInput.value.trim() !== store.search);

function resetFilters() {
  searchInput.value = "";
  store.reset();
}

// 类型字典（log_type）：筛选选项与类型显示名的真源；加载失败静默降级
const logTypeDictQuery = useQuery({
  queryKey: dictItemsQueryKey("log_type"),
  queryFn: () => fetchDictItems("log_type"),
});
const logTypeDictItems = computed(() =>
  (logTypeDictQuery.data.value ?? []).filter(
    (item) => item.enabled && isLogType(item.value),
  ),
);

/** 类型筛选选项：字典启用项（限于契约四枚举）；字典不可用时回退内置枚举 */
const typeOptions = computed(() => {
  const source =
    logTypeDictItems.value.length > 0
      ? logTypeDictItems.value.map((item) => ({ value: item.value }))
      : LOG_TYPE_VALUES.map((value) => ({ value }));

  return source.map((item) => ({
    value: item.value,
    label: logTypeLabel(
      item.value,
      logTypeDictItems.value.length > 0 ? logTypeDictItems.value : undefined,
      t,
    ),
  }));
});

function getTypeLabel(type: string) {
  return logTypeLabel(
    type,
    logTypeDictItems.value.length > 0 ? logTypeDictItems.value : undefined,
    t,
  );
}

// ---------------- 弹窗状态 ----------------
const detailOpen = ref(false);
const detailLog = ref<Log | null>(null);

const deleteOpen = ref(false);
const deleteTarget = ref<Log | null>(null);
const deleteSubmitting = ref(false);

const batchDeleteOpen = ref(false);
const batchDeleteIds = ref<string[]>([]);
const batchDeleteSubmitting = ref(false);

function invalidateList() {
  void queryClient.invalidateQueries({ queryKey: LOGS_QUERY_KEY });
}

// ---------------- 表格 ----------------
const columns = computed<AppColumnDef<Log>[]>(() => [
  {
    id: "select",
    enableSorting: false,
    enableHiding: false,
    // 对齐 React 端 DataTableSelectAll：部分勾选呈半选态（点击半选 = 全选）；
    // 服务端分页下数据即当前页，getIsAllRowsSelected 等价页级全选
    header: ({ table: headerTable }) => {
      const allSelected = headerTable.getIsAllRowsSelected();
      const someSelected = headerTable.getIsSomeRowsSelected();

      return h(UCheckbox, {
        "aria-label": t("common.datatable.selectAll"),
        modelValue: allSelected ? true : someSelected ? "indeterminate" : false,
        "onUpdate:modelValue": (value: unknown) =>
          headerTable.toggleAllRowsSelected(
            value === "indeterminate" ? true : Boolean(value),
          ),
      });
    },
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        "onUpdate:modelValue": (value: unknown) =>
          row.toggleSelected(Boolean(value)),
      }),
  },
  {
    id: "operator",
    enableSorting: false,
    header: () => t("features.logs.column.operator"),
    cell: ({ row }) => {
      const operator = logOperator(row.original);

      return operator
        ? h(UserInfo, { user: operator })
        : h("span", { class: "text-muted text-sm" }, "—");
    },
  },
  {
    accessorKey: "type",
    enableSorting: false,
    header: () => t("features.logs.column.type"),
    cell: ({ row }) =>
      h(UBadge, {
        color: logTypeColor(row.original.type),
        label: getTypeLabel(row.original.type),
        variant: "soft",
      }),
  },
  {
    accessorKey: "action",
    enableSorting: false,
    header: () => t("features.logs.column.action"),
    cell: ({ row }) =>
      h("span", { class: "text-sm break-all" }, row.original.action),
  },
  {
    accessorKey: "ip",
    enableSorting: false,
    header: () => t("features.logs.column.ip"),
    cell: ({ row }) =>
      h("span", { class: "text-muted text-sm" }, row.original.ip ?? "—"),
  },
  {
    accessorKey: "createdAt",
    enableSorting: false,
    header: () => t("common.column.createdAt"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-muted text-sm" },
        formatDateTime(row.original.createdAt, locale.value),
      ),
  },
  {
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    header: () => t("common.actions"),
    cell: ({ row }) => {
      const log = row.original;
      const items: Array<{
        key: string;
        label: string;
        icon: string;
        color?: "error";
        onSelect: () => void;
      }> = [];

      items.push({
        key: "detail",
        label: t("features.logs.action.detail"),
        icon: "i-lucide-eye",
        onSelect: () => {
          detailLog.value = log;
          detailOpen.value = true;
        },
      });
      if (canDelete.value) {
        items.push({
          key: "delete",
          label: t("common.delete"),
          icon: "i-lucide-trash-2",
          color: "error",
          onSelect: () => {
            deleteTarget.value = log;
            deleteOpen.value = true;
          },
        });
      }

      return h(
        UDropdownMenu,
        { items: [items], content: { align: "center" } },
        () =>
          h(UButton, {
            "aria-label": t("common.actions"),
            color: "neutral",
            icon: "i-lucide-ellipsis",
            size: "sm",
            variant: "ghost",
          }),
      );
    },
  },
]);

const table: AppTable<Log> = useVueTable({
  get data() {
    return data.value;
  },
  get columns() {
    return columns.value;
  },
  getCoreRowModel: getCoreRowModel(),
  getRowId: (row: Log) => row.id,
  // 服务端分页：分页状态由列表 store 驱动（受控）；列表固定倒序，无排序交互
  manualPagination: true,
  manualSorting: true,
  // pageCount 必须用 getter 实时求值：setup 时请求未返回 total=0，若写死为
  // 字面量 1，setPageIndex 会被 clamp 永远翻不了页（React 端每次渲染重建
  // options 无此问题）
  get pageCount() {
    return Math.max(1, Math.ceil(pagination.value.total / store.pageSize));
  },
  state: {
    get pagination() {
      return { pageIndex: store.page - 1, pageSize: store.pageSize };
    },
  },
  onPaginationChange: (updater) => {
    const next =
      typeof updater === "function"
        ? updater({ pageIndex: store.page - 1, pageSize: store.pageSize })
        : updater;

    if (next.pageSize !== store.pageSize) {
      store.setPageSize(next.pageSize);
    } else {
      store.setPage(next.pageIndex + 1);
    }
  },
});

const selectedLogs = computed(() =>
  table.getSelectedRowModel().rows.map((row) => row.original),
);

async function confirmDelete() {
  if (!deleteTarget.value) return;

  deleteSubmitting.value = true;

  try {
    await deleteLog(deleteTarget.value.id);
  } catch (error) {
    toast.add({
      color: "error",
      title: getLogErrorMessage(error),
    });

    return; // 失败保持弹窗打开
  } finally {
    deleteSubmitting.value = false;
  }

  invalidateList();
  table.resetRowSelection();
  deleteOpen.value = false;
  toast.add({
    color: "success",
    title: t("features.logs.message.deleteSuccess"),
  });
}

async function confirmBatchDelete() {
  batchDeleteSubmitting.value = true;

  try {
    await batchDeleteLogs(batchDeleteIds.value);
  } catch (error) {
    toast.add({
      color: "error",
      title: getLogErrorMessage(error),
    });

    return;
  } finally {
    batchDeleteSubmitting.value = false;
  }

  invalidateList();
  table.resetRowSelection();
  batchDeleteOpen.value = false;
  // 对齐 React 端：批量删除成功与单条共用 deleteSuccess 文案（无独立 key）
  toast.add({
    color: "success",
    title: t("features.logs.message.deleteSuccess"),
  });
}
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <DataTableToolbar>
      <UInput
        v-model="searchInput"
        :aria-label="t('features.logs.searchPlaceholder')"
        :placeholder="t('features.logs.searchPlaceholder')"
        icon="i-lucide-search"
        @keyup.enter="applySearch"
      />
      <USelect
        :aria-label="t('features.logs.column.type')"
        :items="typeOptions"
        :model-value="store.filters.type ?? undefined"
        :placeholder="t('features.logs.filter.all')"
        value-key="value"
        class="w-50"
        @update:model-value="
          (value: unknown) =>
            store.setFilters({ type: value as LogType | string })
        "
      />
      <DataTableSearchReset
        :can-reset="
          searchDirty || store.search !== '' || store.filters.type !== null
        "
        :fetching="isFetching"
        @reset="resetFilters"
        @search="applySearch"
      />
    </DataTableToolbar>

    <ErrorContent
      v-if="isError"
      :retry-label="t('common.retry')"
      :title="t('common.loadError')"
      @retry="refetch()"
    />
    <DataTable
      v-else
      :loading="isLoading"
      :refreshing="isFetching && !isLoading"
      :table="table"
    />

    <DataTablePagination
      :page-index="store.page - 1"
      :page-size="store.pageSize"
      :table="table"
      :total="pagination.total"
    />

    <DataTableBulkActions :table="table">
      <UButton
        v-if="canBatchDelete"
        :label="t('features.logs.bulk.delete')"
        icon="i-lucide-trash-2"
        color="error"
        size="sm"
        variant="soft"
        @click="
          batchDeleteIds = selectedLogs.map((log) => log.id);
          batchDeleteOpen = true;
        "
      />
    </DataTableBulkActions>

    <LogDetailDrawer
      v-model:open="detailOpen"
      :log="detailOpen ? detailLog : null"
      :type-label="detailLog ? getTypeLabel(detailLog.type) : ''"
    />

    <ConfirmDialog
      v-model:open="deleteOpen"
      :confirm-keyword="deleteTarget?.action"
      :confirm-text="t('common.delete')"
      :description="
        t('features.logs.message.deleteDesc', {
          action: deleteTarget?.action ?? '',
        })
      "
      :keyword-label="t('features.logs.message.deleteKeyword')"
      :loading="deleteSubmitting"
      :title="t('features.logs.message.deleteTitle')"
      destructive
      @confirm="confirmDelete"
    />

    <ConfirmDialog
      v-model:open="batchDeleteOpen"
      :confirm-keyword="'DELETE'"
      :confirm-text="t('common.delete')"
      :description="
        t('features.logs.message.batchDeleteDesc', {
          count: batchDeleteIds.length,
        })
      "
      :keyword-label="t('features.logs.message.batchDeleteKeyword')"
      :loading="batchDeleteSubmitting"
      :title="t('features.logs.message.batchDeleteTitle')"
      destructive
      @confirm="confirmBatchDelete"
    />
  </div>
</template>

<script setup lang="ts">
import type { DirectoryEntry } from "@/lib/api-types";
import type { DirectoryListParams } from "./directory-api";
import type {
  AppColumnDef,
  AppTable,
} from "@/components/data-table/table-types";

import { computed, h, ref, resolveComponent, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { keepPreviousData } from "@tanstack/vue-query";
import { useVueTable } from "@tanstack/vue-table";
import { getCoreRowModel, getSortedRowModel } from "@tanstack/vue-table";
import { useToast } from "@nuxt/ui/composables";

import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "./dept-api";
import {
  DIRECTORY_EXPORT_MAX_ROWS,
  DirectoryExportLimitError,
  exportDirectoryExcel,
} from "./directory-export";
import { DIRECTORY_QUERY_KEY } from "./directory-api";
import DeptTreePanel from "./DeptTreePanel.vue";

import ErrorContent from "@/components/common/ErrorContent.vue";
import UserInfo from "@/components/common/UserInfo.vue";
import Spinner from "@/components/ui/spinner/index.vue";
import DataTable from "@/components/data-table/DataTable.vue";
import DataTablePagination from "@/components/data-table/DataTablePagination.vue";
import DataTableSearchReset from "@/components/data-table/DataTableSearchReset.vue";
import DataTableToolbar from "@/components/data-table/DataTableToolbar.vue";
import { useMenuPermissions } from "@/composables/use-permissions";
import { useListQuery } from "@/composables/use-list-query";
import { createListStore } from "@/lib/list-store";

const UBadge = resolveComponent("UBadge");

/**
 * 人员通讯录页（契约 v1.6.0 阶段 2，对应 React 端 directory-page.tsx）：
 * 左树右表布局。
 *
 * - 左栏组织树点击即筛选（该组织及全部下级组织的人员，递归），
 *   再次点击「全部人员」清除组织筛选；
 * - 组织筛选与 URL Query 双向同步（/org/directory?deptId=xxx）：
 *   架构图谱节点点击跳转的落点，刷新 / 分享 / 前进后退稳定；
 *   防循环口径：URL → store 用「当前值不同才 set」（setFilters 同值幂等兜底），
 *   store → URL 用 router.replace（不塞历史记录）；
 * - 在职状态缺省 employed（离职人员默认不展示，PRD 3.3.5）；
 * - 工具栏支持导出当前筛选结果为 Excel（EXPORT 位门控，见 directory-export.ts）。
 */

/** 列表 store（模块级单例：导航返回复用同一份分页/筛选状态） */
const directoryListStore = createListStore<{
  deptId: string | null;
  employmentStatus: string | null;
}>({
  deptId: null,
  // 默认「在职」（离职人员默认不展示）；「全部」(null) 映射后端 all
  employmentStatus: "employed",
});

const { t } = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();
const { canExport } = useMenuPermissions();

const store = directoryListStore;

// 组织树（左栏筛选；与组织/岗位页共享缓存）
const treeQuery = useQuery({
  queryKey: DEPTS_TREE_QUERY_KEY,
  queryFn: fetchDeptTree,
  placeholderData: keepPreviousData,
  staleTime: 0,
});
const tree = computed(() => treeQuery.data.value ?? []);

// ---------------- 列表（服务端分页 + 筛选 + 排序） ----------------
const {
  data,
  pagination,
  isLoading,
  isFetching,
  isError,
  refetch,
  submitSearch,
} = useListQuery<
  DirectoryEntry,
  {
    deptId: string | null;
    employmentStatus: string | null;
  }
>({
  store,
  queryKeyPrefix: DIRECTORY_QUERY_KEY,
  path: "/org/directory",
  // 后端搜索参数名为 keyword（/org/* 统一命名）
  searchParam: "keyword",
  buildFilters: (f) => ({
    ...(f.deptId ? { deptId: f.deptId } : {}),
    // 「全部」(null) 映射后端 all；store 默认 employed
    employmentStatus: f.employmentStatus ?? "all",
  }),
});

// 搜索（提交式后端过滤：姓名 / 工号 / 登录名）；条件未变化时 submitSearch
// 走 refetch，搜索按钮即「刷新列表」入口
const searchInput = ref(store.search);

function applySearch() {
  submitSearch(searchInput.value.trim());
}

const searchDirty = computed(() => searchInput.value.trim() !== store.search);

// URL Query → 列表 store（图谱跳转 / 刷新 / 前进后退恢复组织筛选）
const urlDeptId = computed<string | null>(() => {
  const value = route.query.deptId;

  return typeof value === "string" && value !== "" ? value : null;
});

watch(
  urlDeptId,
  (value) => {
    if (store.filters.deptId !== value) {
      store.setFilters({ deptId: value });
    }
  },
  { immediate: true },
);

// store → URL（页内树点击 / 清除时同步地址栏，保证分享与刷新一致；
// replace 避免每次点击都塞历史记录）
function syncDeptIdToUrl(deptId: string | null) {
  void router.replace({ query: { deptId: deptId ?? undefined } });
}

function selectDept(node: { id: string }) {
  store.setFilters({ deptId: node.id });
  syncDeptIdToUrl(node.id);
}

function clearDeptFilter() {
  store.setFilters({ deptId: null });
  syncDeptIdToUrl(null);
}

function resetFilters() {
  searchInput.value = "";
  store.reset();
  syncDeptIdToUrl(null);
}

// ---------------- 导出 Excel（write-excel-file 触发时动态加载） ----------------
const isExporting = ref(false);

async function handleExport() {
  if (isExporting.value) return;

  isExporting.value = true;

  // toast.promise 三段式（对齐既有 toast.update 形态）
  const exportingToast = toast.add({
    title: t("features.directory.export.loading"),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  const sortField = store.sorting[0]?.id;

  try {
    const count = await exportDirectoryExcel({
      params: {
        ...(store.search ? { keyword: store.search } : {}),
        ...(store.filters.deptId ? { deptId: store.filters.deptId } : {}),
        employmentStatus: (store.filters.employmentStatus ??
          "all") as DirectoryListParams["employmentStatus"],
        ...(sortField
          ? {
              sort: sortField,
              order: store.sorting[0].desc ? "desc" : "asc",
            }
          : {}),
      },
      t,
    });

    toast.update(exportingToast.id, {
      title: t("features.directory.export.success", { count }),
      icon: "i-lucide-check",
      color: "success",
    });
  } catch (error) {
    toast.update(exportingToast.id, {
      title:
        error instanceof DirectoryExportLimitError
          ? t("features.directory.export.limitExceeded", {
              max: DIRECTORY_EXPORT_MAX_ROWS,
            })
          : error instanceof Error
            ? error.message
            : String(error),
      icon: "i-lucide-x",
      color: "error",
    });
  } finally {
    isExporting.value = false;
  }
}

const employmentOptions = computed(() => [
  // 「全部」由 placeholder 承担（null → 后端 all），选项只给两个具体状态
  { label: t("features.directory.filter.employed"), value: "employed" },
  { label: t("features.directory.filter.resigned"), value: "resigned" },
]);

const canReset = computed(
  () =>
    searchDirty.value ||
    store.search !== "" ||
    Boolean(store.filters.deptId) ||
    store.filters.employmentStatus !== "employed",
);

// ---------------- 表格（TanStack vue-table，服务端分页/排序受控） ----------------
const columns = computed<AppColumnDef<DirectoryEntry>[]>(() => [
  {
    id: "displayName",
    enableSorting: true,
    header: () => t("features.directory.column.name"),
    cell: ({ row }) => h(UserInfo, { user: row.original }),
  },
  {
    id: "employeeNo",
    enableSorting: true,
    header: () => t("features.directory.column.employeeNo"),
    cell: ({ row }) =>
      h("span", { class: "font-mono text-sm" }, row.original.employeeNo ?? "—"),
  },
  {
    id: "deptPath",
    enableSorting: false,
    header: () => t("features.directory.column.dept"),
    cell: ({ row }) =>
      h("span", { class: "text-sm" }, row.original.deptPath ?? "—"),
  },
  {
    id: "mainPostName",
    enableSorting: false,
    header: () => t("features.directory.column.mainPost"),
    cell: ({ row }) =>
      h("span", { class: "text-sm" }, row.original.mainPostName ?? "—"),
  },
  {
    id: "phone",
    enableSorting: false,
    header: () => t("features.directory.column.phone"),
    cell: ({ row }) =>
      h("span", { class: "text-sm" }, row.original.phone ?? "—"),
  },
  {
    id: "email",
    enableSorting: false,
    header: () => t("features.directory.column.email"),
    cell: ({ row }) =>
      h("span", { class: "text-sm" }, row.original.email ?? "—"),
  },
  {
    id: "entryDate",
    enableSorting: true,
    header: () => t("features.directory.column.entryDate"),
    cell: ({ row }) =>
      h("span", { class: "text-sm" }, row.original.entryDate ?? "—"),
  },
  {
    id: "employmentStatus",
    enableSorting: false,
    header: () => t("features.directory.column.status"),
    cell: ({ row }) =>
      h(UBadge, {
        color:
          row.original.employmentStatus === "employed" ? "success" : "error",
        label: t(
          row.original.employmentStatus === "employed"
            ? "features.directory.filter.employed"
            : "features.directory.filter.resigned",
        ),
        variant: "soft",
      }),
  },
]);

const table: AppTable<DirectoryEntry> = useVueTable({
  get data() {
    return data.value;
  },
  get columns() {
    return columns.value;
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getRowId: (row: DirectoryEntry) => row.id,
  // 服务端分页 + 服务端排序：状态由列表 store 驱动（受控），仅取数
  manualPagination: true,
  manualSorting: true,
  // pageCount 必须用 getter 实时求值（写死会导致翻页被 clamp）
  get pageCount() {
    return Math.max(1, Math.ceil(pagination.value.total / store.pageSize));
  },
  state: {
    get pagination() {
      return { pageIndex: store.page - 1, pageSize: store.pageSize };
    },
    get sorting() {
      return store.sorting;
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
  onSortingChange: (updater) => {
    const next =
      typeof updater === "function" ? updater(store.sorting) : updater;

    store.setSorting(next);
  },
});
</script>

<script lang="ts">
export default { name: "DirectoryPage" };
</script>

<template>
  <div class="flex w-full flex-col pb-8">
    <div
      class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]"
    >
      <!-- 左栏：组织树面板（与组织管理共用；树点击即筛选组织及下级） -->
      <DeptTreePanel
        :empty-title="t('features.depts.tree.empty')"
        :is-loading="treeQuery.isLoading.value"
        :is-fetching="treeQuery.isFetching.value"
        :nodes="tree"
        :selected-id="store.filters.deptId"
        @select="selectDept"
      >
        <template v-if="store.filters.deptId" #header-action>
          <UButton
            :aria-label="t('features.directory.filter.showAll')"
            class="p-1"
            color="neutral"
            icon="i-lucide-filter-x"
            size="sm"
            variant="ghost"
            @click="clearDeptFilter"
          />
        </template>
      </DeptTreePanel>

      <!-- 右栏：人员列表 -->
      <div class="flex min-w-0 flex-col">
        <DataTableToolbar>
          <UInput
            v-model="searchInput"
            :aria-label="t('features.directory.search.placeholder')"
            :placeholder="t('features.directory.search.placeholder')"
            class="w-56"
            icon="i-lucide-search"
            size="sm"
            @keyup.enter="applySearch"
          />
          <USelect
            :aria-label="t('features.directory.filter.employment')"
            :items="employmentOptions"
            :model-value="store.filters.employmentStatus ?? undefined"
            :placeholder="t('common.datatable.filterAll')"
            class="w-36"
            size="sm"
            value-key="value"
            @update:model-value="
              (value: unknown) =>
                store.setFilters({
                  employmentStatus: value ? String(value) : null,
                })
            "
          />
          <DataTableSearchReset
            :can-reset="canReset"
            :fetching="isFetching"
            @reset="resetFilters"
            @search="applySearch"
          />
          <template #actions>
            <UButton
              v-if="canExport"
              :label="t('features.directory.export.button')"
              :loading="isExporting"
              icon="i-lucide-download"
              size="sm"
              variant="outline"
              @click="handleExport"
            />
          </template>
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
      </div>
    </div>
  </div>
</template>

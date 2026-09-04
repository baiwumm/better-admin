import type { DirectoryEntry } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/common/data-table/table-types";
import type { DirectoryListParams } from "./directory-api";

import { useQuery } from "@tanstack/react-query";
import { Button, Chip, SearchField, toast, Typography } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";
import { useTable } from "@tanstack/react-table";
import { Download, FilterX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "./dept-api";
import {
  DIRECTORY_EXPORT_MAX_ROWS,
  DirectoryExportLimitError,
  exportDirectoryExcel,
} from "./directory-export";
import { DeptTreePanel } from "./dept-tree-panel";

import { DataTable } from "@/components/common/data-table";
import { ErrorContent } from "@/components/common/error-content/error-content";
import {
  DataTableFilterSelect,
  DataTablePagination,
  DataTableSearchReset,
  DataTableToolbar,
  buildColumnSettingKey,
} from "@/components/common/data-table";
import { appTableFeatures } from "@/components/common/data-table/table-types";
import { UserInfo } from "@/components/common/user-info/user-info";
import { createListStore } from "@/hooks/create-list-store";
import { useListQuery } from "@/hooks/use-list-query";
import { useTranslation } from "@/i18n";
import { useMenuPermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 人员通讯录页（契约 v1.6.0 阶段 2）：左树右表布局。
 *
 * - 左栏组织树点击即筛选（该组织及全部下级组织的人员，递归），
 *   再次进入「全部人员」清除组织筛选；
 * - 组织筛选与 URL Query 双向同步（/org/directory?deptId=xxx）：
 *   架构图谱节点点击跳转的落点（阶段 4 交互规范），刷新 / 分享 / 前进后退稳定；
 * - 在职状态缺省 employed（离职人员默认不展示，PRD 3.3.5）；
 *   可显式筛选离职 / 全部；
 * - 数据源为服务端分页联查（users × depts × user_posts × posts），实时无缓存；
 * - 工具栏支持导出当前筛选结果为 Excel（分页批量汇总，见 directory-export.ts）。
 */

/** 列表 store（模块级单例：保活实例复用同一份分页/筛选状态） */
const useDirectoryListStore = createListStore<{
  deptId: string | null;
  employmentStatus: string | null;
}>({
  deptId: null,
  // 默认「在职」（PRD 3.3.5 离职人员默认不展示）；「全部」(null) 映射后端 all
  employmentStatus: "employed",
});

export function DirectoryPage({
  urlDeptId = null,
}: {
  /** URL Query deptId（架构图谱跳转落点；null = 无组织筛选） */
  urlDeptId?: string | null;
}) {
  const { t } = useTranslation();
  // 导出为敏感操作（批量数据外带）：按 EXPORT 位门控（v1.7.1，仅通讯录菜单声明）
  const { canExport } = useMenuPermissions();
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.user?.id);
  // 组织树（左栏筛选；与组织/岗位页共享缓存）
  const treeQuery = useQuery({
    queryKey: DEPTS_TREE_QUERY_KEY,
    queryFn: fetchDeptTree,
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
  const tree = useMemo(() => treeQuery.data ?? [], [treeQuery.data]);

  // ---------------- 列表（服务端分页 + 筛选 + 排序） ----------------
  const page = useDirectoryListStore((s) => s.page);
  const pageSize = useDirectoryListStore((s) => s.pageSize);
  const search = useDirectoryListStore((s) => s.search);
  const sorting = useDirectoryListStore((s) => s.sorting);
  const filters = useDirectoryListStore((s) => s.filters);
  const setSearch = useDirectoryListStore((s) => s.setSearch);
  const setPage = useDirectoryListStore((s) => s.setPage);
  const setPageSize = useDirectoryListStore((s) => s.setPageSize);
  const setSorting = useDirectoryListStore((s) => s.setSorting);
  const setFilters = useDirectoryListStore((s) => s.setFilters);
  const resetStore = useDirectoryListStore((s) => s.reset);

  const { data, pagination, isLoading, isFetching, isError, refetch } =
    useListQuery<
      DirectoryEntry,
      { deptId: string | null; employmentStatus: string | null }
    >({
      store: useDirectoryListStore,
      queryKeyPrefix: ["org", "directory", "list"],
      path: "/org/directory",
      // 后端搜索参数名为 keyword（/org/* 统一命名）
      searchParam: "keyword",
      buildFilters: (f) => ({
        ...(f.deptId ? { deptId: f.deptId } : {}),
        // FilterSelect 首项「全部」(null) 映射后端 all；store 默认 employed
        employmentStatus: f.employmentStatus ?? "all",
      }),
    });

  // 搜索（提交式后端过滤：姓名 / 工号 / 登录名）
  const [searchInput, setSearchInput] = useState(search);
  const applySearch = useCallback(
    () => setSearch(searchInput.trim()),
    [setSearch, searchInput],
  );
  const searchDirty = searchInput.trim() !== search;

  // URL Query → 列表 store（图谱跳转 / 刷新 / 前进后退恢复组织筛选）
  useEffect(() => {
    const current = useDirectoryListStore.getState().filters.deptId;

    if (current !== urlDeptId) {
      setFilters({ deptId: urlDeptId });
    }
  }, [urlDeptId, setFilters]);

  // store → URL（页内树点击 / 清除时同步地址栏，保证分享与刷新一致；
  // replace 避免每次点击都塞历史记录）
  const syncDeptIdToUrl = useCallback(
    (deptId: string | null) => {
      void navigate({
        replace: true,
        search: { deptId: deptId ?? undefined },
        to: "/org/directory",
      });
    },
    [navigate],
  );

  const resetFilters = useCallback(() => {
    setSearchInput("");
    resetStore();
    syncDeptIdToUrl(null);
  }, [resetStore, syncDeptIdToUrl]);

  // ---------------- 导出 Excel（write-excel-file 触发时动态加载） ----------------
  const [isExporting, setIsExporting] = useState(false);
  const handleExport = useCallback(() => {
    if (isExporting) {
      return;
    }
    setIsExporting(true);
    const sortField = sorting[0]?.id;
    const task = exportDirectoryExcel({
      params: {
        keyword: search || undefined,
        deptId: filters.deptId ?? undefined,
        employmentStatus: (filters.employmentStatus ??
          "all") as DirectoryListParams["employmentStatus"],
        ...(sortField
          ? {
              sort: sortField,
              order: sorting[0].desc ? ("desc" as const) : ("asc" as const),
            }
          : {}),
      },
      t,
    });

    toast.promise(task, {
      error: (error: unknown) =>
        error instanceof DirectoryExportLimitError
          ? t("features.directory.export.limitExceeded", {
              max: DIRECTORY_EXPORT_MAX_ROWS,
            })
          : error instanceof Error
            ? error.message
            : String(error),
      loading: t("features.directory.export.loading"),
      success: (count: number) =>
        t("features.directory.export.success", { count }),
    });
    void task.finally(() => setIsExporting(false));
  }, [isExporting, sorting, search, filters, t]);

  const employmentOptions = useMemo(
    () => [
      // FilterSelect 自带头项「全部」（null → 后端 all），选项只给两个具体状态
      { value: "employed", label: t("features.directory.filter.employed") },
      { value: "resigned", label: t("features.directory.filter.resigned") },
    ],
    [t],
  );

  const columns = useMemo<AppColumnDef<DirectoryEntry>[]>(
    () => [
      {
        id: "displayName",
        enableSorting: true,
        header: t("features.directory.column.name"),
        cell: ({ row }) => <UserInfo subtitle="username" user={row.original} />,
      },
      {
        id: "employeeNo",
        enableSorting: true,
        header: t("features.directory.column.employeeNo"),
        cell: ({ row }) => (
          <Typography className="font-mono" type="body-sm">
            {row.original.employeeNo ?? "—"}
          </Typography>
        ),
      },
      {
        id: "deptPath",
        enableSorting: false,
        header: t("features.directory.column.dept"),
        cell: ({ row }) => (
          <Typography type="body-sm">{row.original.deptPath ?? "—"}</Typography>
        ),
      },
      {
        id: "mainPostName",
        enableSorting: false,
        header: t("features.directory.column.mainPost"),
        cell: ({ row }) => (
          <Typography type="body-sm">
            {row.original.mainPostName ?? "—"}
          </Typography>
        ),
      },
      {
        id: "phone",
        enableSorting: false,
        header: t("features.directory.column.phone"),
        cell: ({ row }) => (
          <Typography type="body-sm">{row.original.phone ?? "—"}</Typography>
        ),
      },
      {
        id: "email",
        enableSorting: false,
        header: t("features.directory.column.email"),
        cell: ({ row }) => (
          <Typography type="body-sm">{row.original.email ?? "—"}</Typography>
        ),
      },
      {
        id: "entryDate",
        enableSorting: true,
        header: t("features.directory.column.entryDate"),
        cell: ({ row }) => (
          <Typography type="body-sm">
            {row.original.entryDate ?? "—"}
          </Typography>
        ),
      },
      {
        id: "employmentStatus",
        enableSorting: false,
        meta: { align: "center" },
        header: t("features.directory.column.status"),
        cell: ({ row }) => (
          <Chip
            color={
              row.original.employmentStatus === "employed"
                ? "success"
                : "danger"
            }
            size="sm"
            variant="soft"
          >
            {t(
              row.original.employmentStatus === "employed"
                ? "features.directory.filter.employed"
                : "features.directory.filter.resigned",
            )}
          </Chip>
        ),
      },
    ],
    [t],
  );

  const total = pagination?.total ?? 0;

  const table = useTable({
    columns,
    data: data ?? [],
    features: appTableFeatures,
    getRowId: (row) => row.id,
    // 服务端分页 + 服务端排序：状态由列表 store 驱动（受控），仅取数
    manualPagination: true,
    manualSorting: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    state: {
      pagination: { pageIndex: page - 1, pageSize },
      sorting,
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize })
          : updater;

      if (next.pageSize !== pageSize) {
        setPageSize(next.pageSize);
      } else {
        setPage(next.pageIndex + 1);
      }
    },
    onSortingChange: (updater) => {
      setSorting(typeof updater === "function" ? updater(sorting) : updater);
    },
  });

  return (
    <div className="flex w-full flex-col pb-8">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* 左栏：组织树面板（与组织管理共用 DeptTreePanel；树点击即筛选组织及下级） */}
        <DeptTreePanel
          emptyTitle={t("features.depts.tree.empty")}
          headerAction={
            filters.deptId ? (
              <Button
                isIconOnly
                aria-label={t("features.directory.filter.showAll")}
                size="sm"
                variant="ghost"
                onPress={() => {
                  setFilters({ deptId: null });
                  syncDeptIdToUrl(null);
                }}
              >
                <FilterX className="size-4" />
              </Button>
            ) : undefined
          }
          isLoading={treeQuery.isLoading}
          nodes={tree}
          selectedId={filters.deptId}
          onSelect={(node) => {
            setFilters({ deptId: node.id });
            syncDeptIdToUrl(node.id);
          }}
        />

        {/* 右栏：人员列表 */}
        <div className="flex min-w-0 flex-col">
          <DataTableToolbar
            columnSettingKey={
              userId
                ? buildColumnSettingKey(userId, "/org/directory")
                : undefined
            }
            table={table}
          >
            <SearchField
              aria-label={t("features.directory.search.placeholder")}
              className="w-56"
              value={searchInput}
              variant="secondary"
              onChange={setSearchInput}
              onSubmit={applySearch}
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  placeholder={t("features.directory.search.placeholder")}
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <DataTableFilterSelect
              aria-label={t("features.directory.filter.employment")}
              options={employmentOptions}
              value={filters.employmentStatus}
              onChange={(value) =>
                setFilters({ employmentStatus: value ?? null })
              }
            />
            <DataTableSearchReset
              canReset={
                searchDirty ||
                search !== "" ||
                Boolean(filters.deptId) ||
                filters.employmentStatus !== "employed"
              }
              isFetching={isFetching}
              searchDirty={searchDirty}
              onReset={resetFilters}
              onSearch={applySearch}
            />
            {canExport && (
              <Button
                isPending={isExporting}
                size="sm"
                variant="outline"
                onPress={handleExport}
              >
                <Download aria-hidden className="size-4" />
                {t("features.directory.export.button")}
              </Button>
            )}
          </DataTableToolbar>

          {isError ? (
            <ErrorContent
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => void refetch()}
                >
                  {t("common.retry")}
                </Button>
              }
              title={t("common.loadError")}
            />
          ) : (
            <DataTable
              aria-label={t("menu.pageTitle.directory")}
              className="w-full"
              contentClassName="min-w-[900px]"
              isLoading={isLoading || isFetching}
              table={table}
            />
          )}
          <DataTablePagination table={table} total={total} />
        </div>
      </div>
    </div>
  );
}

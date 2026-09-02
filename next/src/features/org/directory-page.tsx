"use client";

import type { DirectoryEntry } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/common/data-table/table-types";

import { useQuery } from "@tanstack/react-query";
import { Button, Chip, SearchField, Typography } from "@heroui/react";
import { useTable } from "@tanstack/react-table";
import { FilterX } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "./dept-api";
import { DeptTreePanel } from "./dept-tree-panel";

import { DataTable } from "@/components/common/data-table";
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
import { useAuthStore } from "@/stores/auth-store";

/**
 * 人员通讯录页（契约 v1.6.0 阶段 2）：左树右表布局。
 *
 * - 左栏组织树点击即筛选（该组织及全部下级组织的人员，递归），
 *   再次进入「全部人员」清除组织筛选；
 * - 在职状态缺省 employed（离职人员默认不展示，PRD 3.3.5）；
 *   可显式筛选离职 / 全部；
 * - 数据源为服务端分页联查（users × depts × user_posts × posts），实时无缓存。
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

export function DirectoryPage() {
  const { t } = useTranslation();
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

  const { data, pagination, isLoading, isFetching } = useListQuery<
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

  const resetFilters = useCallback(() => {
    setSearchInput("");
    resetStore();
  }, [resetStore]);

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
                onPress={() => setFilters({ deptId: null })}
              >
                <FilterX className="size-4" />
              </Button>
            ) : undefined
          }
          isLoading={treeQuery.isLoading}
          nodes={tree}
          selectedId={filters.deptId}
          onSelect={(node) => setFilters({ deptId: node.id })}
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
          </DataTableToolbar>

          <DataTable
            aria-label={t("menu.pageTitle.directory")}
            className="w-full"
            contentClassName="min-w-[900px]"
            isLoading={isLoading || isFetching}
            table={table}
          />
          <DataTablePagination table={table} total={total} />
        </div>
      </div>
    </div>
  );
}

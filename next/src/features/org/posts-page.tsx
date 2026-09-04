"use client";

import type { Post } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/common/data-table/table-types";
import type { PostFormMode } from "./post-form-dialog";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Chip,
  Dropdown,
  Label,
  SearchField,
  Typography,
  toast,
  useOverlayState,
} from "@heroui/react";
import { useTable } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { deletePost, getPostErrorMessage } from "./post-api";
import { PostFormDialog } from "./post-form-dialog";
import { PostMembersDrawer } from "./post-members-drawer";
import { DeptTreeSelect } from "./dept-tree-select";
import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "./dept-api";

import { ConfirmDialog } from "@/components/common/confirm-dialog/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import {
  DataTableFilterSelect,
  DataTablePagination,
  DataTableSearchReset,
  DataTableToolbar,
  buildColumnSettingKey,
} from "@/components/common/data-table";
import { appTableFeatures } from "@/components/common/data-table/table-types";
import { createListStore } from "@/hooks/create-list-store";
import { useListQuery } from "@/hooks/use-list-query";
import { useMenuPermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 岗位管理页（契约 v1.6.0 阶段 2）：筛选区 + 服务端分页表格。
 *
 * - 筛选：所属组织（DeptTreeSelect，含下级组织的岗位）+ 关键词 + 类别 + 状态；
 * - 列表状态入 feature store（keepAlive 友好），由 useListQuery 装配；
 * - 组织树复用 GET /org/depts/tree 查询缓存（与组织管理页同 key）；
 * - 「在职人数」列点击打开成员穿透抽屉；删除由后端在职校验 409 拦截。
 */

/** 列表 store（模块级单例：保活实例复用同一份分页/筛选状态） */
const usePostsListStore = createListStore<{
  deptId: string | null;
  category: string | null;
  status: string | null;
}>({
  deptId: null,
  category: null,
  status: null,
});

export function PostsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const { canAdd, canEdit, canDelete } = useMenuPermissions();

  // 组织树（所属组织筛选与表单共用；与组织管理页共享缓存）
  const treeQuery = useQuery({
    queryKey: DEPTS_TREE_QUERY_KEY,
    queryFn: fetchDeptTree,
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
  const tree = useMemo(() => treeQuery.data ?? [], [treeQuery.data]);

  // ---------------- 列表（服务端分页 + 筛选 + 排序） ----------------
  const page = usePostsListStore((s) => s.page);
  const pageSize = usePostsListStore((s) => s.pageSize);
  const search = usePostsListStore((s) => s.search);
  const sorting = usePostsListStore((s) => s.sorting);
  const filters = usePostsListStore((s) => s.filters);
  const setSearch = usePostsListStore((s) => s.setSearch);
  const setPage = usePostsListStore((s) => s.setPage);
  const setPageSize = usePostsListStore((s) => s.setPageSize);
  const setSorting = usePostsListStore((s) => s.setSorting);
  const setFilters = usePostsListStore((s) => s.setFilters);
  const resetStore = usePostsListStore((s) => s.reset);

  const { data, pagination, isLoading, isFetching } = useListQuery<
    Post,
    { deptId: string | null; category: string | null; status: string | null }
  >({
    store: usePostsListStore,
    queryKeyPrefix: ["org", "posts", "list"],
    path: "/org/posts",
    // 后端搜索参数名为 keyword（/org/* 统一命名）
    searchParam: "keyword",
    buildFilters: (f) => ({
      ...(f.deptId ? { deptId: f.deptId } : {}),
      ...(f.category ? { category: f.category } : {}),
      ...(f.status ? { status: f.status } : {}),
    }),
  });

  // 搜索（提交式后端过滤：岗位名称）
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

  const setDeptId = useCallback(
    (deptId: string) => setFilters({ deptId: deptId || null }),
    [setFilters],
  );

  const categoryOptions = useMemo(
    () =>
      (["management", "professional", "production"] as const).map((value) => ({
        value,
        label: t(`features.posts.category.${value}`),
      })),
    [t],
  );
  const statusOptions = useMemo(
    () => [
      { value: "enabled", label: t("features.posts.status.enabled") },
      { value: "disabled", label: t("features.posts.status.disabled") },
    ],
    [t],
  );

  // ---------------- 弹窗状态（useOverlayState，§7.2 受控浮层语义） ----------------
  const formDialog = useOverlayState();
  const membersDrawer = useOverlayState();
  const deleteDialog = useOverlayState();

  const [formContext, setFormContext] = useState<{
    mode: PostFormMode;
    post: Post | null;
  }>({ mode: "create", post: null });
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [membersTarget, setMembersTarget] = useState<Post | null>(null);

  const invalidateList = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ["org", "posts", "list"],
    });
    // 组织/用户侧的岗位计数与通讯录主岗随岗位变化，一并失效
    void queryClient.invalidateQueries({ queryKey: DEPTS_TREE_QUERY_KEY });
  }, [queryClient]);

  const openCreate = useCallback(() => {
    setFormContext({ mode: "create", post: null });
    formDialog.open();
  }, [formDialog]);

  const openEdit = useCallback(
    (post: Post) => {
      setFormContext({ mode: "edit", post });
      formDialog.open();
    },
    [formDialog],
  );

  const openDelete = useCallback(
    (post: Post) => {
      setDeleteTarget(post);
      deleteDialog.open();
    },
    [deleteDialog],
  );

  const openMembers = useCallback(
    (post: Post) => {
      setMembersTarget(post);
      membersDrawer.open();
    },
    [membersDrawer],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: () => {
      invalidateList();
      toast.success(t("features.posts.message.deleted"));
    },
    onError: (error) => {
      toast.danger(getPostErrorMessage(error));
    },
  });

  const columns = useMemo<AppColumnDef<Post>[]>(
    () => [
      {
        id: "name",
        enableSorting: true,
        header: t("features.posts.column.name"),
        cell: ({ row }) => (
          <Typography className="font-medium" type="body-sm">
            {row.original.name}
          </Typography>
        ),
      },
      {
        id: "deptPath",
        enableSorting: false,
        header: t("features.posts.column.dept"),
        cell: ({ row }) => (
          <Typography type="body-sm">{row.original.deptPath || "—"}</Typography>
        ),
      },
      {
        id: "category",
        enableSorting: false,
        meta: { align: "center" },
        header: t("features.posts.column.category"),
        cell: ({ row }) => (
          <Chip size="sm" variant="soft">
            {t(`features.posts.category.${row.original.category}`)}
          </Chip>
        ),
      },
      {
        id: "rank",
        enableSorting: false,
        meta: { align: "center" },
        header: t("features.posts.column.rank"),
        cell: ({ row }) => (
          <Typography className="font-mono" type="body-sm">
            {row.original.rank || "—"}
          </Typography>
        ),
      },
      {
        id: "userCount",
        enableSorting: false,
        meta: { align: "center" },
        header: t("features.posts.column.userCount"),
        cell: ({ row }) => (
          <button
            className="rounded-2xl px-2 py-1 text-sm underline-offset-4 transition-colors hover:bg-default/60 hover:underline"
            type="button"
            onClick={() => openMembers(row.original)}
          >
            {row.original.userCount}
          </button>
        ),
      },
      {
        id: "status",
        enableSorting: false,
        meta: { align: "center" },
        header: t("features.posts.column.status"),
        cell: ({ row }) => (
          <Chip
            color={row.original.status === "enabled" ? "success" : "danger"}
            size="sm"
            variant="soft"
          >
            {t(
              row.original.status === "enabled"
                ? "features.posts.status.enabled"
                : "features.posts.status.disabled",
            )}
          </Chip>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        meta: { align: "center" },
        header: t("common.actions"),
        cell: ({ row }) => {
          if (!canEdit && !canDelete) return null;

          return (
            <Dropdown>
              <Button
                isIconOnly
                aria-label={t("common.actions")}
                size="sm"
                variant="ghost"
              >
                <MoreHorizontal className="size-4" />
              </Button>
              <Dropdown.Popover className="min-w-36">
                <Dropdown.Menu
                  onAction={(key) => {
                    if (key === "edit") openEdit(row.original);
                    if (key === "delete") openDelete(row.original);
                  }}
                >
                  {canEdit && (
                    <Dropdown.Item id="edit" textValue={t("common.edit")}>
                      <Pencil className="size-4 shrink-0 text-muted" />
                      <Label>{t("common.edit")}</Label>
                    </Dropdown.Item>
                  )}
                  {canDelete && (
                    <Dropdown.Item
                      id="delete"
                      textValue={t("common.delete")}
                      variant="danger"
                    >
                      <Trash2 className="size-4 shrink-0 text-danger" />
                      <Label>{t("common.delete")}</Label>
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          );
        },
      },
    ],
    [t, canEdit, canDelete, openEdit, openDelete, openMembers],
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
      <DataTableToolbar
        columnSettingKey={
          userId ? buildColumnSettingKey(userId, "/org/posts") : undefined
        }
        table={table}
      >
        <div className="w-56">
          <DeptTreeSelect
            ariaLabel={t("features.posts.filter.dept")}
            className="w-full"
            tree={tree}
            value={filters.deptId ?? ""}
            onChange={setDeptId}
          />
        </div>
        <DataTableFilterSelect
          aria-label={t("features.posts.filter.category")}
          options={categoryOptions}
          value={filters.category}
          onChange={(value) => setFilters({ category: value ?? null })}
        />
        <DataTableFilterSelect
          aria-label={t("features.posts.filter.status")}
          options={statusOptions}
          value={filters.status}
          onChange={(value) => setFilters({ status: value ?? null })}
        />
        <SearchField
          aria-label={t("features.posts.search.placeholder")}
          className="w-56"
          value={searchInput}
          variant="secondary"
          onChange={setSearchInput}
          onSubmit={applySearch}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder={t("features.posts.search.placeholder")}
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <DataTableSearchReset
          canReset={
            searchDirty ||
            search !== "" ||
            Boolean(filters.deptId) ||
            Boolean(filters.category) ||
            Boolean(filters.status)
          }
          isFetching={isFetching}
          searchDirty={searchDirty}
          onReset={resetFilters}
          onSearch={applySearch}
        />
        {canAdd && (
          <Button size="sm" variant="outline" onPress={openCreate}>
            <Plus className="size-4" />
            {t("features.posts.action.add")}
          </Button>
        )}
      </DataTableToolbar>

      <DataTable
        aria-label={t("menu.pageTitle.posts")}
        className="w-full"
        contentClassName="min-w-[860px]"
        isLoading={isLoading || isFetching}
        table={table}
      />
      <DataTablePagination table={table} total={total} />

      <PostFormDialog
        isOpen={formDialog.isOpen}
        mode={formContext.mode}
        post={formContext.post}
        tree={tree}
        onOpenChange={formDialog.setOpen}
        onSaved={invalidateList}
      />

      <PostMembersDrawer post={membersTarget} state={membersDrawer} />

      <ConfirmDialog
        destructive
        confirmKeyword={deleteTarget?.name}
        confirmText={t("common.delete")}
        description={t("features.posts.message.deleteDesc", {
          name: deleteTarget?.name ?? "",
        })}
        isLoading={deleteMutation.isPending}
        keywordLabel={t("features.posts.message.deleteKeyword")}
        state={{
          isOpen: deleteDialog.isOpen,
          setOpen: deleteDialog.setOpen,
          close: deleteDialog.close,
        }}
        title={t("features.posts.message.deleteTitle")}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(deleteTarget!.id);
        }}
      />
    </div>
  );
}

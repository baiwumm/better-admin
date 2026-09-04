"use client";

import type { Notice, NoticeDetail, NoticeScope } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/common/data-table/table-types";
import type { NoticeFormMode } from "./notice-form-dialog";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import {
  Avatar,
  Button,
  Chip,
  Dropdown,
  Label,
  ProgressBar,
  SearchField,
  Tooltip,
  Typography,
  toast,
  useOverlayState,
} from "@heroui/react";
import { useTable } from "@tanstack/react-table";
import { Eye, MoreHorizontal, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "../org/dept-api";

import {
  deleteNotice,
  getNoticeErrorMessage,
  withdrawNotice,
} from "./notice-api";
import { NoticeDetailDrawer } from "./notice-detail-drawer";

// 发布/编辑弹窗含 Tiptap 富文本（重依赖）：懒加载，不拖累列表页首屏模块图
const NoticeFormDialog = lazy(() =>
  import("./notice-form-dialog").then((m) => ({ default: m.NoticeFormDialog })),
);

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
import { UserInfo } from "@/components/common/user-info/user-info";
import { createListStore } from "@/hooks/create-list-store";
import { useMenuPermissions } from "@/hooks/use-permissions";
import { useListQuery } from "@/hooks/use-list-query";
import { useDict } from "@/stores/dict-store";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 公告管理页（契约 v1.7.0 阶段 3）：服务端分页列表（keyword/status 筛选，
 * 含范围人数与已读率）+ 发布/编辑弹窗（Tiptap 富文本 + 三粒度范围选择器 +
 * 定时发布）+ 详情抽屉（已读/未读 Tab + 一键催办）+ 撤回/删除。
 */

/** 列表 store（模块级单例：保活实例复用同一份分页/筛选状态） */
const useNoticesListStore = createListStore<{ status: string | null }>({
  status: null,
});

const SCOPE_TYPE_TAGS = ["dept", "post", "user"] as const;

/** 发布范围摘要单格展示字数上限（超长截断 + Tooltip 完整提示） */
const SCOPE_SUMMARY_LIMIT = 20;

/**
 * 发布范围摘要：按类型分组回填 targetName，组间「；」分隔、组内「、」连接。
 * 例：「岗位：前端组、测试；人员：张三、李四」。目标已删除（targetName 为 null）
 * 用「已删除」占位；无 scopes 返回空串（列渲染降级为「—」）。
 */
function formatScopeSummary(
  scopes: NoticeScope[] | undefined,
  t: (key: string) => string,
): string {
  if (!scopes || scopes.length === 0) return "";

  const groups: string[] = [];

  for (const type of SCOPE_TYPE_TAGS) {
    const names = scopes
      .filter((s) => s.scopeType === type)
      .map((s) => s.targetName ?? t("features.notices.scope.deleted"));

    if (names.length === 0) continue;
    groups.push(
      `${t(`features.notices.scope.${type}Tag`)}：${names.join("、")}`,
    );
  }

  return groups.join("；");
}

export function NoticesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const currentUserIsSuperAdmin = useAuthStore(
    (state) => state.user?.roles.includes("super_admin") ?? false,
  );
  const { canAdd, canEdit, canDelete } = useMenuPermissions();

  // 发布人本人或 super_admin 才显示编辑/撤回/删除入口（与后端保护一致）
  const isOperator = useCallback(
    (notice: Notice) =>
      notice.publisherId === currentUserId || currentUserIsSuperAdmin,
    [currentUserId, currentUserIsSuperAdmin],
  );

  // ---------------- 列表（服务端分页 + 筛选 + 排序） ----------------
  const page = useNoticesListStore((s) => s.page);
  const pageSize = useNoticesListStore((s) => s.pageSize);
  const search = useNoticesListStore((s) => s.search);
  const sorting = useNoticesListStore((s) => s.sorting);
  const filters = useNoticesListStore((s) => s.filters);
  const setSearch = useNoticesListStore((s) => s.setSearch);
  const setPage = useNoticesListStore((s) => s.setPage);
  const setPageSize = useNoticesListStore((s) => s.setPageSize);
  const setSorting = useNoticesListStore((s) => s.setSorting);
  const setFilters = useNoticesListStore((s) => s.setFilters);
  const resetStore = useNoticesListStore((s) => s.reset);

  const { data, pagination, isLoading, isFetching } = useListQuery<
    Notice,
    { status: string | null }
  >({
    store: useNoticesListStore,
    queryKeyPrefix: ["notices", "list"],
    path: "/notices",
    // 后端标题搜索参数名为 keyword（与 /org/* 系列统一命名）
    searchParam: "keyword",
    buildFilters: (f) => (f.status ? { status: f.status } : {}),
  });

  // 搜索（提交式后端过滤：标题）
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

  // 状态字典驱动（notice_status：draft/published/withdrawn，字典管理可维护文案）
  const noticeStatusDict = useDict("notice_status");
  const statusOptions = useMemo(
    () =>
      noticeStatusDict.map((item) => ({
        value: item.value,
        label: item.i18nKey ? t(item.i18nKey) : item.label,
      })),
    [noticeStatusDict, t],
  );

  const statusLabel = useCallback(
    (value: string) => {
      const item = noticeStatusDict.find((d) => d.value === value);

      return item ? (item.i18nKey ? t(item.i18nKey) : item.label) : value;
    },
    [noticeStatusDict, t],
  );

  // 组织树（发布范围选择器数据源，与组织/岗位页共享缓存）
  const treeQuery = useQuery({
    queryKey: DEPTS_TREE_QUERY_KEY,
    queryFn: fetchDeptTree,
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
  const deptTree = useMemo(() => treeQuery.data ?? [], [treeQuery.data]);

  // ---------------- 缓存失效 ----------------
  const invalidateList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["notices", "list"] });
  }, [queryClient]);

  // ---------------- 弹窗状态（useOverlayState，§7.2 受控浮层语义） ----------------
  const formDialog = useOverlayState();
  const detailDrawer = useOverlayState();
  const deleteDialog = useOverlayState();

  const [formContext, setFormContext] = useState<{
    mode: NoticeFormMode;
    noticeId: string | null;
  }>({ mode: "create", noticeId: null });
  const [detailTarget, setDetailTarget] = useState<Notice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notice | null>(null);

  const openCreate = useCallback(() => {
    setFormContext({ mode: "create", noticeId: null });
    formDialog.open();
  }, [formDialog]);

  const openEdit = useCallback(
    (notice: Notice) => {
      setFormContext({ mode: "edit", noticeId: notice.id });
      formDialog.open();
    },
    [formDialog],
  );

  const openDetail = useCallback(
    (notice: Notice) => {
      setDetailTarget(notice);
      detailDrawer.open();
    },
    [detailDrawer],
  );

  const openDelete = useCallback(
    (notice: Notice) => {
      setDeleteTarget(notice);
      deleteDialog.open();
    },
    [deleteDialog],
  );

  const withdrawMutation = useMutation({
    mutationFn: (id: string) => withdrawNotice(id),
    onSuccess: () => invalidateList(),
  });

  const handleWithdraw = useCallback(
    (id: string) => {
      toast.promise(withdrawMutation.mutateAsync(id), {
        loading: t("features.notices.action.withdrawing"),
        success: t("features.notices.message.withdrawn"),
        error: (error) => getNoticeErrorMessage(error),
      });
    },
    [withdrawMutation, t],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotice(id),
    onSuccess: () => {
      invalidateList();
      toast.success(t("features.notices.message.deleted"));
    },
    onError: (error) => {
      toast.danger(getNoticeErrorMessage(error));
    },
  });

  const columns = useMemo<AppColumnDef<Notice>[]>(
    () => [
      {
        id: "title",
        enableSorting: true,
        header: t("features.notices.column.title"),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            {row.original.isTop && (
              <Chip color="warning" size="sm" variant="soft">
                {t("features.notices.status.top")}
              </Chip>
            )}
            <Typography
              className="max-w-72 truncate font-medium"
              type="body-sm"
            >
              {row.original.title}
            </Typography>
          </div>
        ),
      },
      {
        id: "publisherName",
        enableSorting: false,
        header: t("features.notices.column.publisher"),
        cell: ({ row }) => {
          const notice = row.original;

          // 发布人被删除（publisherId 置空）时整体占位；否则头像 + 名称 + 邮箱
          return (
            <UserInfo
              user={
                notice.publisherId && notice.publisherName
                  ? {
                      username: notice.publisherName,
                      displayName: notice.publisherName,
                      email: notice.publisherEmail,
                      avatar: notice.publisherAvatar,
                    }
                  : null
              }
            />
          );
        },
      },
      {
        id: "status",
        enableSorting: false,
        meta: { align: "center" },
        header: t("features.notices.column.status"),
        cell: ({ row }) => (
          <Chip
            color={
              row.original.status === "published"
                ? "success"
                : row.original.status === "draft"
                  ? "default"
                  : "danger"
            }
            size="sm"
            variant="soft"
          >
            {statusLabel(row.original.status)}
          </Chip>
        ),
      },
      {
        id: "scopes",
        enableSorting: false,
        header: t("features.notices.column.scopes"),
        cell: ({ row }) => {
          const summary = formatScopeSummary(row.original.scopes, t);

          if (!summary) {
            return (
              <Typography color="muted" type="body-sm">
                —
              </Typography>
            );
          }

          // 超长截断（限制展示字数）+ Tooltip 完整提示，避免范围摘要撑爆列宽
          const truncated =
            summary.length > SCOPE_SUMMARY_LIMIT
              ? `${summary.slice(0, SCOPE_SUMMARY_LIMIT)}…`
              : summary;

          return (
            <Tooltip delay={0}>
              <Tooltip.Trigger aria-label={summary}>
                <Typography className="max-w-56 truncate" type="body-sm">
                  {truncated}
                </Typography>
              </Tooltip.Trigger>
              <Tooltip.Content>
                {summary}
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip>
          );
        },
      },
      {
        id: "readers",
        enableSorting: false,
        header: t("features.notices.column.readers"),
        cell: ({ row }) => {
          const notice = row.original;
          const readers = notice.readers ?? [];

          // 无已读人员占位；有则头像堆叠（最多 3 个），超出部分 +N（N = readCount - 3）
          if (readers.length === 0) {
            return (
              <Typography color="muted" type="body-sm">
                —
              </Typography>
            );
          }
          const shown = readers.slice(0, 3);
          const extra = Math.max(notice.readCount - shown.length, 0);

          return (
            <div className="flex -space-x-2">
              {shown.map((reader) => (
                <Avatar
                  key={reader.id}
                  className="ring-2 ring-background"
                  size="sm"
                >
                  {reader.avatar ? (
                    <Avatar.Image alt={reader.name} src={reader.avatar} />
                  ) : null}
                  <Avatar.Fallback>{reader.name.slice(0, 1)}</Avatar.Fallback>
                </Avatar>
              ))}
              {extra > 0 && (
                <Avatar className="ring-2 ring-background" size="sm">
                  <Avatar.Fallback className="text-xs">
                    +{extra}
                  </Avatar.Fallback>
                </Avatar>
              )}
            </div>
          );
        },
      },
      {
        id: "readRate",
        enableSorting: false,
        header: t("features.notices.column.readRate"),
        cell: ({ row }) => {
          const rate = row.original.readRate;

          return rate === null ? (
            <Typography color="muted" type="body-sm">
              —
            </Typography>
          ) : (
            <div className="flex min-w-32 items-center gap-2">
              <ProgressBar
                aria-label={t("features.notices.column.readRate")}
                value={Math.round(rate)}
              >
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
              <Typography className="shrink-0" type="body-xs">
                {Math.round(rate)}%
              </Typography>
            </div>
          );
        },
      },
      {
        id: "publishTime",
        enableSorting: true,
        header: t("features.notices.column.publishTime"),
        cell: ({ row }) => (
          <Typography type="body-sm">
            {new Date(row.original.publishTime).toLocaleString()}
          </Typography>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        meta: { align: "center" },
        header: t("common.actions"),
        cell: ({ row }) => {
          const notice = row.original;
          const operator = isOperator(notice);

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
                    if (key === "detail") openDetail(notice);
                    if (key === "edit" && operator) openEdit(notice);
                    if (
                      key === "withdraw" &&
                      operator &&
                      notice.status === "published"
                    ) {
                      handleWithdraw(notice.id);
                    }
                    if (key === "delete" && operator) openDelete(notice);
                  }}
                >
                  <Dropdown.Item
                    id="detail"
                    textValue={t("features.notices.action.detail")}
                  >
                    <Eye className="size-4 shrink-0 text-muted" />
                    <Label>{t("features.notices.action.detail")}</Label>
                  </Dropdown.Item>
                  {canEdit && operator && notice.status !== "withdrawn" && (
                    <Dropdown.Item id="edit" textValue={t("common.edit")}>
                      <Pencil className="size-4 shrink-0 text-muted" />
                      <Label>{t("common.edit")}</Label>
                    </Dropdown.Item>
                  )}
                  {canEdit && operator && notice.status === "published" && (
                    <Dropdown.Item
                      id="withdraw"
                      textValue={t("features.notices.action.withdraw")}
                    >
                      <Undo2 className="size-4 shrink-0 text-muted" />
                      <Label>{t("features.notices.action.withdraw")}</Label>
                    </Dropdown.Item>
                  )}
                  {canDelete && operator && (
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
    [
      t,
      canAdd,
      canEdit,
      canDelete,
      isOperator,
      openDetail,
      openEdit,
      openDelete,
      handleWithdraw,
      statusLabel,
    ],
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
          userId ? buildColumnSettingKey(userId, "/org/notices") : undefined
        }
        table={table}
      >
        <DataTableFilterSelect
          aria-label={t("features.notices.filter.status")}
          options={statusOptions}
          value={filters.status}
          onChange={(value) => setFilters({ status: value ?? null })}
        />
        <SearchField
          aria-label={t("features.notices.search.placeholder")}
          className="w-56"
          value={searchInput}
          variant="secondary"
          onChange={setSearchInput}
          onSubmit={applySearch}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder={t("features.notices.search.placeholder")}
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <DataTableSearchReset
          canReset={searchDirty || search !== "" || Boolean(filters.status)}
          isFetching={isFetching}
          searchDirty={searchDirty}
          onReset={resetFilters}
          onSearch={applySearch}
        />
        {canAdd && (
          <Button size="sm" variant="outline" onPress={openCreate}>
            <Plus className="size-4" />
            {t("features.notices.action.add")}
          </Button>
        )}
      </DataTableToolbar>

      <DataTable
        aria-label={t("menu.pageTitle.notices")}
        className="w-full"
        contentClassName="min-w-[860px]"
        isLoading={isLoading || isFetching}
        table={table}
      />
      <DataTablePagination table={table} total={total} />

      <Suspense fallback={null}>
        <NoticeFormDialog
          isOpen={formDialog.isOpen}
          mode={formContext.mode}
          noticeId={formContext.noticeId}
          tree={deptTree}
          onOpenChange={formDialog.setOpen}
          onSaved={invalidateList}
        />
      </Suspense>

      <NoticeDetailDrawer
        notice={detailTarget as NoticeDetail | null}
        state={detailDrawer}
      />

      <ConfirmDialog
        destructive
        confirmText={t("common.delete")}
        description={t("features.notices.message.deleteDesc", {
          title: deleteTarget?.title ?? "",
        })}
        isLoading={deleteMutation.isPending}
        state={{
          isOpen: deleteDialog.isOpen,
          setOpen: deleteDialog.setOpen,
          close: deleteDialog.close,
        }}
        title={t("features.notices.message.deleteTitle")}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(deleteTarget!.id);
        }}
      />
    </div>
  );
}

"use client";

import type { Log } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/common/data-table/table-types";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
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
import { Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  LOGS_QUERY_KEY,
  batchDeleteLogs,
  deleteLog,
  getLogErrorMessage,
  logOperator,
} from "./log-api";
import {
  LOG_TYPE_VALUES,
  isLogType,
  logTypeColor,
  logTypeLabel,
} from "./log-type";
import { LogDetailDrawer } from "./log-detail-drawer";

import { DataTable } from "@/components/common/data-table";
import {
  DataTableBulkActions,
  DataTableFilterSelect,
  DataTablePagination,
  DataTableSearchReset,
  DataTableSelectAll,
  DataTableSelectRow,
  DataTableToolbar,
  buildColumnSettingKey,
} from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog/confirm-dialog";
import { appTableFeatures } from "@/components/common/data-table/table-types";
import { UserInfo } from "@/components/common/user-info/user-info";
import { dictItemsQueryKey, fetchDictItems } from "@/features/dicts/dict-api";
import { useHasPermissionKey } from "@/hooks/use-permissions";
import { createListStore } from "@/hooks/create-list-store";
import { useListQuery } from "@/hooks/use-list-query";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 日志管理页：服务端分页列表（page/pageSize/search/type）+ 详情抽屉 +
 * 单条/批量删除（契约 v1.4.8）。
 *
 * - 日志为系统自动写入，页面只读：无新增/编辑，仅人工清理（删除）；
 * - 列表固定 created_at 倒序（后端不支持排序参数），不提供排序交互；
 * - 类型筛选与类型显示名以字典管理 log_type 为真源（value 限于契约四枚举，
 *   字典不可用时回退内置 i18n 文案，见 log-type.ts）；
 * - search 仅匹配 action 字段（后端 ILIKE）。
 */

/** 列表 store（模块级单例：保活实例复用同一份分页/筛选状态） */
const useLogsListStore = createListStore<{ type: string | null }>({
  type: null,
});

export function LogsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const canDelete = useHasPermissionKey("DELETE");
  const canBatchDelete = useHasPermissionKey("BATCH_DELETE");

  // ---------------- 列表（服务端分页 + 类型筛选；无排序） ----------------
  const page = useLogsListStore((s) => s.page);
  const pageSize = useLogsListStore((s) => s.pageSize);
  const search = useLogsListStore((s) => s.search);
  const filters = useLogsListStore((s) => s.filters);
  const setSearch = useLogsListStore((s) => s.setSearch);
  const setPage = useLogsListStore((s) => s.setPage);
  const setPageSize = useLogsListStore((s) => s.setPageSize);
  const setFilters = useLogsListStore((s) => s.setFilters);
  const resetStore = useLogsListStore((s) => s.reset);

  const { data, pagination, isLoading, isFetching } = useListQuery<
    Log,
    { type: string | null }
  >({
    store: useLogsListStore,
    queryKeyPrefix: LOGS_QUERY_KEY,
    path: "/logs",
    buildFilters: (f) => (f.type ? { type: f.type } : {}),
  });

  // 搜索（提交式后端过滤，后端匹配 action 字段）
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

  // 类型字典（log_type）：筛选选项与类型显示名的真源；加载失败静默降级
  const logTypeDictQuery = useQuery({
    queryKey: dictItemsQueryKey("log_type"),
    queryFn: () => fetchDictItems("log_type"),
  });
  const logTypeDictItems = useMemo(() => {
    const items = logTypeDictQuery.data ?? [];

    return items.filter((item) => item.enabled && isLogType(item.value));
  }, [logTypeDictQuery.data]);

  /** 类型筛选选项：字典启用项（value 限于契约四枚举）；字典不可用时回退内置枚举 */
  const typeOptions = useMemo(() => {
    const source =
      logTypeDictItems.length > 0
        ? logTypeDictItems.map((item) => ({ value: item.value }))
        : LOG_TYPE_VALUES.map((value) => ({ value }));

    return source.map((item) => ({
      value: item.value,
      label: logTypeLabel(
        item.value,
        logTypeDictItems.length > 0 ? logTypeDictItems : undefined,
        t,
      ),
    }));
  }, [logTypeDictItems, t]);

  const getTypeLabel = useCallback(
    (type: string) =>
      logTypeLabel(
        type,
        logTypeDictItems.length > 0 ? logTypeDictItems : undefined,
        t,
      ),
    [logTypeDictItems, t],
  );

  // ---------------- 弹窗状态（useOverlayState，§7.2 受控浮层语义） ----------------
  const detailDrawer = useOverlayState();
  const deleteDialog = useOverlayState();
  const batchDeleteDialog = useOverlayState();

  const [detailLog, setDetailLog] = useState<Log | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Log | null>(null);
  const [batchDeleteIds, setBatchDeleteIds] = useState<string[]>([]);

  // ---------------- 变更操作 ----------------
  /** 列表失效：LOGS_QUERY_KEY 前缀覆盖全部分页/筛选组合 */
  const invalidateList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: LOGS_QUERY_KEY });
  }, [queryClient]);

  // ---------------- 表格 ----------------
  const columns = useMemo<AppColumnDef<Log>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => <DataTableSelectAll table={table} />,
        cell: ({ row }) => <DataTableSelectRow row={row} />,
      },
      {
        id: "operator",
        enableSorting: false,
        header: t("features.logs.column.operator"),
        cell: ({ row }) => <UserInfo user={logOperator(row.original)} />,
      },
      {
        accessorKey: "type",
        enableSorting: false,
        meta: { align: "center" },
        header: t("features.logs.column.type"),
        cell: ({ row }) => (
          <Chip
            color={logTypeColor(row.original.type)}
            size="sm"
            variant="soft"
          >
            {getTypeLabel(row.original.type)}
          </Chip>
        ),
      },
      {
        accessorKey: "action",
        enableSorting: false,
        header: t("features.logs.column.action"),
        cell: ({ row }) => (
          <Typography className="break-all" type="body-sm">
            {row.original.action}
          </Typography>
        ),
      },
      {
        accessorKey: "ip",
        enableSorting: false,
        header: t("features.logs.column.ip"),
        cell: ({ row }) => (
          <Typography color="muted" type="body-sm">
            {row.original.ip ?? "—"}
          </Typography>
        ),
      },
      {
        accessorKey: "createdAt",
        enableSorting: false,
        meta: { align: "center" },
        header: t("common.column.createdAt"),
        cell: ({ row }) => (
          <Typography color="muted" type="body-sm">
            {new Date(row.original.createdAt).toLocaleString()}
          </Typography>
        ),
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        meta: { align: "center" },
        header: t("common.actions"),
        cell: ({ row }) => (
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
                  if (key === "detail") {
                    setDetailLog(row.original);
                    detailDrawer.open();
                  }
                  if (key === "delete" && canDelete) {
                    setDeleteTarget(row.original);
                    deleteDialog.open();
                  }
                }}
              >
                <Dropdown.Item
                  id="detail"
                  textValue={t("features.logs.action.detail")}
                >
                  <Eye className="size-4 shrink-0 text-muted" />
                  <Label>{t("features.logs.action.detail")}</Label>
                </Dropdown.Item>
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
        ),
      },
    ],
    [t, getTypeLabel, canDelete, detailDrawer, deleteDialog],
  );

  const total = pagination.total;
  const table = useTable({
    columns,
    data,
    features: appTableFeatures,
    getRowId: (row) => row.id,
    // 服务端分页：状态由列表 store 驱动（受控），仅取数；后端固定倒序，无排序
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    state: {
      pagination: { pageIndex: page - 1, pageSize },
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
  });

  const selectedLogs = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);

  // ---------------- 变更操作（依赖 table 实例，置于其定义后） ----------------
  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteLog(deleteTarget.id);
    } catch (error) {
      toast.danger(getLogErrorMessage(error));
      throw error; // ConfirmDialog 约定：抛错保持弹窗打开
    }
    invalidateList();
    // 重置勾选：被删行若在勾选中，残留 state 会让表头全选框保持勾选
    table.resetRowSelection();
    toast.success(t("features.logs.message.deleteSuccess"));
  }, [deleteTarget, invalidateList, table, t]);

  const confirmBatchDelete = useCallback(async () => {
    try {
      await batchDeleteLogs(batchDeleteIds);
    } catch (error) {
      toast.danger(getLogErrorMessage(error));
      throw error;
    }
    invalidateList();
    // 重置勾选：删除后行已不在当前页，但勾选 state 仍保留旧行 ID，
    // 表头全选框据此误判为全选（本次反馈问题）
    table.resetRowSelection();
    toast.success(t("features.logs.message.deleteSuccess"));
  }, [batchDeleteIds, invalidateList, table, t]);

  return (
    <div className="flex w-full flex-col pb-8">
      <DataTableToolbar
        columnSettingKey={
          currentUserId
            ? buildColumnSettingKey(currentUserId, "/settings/logs")
            : undefined
        }
        table={table}
      >
        <SearchField
          aria-label={t("features.logs.searchPlaceholder")}
          className="w-64"
          value={searchInput}
          variant="secondary"
          onChange={setSearchInput}
          onSubmit={applySearch}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder={t("features.logs.searchPlaceholder")}
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        {/* 类型筛选在搜索按钮前（与输入条件一起提交）；不选默认全部 */}
        <DataTableFilterSelect
          aria-label={t("features.logs.column.type")}
          options={typeOptions}
          placeholder={t("features.logs.filter.all")}
          value={filters.type}
          onChange={(value) => setFilters({ type: value })}
        />
        <DataTableSearchReset
          canReset={searchDirty || search !== "" || filters.type !== null}
          isFetching={isFetching}
          searchDirty={searchDirty}
          onReset={resetFilters}
          onSearch={applySearch}
        />
      </DataTableToolbar>

      <DataTable
        aria-label={t("menu.pageTitle.logs")}
        className="w-full"
        contentClassName="min-w-[820px]"
        isLoading={isLoading || isFetching}
        table={table}
      />

      <DataTablePagination table={table} total={total} />

      <DataTableBulkActions table={table}>
        {canBatchDelete && (
          <Button
            size="sm"
            variant="danger-soft"
            onPress={() => {
              setBatchDeleteIds(selectedLogs.map((log) => log.id));
              batchDeleteDialog.open();
            }}
          >
            <Trash2 className="size-4" />
            {t("features.logs.bulk.delete")}
          </Button>
        )}
      </DataTableBulkActions>

      <LogDetailDrawer
        isOpen={detailDrawer.isOpen}
        log={detailDrawer.isOpen ? detailLog : null}
        typeLabel={detailLog ? getTypeLabel(detailLog.type) : ""}
        onOpenChange={detailDrawer.setOpen}
      />

      <ConfirmDialog
        destructive
        confirmText={t("common.delete")}
        description={t("features.logs.message.deleteDesc")}
        state={{
          isOpen: deleteDialog.isOpen,
          setOpen: deleteDialog.setOpen,
          close: deleteDialog.close,
        }}
        title={t("features.logs.message.deleteTitle")}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        destructive
        confirmKeyword="DELETE"
        confirmText={t("common.delete")}
        description={t("features.logs.message.batchDeleteDesc", {
          count: batchDeleteIds.length,
        })}
        keywordLabel={t("features.logs.message.batchDeleteKeyword")}
        state={{
          isOpen: batchDeleteDialog.isOpen,
          setOpen: batchDeleteDialog.setOpen,
          close: batchDeleteDialog.close,
        }}
        title={t("features.logs.message.batchDeleteTitle")}
        onConfirm={confirmBatchDelete}
      />
    </div>
  );
}

import type { User, UserStatus } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/common/data-table/table-types";

import { useQueryClient } from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
import {
  Button,
  Chip,
  Dropdown,
  Label,
  SearchField,
  Tooltip,
  Typography,
  toast,
  useOverlayState,
} from "@heroui/react";
import {
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  USERS_QUERY_KEY,
  batchDeleteUsers,
  deleteUser,
  getUserErrorMessage,
  updateUserStatus,
} from "./user-api";
import { UserFormDialog, type UserFormMode } from "./user-form-dialog";
import { UserResetPasswordDialog } from "./user-reset-password-dialog";

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
import { useHasPermissionKey } from "@/hooks/use-permissions";
import { createListStore } from "@/hooks/create-list-store";
import { useListQuery } from "@/hooks/use-list-query";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 用户管理页：服务端分页列表（page/pageSize/search/status/sort/order）+
 * CRUD + 状态切换 + 重置密码 + 批量操作。
 *
 * - 列表状态（分页/搜索/排序/筛选）入 feature store（keepAlive 友好），
 *   由 useListQuery 装配请求与 queryKey；status 筛选刷新后丢失为既定行为
 *   （与角色管理一致，见方案确认记录）；
 * - username 创建后锁定；编辑不含密码，改密走重置密码弹窗；
 * - 自我保护（前端止损，后端契约无此校验）：当前登录用户本人不可被
 *   勾选/删除/停用/重置密码入口隐藏删除与停用；
 * - 批量状态切换无后端批量端点：Promise.allSettled 逐行调用，
 *   部分成功语义（成功 X 失败 Y），不回滚已成功的行。
 */

/** 列表 store（模块级单例：保活实例复用同一份分页/筛选状态） */
const useUsersListStore = createListStore<{ status: string | null }>({
  status: null,
});

export function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const canAdd = useHasPermissionKey("ADD");
  const canEdit = useHasPermissionKey("EDIT");
  const canDelete = useHasPermissionKey("DELETE");
  const canBatchDelete = useHasPermissionKey("BATCH_DELETE");
  const canResetPassword = useHasPermissionKey("RESET_PASSWORD");

  // ---------------- 列表（服务端分页 + 筛选 + 排序） ----------------
  const page = useUsersListStore((s) => s.page);
  const pageSize = useUsersListStore((s) => s.pageSize);
  const search = useUsersListStore((s) => s.search);
  const sorting = useUsersListStore((s) => s.sorting);
  const filters = useUsersListStore((s) => s.filters);
  const setSearch = useUsersListStore((s) => s.setSearch);
  const setPage = useUsersListStore((s) => s.setPage);
  const setPageSize = useUsersListStore((s) => s.setPageSize);
  const setSorting = useUsersListStore((s) => s.setSorting);
  const setFilters = useUsersListStore((s) => s.setFilters);
  const resetStore = useUsersListStore((s) => s.reset);

  const { data, pagination, isLoading, isFetching } = useListQuery<
    User,
    { status: string | null }
  >({
    store: useUsersListStore,
    queryKeyPrefix: USERS_QUERY_KEY,
    path: "/users",
    buildFilters: (f) => (f.status ? { status: f.status } : {}),
  });

  // 搜索（提交式后端过滤，后端匹配 username/email/displayName 三字段）
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

  const filterOptions = useMemo(
    () => [
      { value: "active", label: t("features.users.filter.active") },
      { value: "disabled", label: t("features.users.filter.disabled") },
    ],
    [t],
  );

  // ---------------- 弹窗状态（useOverlayState，§7.2 受控浮层语义） ----------------
  const userDialog = useOverlayState();
  const resetPwdDialog = useOverlayState();
  const deleteDialog = useOverlayState();
  const batchDeleteDialog = useOverlayState();
  const statusDialog = useOverlayState();

  const [formContext, setFormContext] = useState<{
    mode: UserFormMode;
    user: User | null;
  }>({ mode: "create", user: null });
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [batchDeleteIds, setBatchDeleteIds] = useState<string[]>([]);
  const [statusTarget, setStatusTarget] = useState<{
    users: User[];
    next: UserStatus;
  } | null>(null);

  const openForm = useCallback(
    (mode: UserFormMode, user: User | null) => {
      setFormContext({ mode, user });
      userDialog.open();
    },
    [userDialog],
  );

  // ---------------- 变更操作 ----------------
  /** 列表失效：USERS_QUERY_KEY 前缀覆盖全部分页/筛选组合 */
  const invalidateList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
  }, [queryClient]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteUser(deleteTarget.id);
    } catch (error) {
      toast.danger(getUserErrorMessage(error));
      throw error; // ConfirmDialog 约定：抛错保持弹窗打开
    }
    invalidateList();
    toast.success(t("features.users.message.deleteSuccess"));
  }, [deleteTarget, invalidateList, t]);

  const confirmBatchDelete = useCallback(async () => {
    try {
      await batchDeleteUsers(batchDeleteIds);
    } catch (error) {
      toast.danger(getUserErrorMessage(error));
      throw error;
    }
    invalidateList();
    toast.success(t("features.users.message.deleteSuccess"));
  }, [batchDeleteIds, invalidateList, t]);

  /**
   * 状态切换（单个/批量共用）：Promise.allSettled 逐行调用，
   * 部分成功不回滚；结束统一失效列表反映真实状态。
   */

  // ---------------- 表格 ----------------
  const columns = useMemo<AppColumnDef<User>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => <DataTableSelectAll table={table} />,
        cell: ({ row }) => <DataTableSelectRow row={row} />,
      },
      {
        accessorKey: "username",
        header: t("features.users.column.username"),
        cell: ({ row }) => (
          <Typography className="font-medium" type="body-sm">
            {row.original.username}
          </Typography>
        ),
      },
      {
        accessorKey: "displayName",
        header: t("features.users.column.displayName"),
        cell: ({ row }) => (
          <Typography type="body-sm">{row.original.displayName}</Typography>
        ),
      },
      {
        accessorKey: "email",
        header: t("features.users.column.email"),
        cell: ({ row }) => (
          <Typography color="muted" type="body-sm">
            {row.original.email}
          </Typography>
        ),
      },
      {
        accessorKey: "status",
        enableSorting: true,
        meta: { align: "center" },
        header: t("features.users.column.status"),
        cell: ({ row }) => (
          <Chip
            color={row.original.status === "active" ? "success" : "danger"}
            size="sm"
            variant="soft"
          >
            {t(
              row.original.status === "active"
                ? "features.users.filter.active"
                : "features.users.filter.disabled",
            )}
          </Chip>
        ),
      },
      {
        id: "roles",
        enableSorting: false,
        meta: { align: "center" },
        header: t("features.users.column.roles"),
        cell: ({ row }) => {
          const roles = row.original.roles;

          if (roles.length === 0) {
            return (
              <Typography color="muted" type="body-sm">
                —
              </Typography>
            );
          }

          // 角色可能较多：单元格内最多展示 2 个，剩余以 +N 聚合（悬停显示全量）
          const visibleRoles = roles.slice(0, 2);
          const extraCount = roles.length - visibleRoles.length;

          return (
            <div className="flex flex-wrap items-center justify-center gap-1">
              {visibleRoles.map((role) => (
                <Chip key={role.id} size="sm">
                  {role.name}
                </Chip>
              ))}
              {extraCount > 0 && (
                <Tooltip delay={0}>
                  <Tooltip.Trigger aria-label={t("features.users.rolesMore")}>
                    <Chip size="sm">+{extraCount}</Chip>
                  </Tooltip.Trigger>
                  <Tooltip.Content>
                    {roles.map((role) => role.name).join("、")}
                    <Tooltip.Arrow />
                  </Tooltip.Content>
                </Tooltip>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "createdAt",
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
        cell: ({ row }) => {
          // 自我保护（前端止损，后端契约无此校验）：本人不显示删除/停用
          const isSelf = row.original.id === currentUserId;
          const nextStatus: UserStatus =
            row.original.status === "active" ? "disabled" : "active";

          if (!canEdit && !canDelete && !canResetPassword) return null;

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
                    if (key === "edit") openForm("edit", row.original);
                    if (key === "reset-password") {
                      setResetTarget(row.original);
                      resetPwdDialog.open();
                    }
                    if (key === "toggle" && canEdit && !isSelf) {
                      setStatusTarget({
                        users: [row.original],
                        next: nextStatus,
                      });
                      statusDialog.open();
                    }
                    if (key === "delete" && canDelete && !isSelf) {
                      setDeleteTarget(row.original);
                      deleteDialog.open();
                    }
                  }}
                >
                  {canEdit && (
                    <Dropdown.Item id="edit" textValue={t("common.edit")}>
                      <Pencil className="size-4 shrink-0 text-muted" />
                      <Label>{t("common.edit")}</Label>
                    </Dropdown.Item>
                  )}
                  {canResetPassword && (
                    <Dropdown.Item
                      id="reset-password"
                      textValue={t("features.users.action.resetPassword")}
                    >
                      <KeyRound className="size-4 shrink-0 text-muted" />
                      <Label>{t("features.users.action.resetPassword")}</Label>
                    </Dropdown.Item>
                  )}
                  {canEdit && !isSelf && (
                    <Dropdown.Item
                      id="toggle"
                      textValue={t(
                        row.original.status === "active"
                          ? "features.users.action.disable"
                          : "features.users.action.enable",
                      )}
                    >
                      <Power
                        className={
                          row.original.status === "active"
                            ? "size-4 shrink-0 text-danger"
                            : "size-4 shrink-0 text-muted"
                        }
                      />
                      <Label>
                        {t(
                          row.original.status === "active"
                            ? "features.users.action.disable"
                            : "features.users.action.enable",
                        )}
                      </Label>
                    </Dropdown.Item>
                  )}
                  {canDelete && !isSelf && (
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
      canEdit,
      canDelete,
      canResetPassword,
      currentUserId,
      openForm,
      resetPwdDialog,
      deleteDialog,
      statusDialog,
    ],
  );

  const total = pagination.total;
  const table = useTable({
    columns,
    data,
    features: appTableFeatures,
    getRowId: (row) => row.id,
    // 自我保护：当前登录用户本人不可被勾选（从源头排除批量删除/停用自己）
    enableRowSelection: (row) => row.original.id !== currentUserId,
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

  const selectedUsers = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);

  /** 状态切换（单个/批量共用）：Promise.allSettled 逐行调用，
   * 部分成功不回滚；结束统一失效列表反映真实状态并清空勾选。 */
  const confirmStatusChange = useCallback(async () => {
    if (!statusTarget) return;
    const { users, next } = statusTarget;
    const results = await Promise.allSettled(
      users.map((user) => updateUserStatus(user.id, next)),
    );

    invalidateList();
    table.resetRowSelection();

    const failed = results.filter((result) => result.status === "rejected");

    if (failed.length === 0) {
      toast.success(
        users.length === 1
          ? t("features.users.message.statusChangeSuccess")
          : t("features.users.message.batchStatusSuccess", {
              count: users.length,
            }),
      );

      return;
    }
    toast.warning(
      t("features.users.message.batchStatusPartial", {
        ok: users.length - failed.length,
        fail: failed.length,
      }),
    );
    // 首个失败原因透出（多为 USER_NOT_FOUND：该用户已被他人删除）
    const firstError = failed[0];

    if (firstError.status === "rejected") {
      toast.danger(getUserErrorMessage(firstError.reason));
    }
  }, [statusTarget, invalidateList, table, t]);

  return (
    <div className="flex w-full flex-col pb-8">
      <DataTableToolbar
        columnSettingKey={
          currentUserId
            ? buildColumnSettingKey(currentUserId, "/settings/users")
            : undefined
        }
        table={table}
      >
        <SearchField
          aria-label={t("features.users.searchPlaceholder")}
          className="w-64"
          value={searchInput}
          variant="secondary"
          onChange={setSearchInput}
          onSubmit={applySearch}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder={t("features.users.searchPlaceholder")}
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        {/* 状态筛选在搜索按钮前（与输入条件一起提交）；不选默认全部 */}
        <DataTableFilterSelect
          aria-label={t("features.users.column.status")}
          options={filterOptions}
          placeholder={t("features.users.filter.all")}
          value={filters.status}
          onChange={(value) => setFilters({ status: value })}
        />
        <DataTableSearchReset
          canReset={searchDirty || search !== "" || filters.status !== null}
          isFetching={isFetching}
          searchDirty={searchDirty}
          onReset={resetFilters}
          onSearch={applySearch}
        />
        {canAdd && (
          <Button
            size="sm"
            variant="outline"
            onPress={() => openForm("create", null)}
          >
            <Plus className="size-4" />
            {t("features.users.action.add")}
          </Button>
        )}
      </DataTableToolbar>

      <DataTable
        aria-label={t("menu.pageTitle.users")}
        className="w-full"
        contentClassName="min-w-[860px]"
        isLoading={isLoading || isFetching}
        table={table}
      />

      <DataTablePagination table={table} total={total} />

      <DataTableBulkActions table={table}>
        {canEdit && (
          <>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                setStatusTarget({ users: selectedUsers, next: "active" });
                statusDialog.open();
              }}
            >
              <Power className="size-4" />
              {t("features.users.bulk.enable")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                setStatusTarget({ users: selectedUsers, next: "disabled" });
                statusDialog.open();
              }}
            >
              <PowerOff className="size-4" />
              {t("features.users.bulk.disable")}
            </Button>
          </>
        )}
        {canBatchDelete && (
          <Button
            size="sm"
            variant="danger-soft"
            onPress={() => {
              setBatchDeleteIds(selectedUsers.map((user) => user.id));
              batchDeleteDialog.open();
            }}
          >
            <Trash2 className="size-4" />
            {t("features.users.bulk.delete")}
          </Button>
        )}
      </DataTableBulkActions>

      <UserFormDialog
        isOpen={userDialog.isOpen}
        mode={formContext.mode}
        user={formContext.user}
        onOpenChange={userDialog.setOpen}
        onSaved={invalidateList}
      />

      <UserResetPasswordDialog
        isOpen={resetPwdDialog.isOpen}
        user={resetPwdDialog.isOpen ? resetTarget : null}
        onOpenChange={resetPwdDialog.setOpen}
        onSaved={invalidateList}
      />

      <ConfirmDialog
        destructive
        confirmKeyword={deleteTarget?.username}
        confirmText={t("common.delete")}
        description={t("features.users.message.deleteDesc", {
          name: deleteTarget?.username ?? "",
        })}
        keywordLabel={t("features.users.message.deleteKeyword")}
        state={{
          isOpen: deleteDialog.isOpen,
          setOpen: deleteDialog.setOpen,
          close: deleteDialog.close,
        }}
        title={t("features.users.message.deleteTitle")}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        destructive
        confirmKeyword="DELETE"
        confirmText={t("common.delete")}
        description={t("features.users.message.batchDeleteDesc", {
          count: batchDeleteIds.length,
        })}
        keywordLabel={t("features.users.message.batchDeleteKeyword")}
        state={{
          isOpen: batchDeleteDialog.isOpen,
          setOpen: batchDeleteDialog.setOpen,
          close: batchDeleteDialog.close,
        }}
        title={t("features.users.message.batchDeleteTitle")}
        onConfirm={confirmBatchDelete}
      />

      <ConfirmDialog
        confirmText={
          statusTarget?.next === "disabled"
            ? t("features.users.action.disable")
            : t("features.users.action.enable")
        }
        description={
          statusTarget
            ? statusTarget.users.length === 1
              ? statusTarget.next === "disabled"
                ? t("features.users.message.disableDesc", {
                    name: statusTarget.users[0]?.username ?? "",
                  })
                : t("features.users.message.enableDesc", {
                    name: statusTarget.users[0]?.username ?? "",
                  })
              : statusTarget.next === "disabled"
                ? t("features.users.message.batchDisableDesc", {
                    count: statusTarget.users.length,
                  })
                : t("features.users.message.batchEnableDesc", {
                    count: statusTarget.users.length,
                  })
            : null
        }
        destructive={statusTarget?.next === "disabled"}
        // 启用为非破坏性操作：accent 图标（destructive 时恒为 danger，此值被忽略）
        iconStatus="accent"
        state={{
          isOpen: statusDialog.isOpen,
          setOpen: statusDialog.setOpen,
          close: statusDialog.close,
        }}
        title={t(
          statusTarget?.next === "disabled"
            ? "features.users.message.disableTitle"
            : "features.users.message.enableTitle",
        )}
        onConfirm={confirmStatusChange}
      />
    </div>
  );
}

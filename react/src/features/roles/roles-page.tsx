import type { Role } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/common/data-table/table-types";

import { useQueryClient } from "@tanstack/react-query";
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
import {
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  ROLES_QUERY_KEY,
  deleteRole,
  getRoleErrorMessage,
  updateRole,
} from "./role-api";
import { RoleFormDialog, type RoleFormMode } from "./role-form-dialog";
import { RoleGrantDrawer } from "./role-grant-drawer";

import { DataTable } from "@/components/common/data-table";
import { ErrorContent } from "@/components/common/error-content/error-content";
import {
  DataTableFilterSelect,
  DataTablePagination,
  DataTableSearchReset,
  DataTableToolbar,
  buildColumnSettingKey,
} from "@/components/common/data-table";
import { ConfirmDialog } from "@/components/common/confirm-dialog/confirm-dialog";
import { appTableFeatures } from "@/components/common/data-table/table-types";
import { MENUS_QUERY_KEY } from "@/hooks/use-menus";
import { useMenuPermissions } from "@/hooks/use-permissions";
import { createListStore } from "@/hooks/create-list-store";
import { useListQuery } from "@/hooks/use-list-query";
import { useTranslation } from "@/i18n";
import { formatDateTime } from "@/lib/format-date";
import { SUPER_ADMIN_ROLE_CODE } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 角色管理页：服务端分页列表（page/pageSize/search/enabled）+ CRUD + 菜单授权。
 *
 * - 列表状态（分页/搜索/筛选）入 feature store（keepAlive 友好），由
 *   useListQuery 装配请求与 queryKey；
 * - 状态切换走 PUT /roles/:id 的 enabled 字段（EDIT 位），下拉里快捷开关；
 * - 删除为强确认（输入角色 code），已关联用户由后端 409 ROLE_IN_USE 拦截；
 * - 菜单授权为右侧 Drawer（父子联动语义见 role-grant-drawer.tsx），
 *   入口由独立 GRANT 位控制（契约 v1.4.4，后端 PUT /roles/:id/menus 同步守卫）；
 *   保存后失效导航菜单缓存：后端 /menus 实时计算 userPermissions，
 *   若改的是当前用户自己的角色，侧边栏与按钮权限立即生效。
 */

/** 列表 store（模块级单例：保活实例复用同一份分页/筛选状态） */
const useRolesListStore = createListStore<{ enabled: string | null }>({
  enabled: null,
});

export function RolesPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const { canAdd, canEdit, canDelete, canGrant } = useMenuPermissions();
  // ---------------- 列表（服务端分页 + 筛选） ----------------
  const page = useRolesListStore((s) => s.page);
  const pageSize = useRolesListStore((s) => s.pageSize);
  const search = useRolesListStore((s) => s.search);
  const filters = useRolesListStore((s) => s.filters);
  // actions 为稳定引用（zustand 模式），经 selector 取出不触发多余重渲染
  const setSearch = useRolesListStore((s) => s.setSearch);
  const setPage = useRolesListStore((s) => s.setPage);
  const setPageSize = useRolesListStore((s) => s.setPageSize);
  const setFilters = useRolesListStore((s) => s.setFilters);
  const resetStore = useRolesListStore((s) => s.reset);

  const { data, pagination, isLoading, isFetching, isError, refetch } =
    useListQuery<Role, { enabled: string | null }>({
      store: useRolesListStore,
      queryKeyPrefix: ROLES_QUERY_KEY,
      path: "/roles",
      buildFilters: (f) => (f.enabled ? { enabled: f.enabled } : {}),
    });

  // 搜索（提交式后端过滤）：本地输入 → 应用到 store
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
      { value: "true", label: t("features.roles.filter.enabled") },
      { value: "false", label: t("features.roles.filter.disabled") },
    ],
    [t],
  );

  // ---------------- 弹窗状态（useOverlayState，§7.2 受控浮层语义） ----------------
  const roleDialog = useOverlayState();
  const grantDrawer = useOverlayState();
  const deleteDialog = useOverlayState();
  const [formContext, setFormContext] = useState<{
    mode: RoleFormMode;
    role: Role | null;
  }>({ mode: "create", role: null });
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [grantRole, setGrantRole] = useState<Role | null>(null);

  const openForm = useCallback(
    (mode: RoleFormMode, role: Role | null) => {
      setFormContext({ mode, role });
      roleDialog.open();
    },
    [roleDialog],
  );

  // ---------------- 变更操作 ----------------
  /** 列表失效：ROLES_QUERY_KEY 前缀覆盖全部分页/筛选组合 */
  const invalidateList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
  }, [queryClient]);

  const handleSaved = useCallback(() => {
    invalidateList();
  }, [invalidateList]);

  /** 授权保存后：失效导航菜单缓存（当前用户自己的角色授权立即生效） */
  const handleGrantSaved = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: MENUS_QUERY_KEY,
      exact: true,
    });
  }, [queryClient]);

  /**
   * 状态切换（toast.promise 三段反馈：启用中/停用中 → 成功/失败）。
   * 请求成功后失效列表缓存。
   */
  const toggleStatus = useCallback(
    (role: Role) => {
      const enabling = !role.enabled;

      void toast.promise(
        updateRole(role.id, { name: role.name, enabled: enabling }).then(() =>
          invalidateList(),
        ),
        {
          loading: t(
            enabling
              ? "features.roles.message.enabling"
              : "features.roles.message.disabling",
          ),
          success: t("features.roles.message.statusSuccess"),
          error: (e) => getRoleErrorMessage(e),
        },
      );
    },
    [invalidateList, t],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteRole(deleteTarget.id);
    } catch (error) {
      toast.danger(getRoleErrorMessage(error));

      return;
    }
    invalidateList();
    toast.success(t("features.roles.message.deleteSuccess"));
  }, [deleteTarget, invalidateList, t]);

  // ---------------- 表格 ----------------
  const columns = useMemo<AppColumnDef<Role>[]>(
    () => [
      {
        id: "name",
        enableSorting: false,
        header: t("features.roles.column.name"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden className="size-4 shrink-0 text-muted" />
            <Typography className="font-medium" type="body-sm">
              {row.original.name}
            </Typography>
          </div>
        ),
      },
      {
        id: "code",
        enableSorting: false,
        header: t("features.roles.column.code"),
        cell: ({ row }) => (
          <Typography className="font-mono" type="body-sm">
            {row.original.code}
          </Typography>
        ),
      },
      {
        id: "description",
        enableSorting: false,
        header: t("features.roles.column.description"),
        cell: ({ row }) => (
          <Typography
            className="max-w-64 truncate"
            color="muted"
            type="body-sm"
          >
            {row.original.description || "—"}
          </Typography>
        ),
      },
      {
        id: "sort",
        enableSorting: false,
        meta: { align: "center" },
        header: t("common.column.sort"),
        cell: ({ row }) => <Chip size="sm">{row.original.sort}</Chip>,
      },
      {
        id: "enabled",
        enableSorting: false,
        meta: { align: "center" },
        header: t("features.roles.column.enabled"),
        cell: ({ row }) => (
          <Chip
            color={row.original.enabled ? "success" : "danger"}
            size="sm"
            variant="soft"
          >
            {t(
              row.original.enabled
                ? "features.roles.filter.enabled"
                : "features.roles.filter.disabled",
            )}
          </Chip>
        ),
      },
      {
        id: "createdAt",
        enableSorting: false,
        meta: { align: "center" },
        header: t("common.column.createdAt"),
        cell: ({ row }) => (
          <Typography color="muted" type="body-sm">
            {formatDateTime(row.original.createdAt, i18n.language)}
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
          // 系统内置角色保护：super_admin 的授权是全量权限载体，
          // 授权/删除/状态切换均不可用（后端亦有 403 SUPER_ADMIN_ROLE_PROTECTED 兜底）；
          // 编辑保留——name/description 无权限语义
          const isSuperAdmin = row.original.code === SUPER_ADMIN_ROLE_CODE;
          const canGrantRow = canGrant && !isSuperAdmin;
          const canToggle = canEdit && !isSuperAdmin;
          const canDeleteRow = canDelete && !isSuperAdmin;

          if (!canGrantRow && !canEdit && !canDeleteRow) return null;

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
                    if (key === "grant") {
                      setGrantRole(row.original);
                      grantDrawer.open();
                    }
                    if (key === "edit") openForm("edit", row.original);
                    if (key === "toggle" && canToggle)
                      toggleStatus(row.original);
                    if (key === "delete") {
                      setDeleteTarget(row.original);
                      deleteDialog.open();
                    }
                  }}
                >
                  {canGrantRow && (
                    <Dropdown.Item
                      id="grant"
                      textValue={t("features.roles.action.grant")}
                    >
                      <KeyRound className="size-4 shrink-0 text-muted" />
                      <Label>{t("features.roles.action.grant")}</Label>
                    </Dropdown.Item>
                  )}
                  {canEdit && (
                    <Dropdown.Item id="edit" textValue={t("common.edit")}>
                      <Pencil className="size-4 shrink-0 text-muted" />
                      <Label>{t("common.edit")}</Label>
                    </Dropdown.Item>
                  )}
                  {canToggle && (
                    <Dropdown.Item
                      id="toggle"
                      textValue={t(
                        row.original.enabled
                          ? "features.roles.action.disable"
                          : "features.roles.action.enable",
                      )}
                    >
                      <Power
                        className={
                          row.original.enabled
                            ? "size-4 shrink-0 text-danger"
                            : "size-4 shrink-0 text-muted"
                        }
                      />
                      <Label>
                        {t(
                          row.original.enabled
                            ? "features.roles.action.disable"
                            : "features.roles.action.enable",
                        )}
                      </Label>
                    </Dropdown.Item>
                  )}
                  {canDeleteRow && (
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
      canGrant,
      openForm,
      grantDrawer,
      deleteDialog,
      toggleStatus,
    ],
  );

  const total = pagination.total;
  const table = useTable({
    columns,
    data,
    features: appTableFeatures,
    getRowId: (row) => row.id,
    // 服务端分页：分页状态由列表 store 驱动（受控），仅取数
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    state: { pagination: { pageIndex: page - 1, pageSize } },
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

  return (
    <div className="flex w-full flex-col pb-8">
      <DataTableToolbar
        columnSettingKey={
          userId ? buildColumnSettingKey(userId, "/roles") : undefined
        }
        table={table}
      >
        <SearchField
          aria-label={t("features.roles.searchPlaceholder")}
          className="w-64"
          value={searchInput}
          variant="secondary"
          onChange={setSearchInput}
          onSubmit={applySearch}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder={t("features.roles.searchPlaceholder")}
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        {/* 状态筛选在搜索按钮前（与输入条件一起提交）；不选默认全部 */}
        <DataTableFilterSelect
          aria-label={t("features.roles.column.enabled")}
          options={filterOptions}
          placeholder={t("features.roles.filter.all")}
          value={filters.enabled}
          onChange={(value) => setFilters({ enabled: value })}
        />
        <DataTableSearchReset
          canReset={searchDirty || search !== "" || filters.enabled !== null}
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
            {t("features.roles.action.add")}
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
          aria-label={t("menu.pageTitle.roles")}
          className="w-full"
          contentClassName="min-w-[760px]"
          isLoading={isLoading || isFetching}
          table={table}
        />
      )}

      <DataTablePagination table={table} total={total} />

      <RoleFormDialog
        isOpen={roleDialog.isOpen}
        mode={formContext.mode}
        role={formContext.role}
        onOpenChange={roleDialog.setOpen}
        onSaved={handleSaved}
      />

      <RoleGrantDrawer
        isOpen={grantDrawer.isOpen}
        role={
          grantDrawer.isOpen && grantRole
            ? {
                id: grantRole.id,
                name: grantRole.name,
                code: grantRole.code,
              }
            : null
        }
        onOpenChange={grantDrawer.setOpen}
        onSaved={handleGrantSaved}
      />

      <ConfirmDialog
        destructive
        confirmKeyword={deleteTarget?.code}
        confirmText={t("common.delete")}
        description={t("features.roles.message.deleteDesc", {
          name: deleteTarget?.name ?? "",
        })}
        keywordLabel={t("features.roles.message.deleteKeyword")}
        state={{
          isOpen: deleteDialog.isOpen,
          setOpen: deleteDialog.setOpen,
          close: deleteDialog.close,
        }}
        title={t("features.roles.message.deleteTitle")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

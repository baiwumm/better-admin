"use client";

import type { MenuNode } from "@/lib/api-types";

import { Button, SearchField, Spinner, toast } from "@heroui/react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { useRouter } from "@bprogress/next/app";

import {
  deleteMenu,
  fetchManageMenuTree,
  MENUS_TREE_QUERY_KEY,
} from "./menu-api";
import { MenuFormDialog, type MenuFormMode } from "./menu-form-dialog";
import {
  useMenusTable,
  useMenusTableColumns,
  MenusTreeTable,
} from "./menus-tree-table";

import { ConfirmDialog } from "@/components/common/confirm-dialog/confirm-dialog";
import {
  DataTableSearchReset,
  DataTableToolbar,
  buildColumnSettingKey,
} from "@/components/common/data-table";
import { useMenuPermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 菜单管理页：管理用全量菜单树（GET /menus/tree）的树形表格 + CRUD。
 *
 * - 无页内标题（标题由路由 titleKey 驱动 document.title / 标签栏）；
 * - 搜索为后端模糊过滤（label / i18n_key / to，提交式），结果保留祖先链；
 * - 表实例在页面创建，同时供工具栏列设置与表格消费；
 * - 增删改后失效导航树与管理树两份缓存：侧边栏实时刷新，被删菜单的
 *   标签由 tags-bar 的 pruneTabs（随 menuTree 变化）自动清理；
 * - 删除有子菜单的节点由后端 409（MENU_HAS_CHILDREN）拦截，前端 toast 透出。
 */

export function MenusPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const { canAdd } = useMenuPermissions();

  // 搜索（提交式后端过滤）：applied 变化 → queryKey 变化 → 重新请求
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  // staleTime 0：任何一次访问都取最新（菜单数据要求强一致）
  // keepPreviousData：搜索切换/保存刷新时保留旧数据，配合轻遮罩（Antd 风格）
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...MENUS_TREE_QUERY_KEY, appliedSearch],
    queryFn: () => fetchManageMenuTree(appliedSearch),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  // 保存/删除后统一失效：仅当前激活的管理树查询（单次请求）+ 导航树（侧边栏
  // 名称/结构同步必须刷新，属必要请求）。导航树必须 exact——["menus"] 是
  // ["menus","manageTree",…] 的前缀，非 exact 会把刚失效在途的管理树取消重发，
  // 造成 /menus/tree 请求两次。
  const handleSaved = useCallback(() => {
    // 失效管理树缓存 + 刷新整站 RSC 数据（导航菜单为服务端注入，
    // 等价 React 版的 MENUS_QUERY_KEY 失效）
    void queryClient.invalidateQueries({
      queryKey: [...MENUS_TREE_QUERY_KEY, appliedSearch],
      exact: true,
    });
    router.refresh();
  }, [queryClient, appliedSearch, router]);

  const applySearch = useCallback(
    () => setAppliedSearch(searchInput.trim()),
    [searchInput],
  );

  const resetSearch = useCallback(() => {
    setSearchInput("");
    setAppliedSearch("");
  }, []);

  // 无新增搜索内容（输入与已应用条件一致）时，搜索/重置均无动作意义
  const searchDirty = searchInput.trim() !== appliedSearch;
  const canReset = searchDirty || appliedSearch !== "";

  // 弹窗状态：Modal.Backdrop 受控（§7.2 受控浮层语义）
  const [formOpen, setFormOpen] = useState(false);
  const [formContext, setFormContext] = useState<{
    mode: MenuFormMode;
    node: MenuNode | null;
  }>({ mode: "create", node: null });
  const [deleteTarget, setDeleteTarget] = useState<MenuNode | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMenu(id),
    onSuccess: () => {
      handleSaved();
      toast.success(t("features.menus.message.deleteSuccess"));
    },
    onError: (error) => {
      toast.danger(error instanceof Error ? error.message : String(error));
    },
  });

  const openForm = useCallback((mode: MenuFormMode, node: MenuNode | null) => {
    setFormContext({ mode, node });
    setFormOpen(true);
  }, []);

  const onEdit = useCallback(
    (node: MenuNode) => openForm("edit", node),
    [openForm],
  );
  const onAddChild = useCallback(
    (node: MenuNode) => openForm("addChild", node),
    [openForm],
  );
  const onDelete = useCallback((node: MenuNode) => {
    setDeleteTarget(node);
    setDeleteConfirmOpen(true);
  }, []);

  const columns = useMenusTableColumns({
    onEdit,
    onAddChild,
    onDelete,
  });
  const table = useMenusTable({ columns, data: data ?? [] });

  return (
    <div className="flex w-full flex-col pb-8">
      <DataTableToolbar
        columnSettingKey={
          userId ? buildColumnSettingKey(userId, "/menus") : undefined
        }
        table={table}
      >
        <SearchField
          aria-label={t("features.menus.searchPlaceholder")}
          className="w-64"
          value={searchInput}
          variant="secondary"
          onChange={setSearchInput}
          onSubmit={applySearch}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input
              placeholder={t("features.menus.searchPlaceholder")}
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <DataTableSearchReset
          canReset={canReset}
          isFetching={isFetching}
          searchDirty={searchDirty}
          onReset={resetSearch}
          onSearch={applySearch}
        />
        {canAdd && (
          <Button
            size="sm"
            variant="outline"
            onPress={() => openForm("create", null)}
          >
            <Plus className="size-4" />
            {t("features.menus.action.add")}
          </Button>
        )}
      </DataTableToolbar>

      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-default/60">
            <Spinner size="md" />
          </div>
        )}
        <MenusTreeTable isLoading={isFetching} table={table} />
      </div>

      <MenuFormDialog
        isOpen={formOpen}
        mode={formContext.mode}
        node={formContext.node}
        tree={data ?? []}
        onOpenChange={setFormOpen}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        destructive
        confirmText={t("common.delete")}
        description={t("features.menus.message.deleteDesc", {
          label: deleteTarget?.label ?? "",
        })}
        isLoading={deleteMutation.isPending}
        state={{
          isOpen: deleteConfirmOpen,
          setOpen: setDeleteConfirmOpen,
          close: () => setDeleteConfirmOpen(false),
        }}
        title={t("features.menus.message.deleteTitle")}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(deleteTarget!.id);
        }}
      />
    </div>
  );
}

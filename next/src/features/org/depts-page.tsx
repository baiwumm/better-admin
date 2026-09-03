"use client";

import type { Dept, DeptSortItem, DeptTreeNode } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/common/data-table/table-types";
import type { DeptFormMode } from "./dept-form-dialog";

import {
  Button,
  Chip,
  Dropdown,
  Label,
  Surface,
  Typography,
  toast,
  useOverlayState,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { deleteDept, getDeptErrorMessage, sortDepts } from "./dept-api";
import { DeptFormDialog } from "./dept-form-dialog";
import { DeptTreePanel } from "./dept-tree-panel";
import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "./dept-api";

import { ConfirmDialog } from "@/components/common/confirm-dialog/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import {
  DataTableViewOptions,
  buildColumnSettingKey,
} from "@/components/common/data-table";
import { appTableFeatures } from "@/components/common/data-table/table-types";
import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { useMenuPermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 组织管理页（契约 v1.6.0 阶段 1）：左树右表布局。
 *
 * - 数据源统一为全量树查询（GET /org/depts/tree）：左栏树、右栏选中组织
 *   详情与子组织列表均由树派生，避免树 + 分页双请求的瀑布；
 * - 同级拖拽整组重编号后提交 PATCH /org/depts/sort，成功后失效树缓存；
 * - 删除由后端三级校验 409 拦截（HAS_CHILDREN / HAS_POSTS / HAS_ACTIVE_USERS），
 *   前端二次确认弹窗 + toast 透出。
 */

interface FormContext {
  mode: DeptFormMode;
  dept: Dept | null;
  /** create：预设父级（新增子组织）；create-root 为 null */
  parentNode: DeptTreeNode | null;
}

export function DeptsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const { canAdd, canEdit, canDelete } = useMenuPermissions();

  // 全量树（含停用组织，左栏置灰）；staleTime 0 保证强一致
  const treeQuery = useQuery({
    queryKey: DEPTS_TREE_QUERY_KEY,
    queryFn: fetchDeptTree,
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
  const tree = useMemo(() => treeQuery.data ?? [], [treeQuery.data]);

  // 选中组织：派生态——selectedId 不在树中（被删/未选）时回退顶级首个
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = useMemo<DeptTreeNode | null>(() => {
    const find = (nodes: DeptTreeNode[]): DeptTreeNode | null => {
      for (const node of nodes) {
        if (node.id === selectedId) return node;
        const found = find(node.children);

        if (found) return found;
      }

      return null;
    };

    return find(tree) ?? tree[0] ?? null;
  }, [tree, selectedId]);

  const invalidateTree = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: DEPTS_TREE_QUERY_KEY });
  }, [queryClient]);

  const reorderMutation = useMutation({
    mutationFn: sortDepts,
    // 成功失败都失效树：失败时同样回拉服务端真实状态，避免本地残留拖拽后的视觉顺序
    onSettled: () => invalidateTree(),
  });

  /** 同级拖拽提交：toast.promise 全程反馈（排序中 → 成功/失败），失败自动回拉树 */
  const handleReorder = useCallback(
    (items: DeptSortItem[]) => {
      toast.promise(reorderMutation.mutateAsync(items), {
        loading: t("features.depts.message.sorting"),
        success: t("features.depts.message.sorted"),
        error: (error) => getDeptErrorMessage(error),
      });
    },
    [reorderMutation, t],
  );

  // ---------------- 弹窗状态（useOverlayState，§7.2 受控浮层语义） ----------------
  const formDialog = useOverlayState();
  const deleteDialog = useOverlayState();

  const [formContext, setFormContext] = useState<FormContext>({
    mode: "create",
    dept: null,
    parentNode: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<DeptTreeNode | null>(null);

  const openCreateRoot = useCallback(() => {
    setFormContext({ mode: "create", dept: null, parentNode: null });
    formDialog.open();
  }, [formDialog]);

  const openCreateChild = useCallback(
    (parent: DeptTreeNode) => {
      setFormContext({ mode: "create", dept: null, parentNode: parent });
      formDialog.open();
    },
    [formDialog],
  );

  const openEdit = useCallback(
    (dept: Dept | DeptTreeNode) => {
      setFormContext({ mode: "edit", dept: dept as Dept, parentNode: null });
      formDialog.open();
    },
    [formDialog],
  );

  const openDelete = useCallback(
    (node: DeptTreeNode) => {
      setDeleteTarget(node);
      deleteDialog.open();
    },
    [deleteDialog],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDept(id),
    onSuccess: () => {
      invalidateTree();
      toast.success(t("features.depts.message.deleted"));
    },
    onError: (error) => {
      toast.danger(getDeptErrorMessage(error));
    },
  });

  const handleSaved = useCallback(
    (_saved: Dept, mode: DeptFormMode) => {
      invalidateTree();
      // 新增子组织后展开父节点由「全展开」默认态天然覆盖，无需额外处理
      void mode;
    },
    [invalidateTree],
  );

  // ---------------- 子组织表格列（数据源：选中节点的 children） ----------------
  const childNodes = selectedNode?.children ?? [];

  const columns = useMemo<AppColumnDef<DeptTreeNode>[]>(
    () => [
      {
        id: "name",
        enableSorting: false,
        header: t("features.depts.column.name"),
        cell: ({ row }) => (
          <Typography className="font-medium" type="body-sm">
            {row.original.name}
          </Typography>
        ),
      },
      {
        id: "code",
        enableSorting: false,
        header: t("features.depts.column.code"),
        cell: ({ row }) => (
          <Typography className="font-mono" type="body-sm">
            {row.original.code ?? "—"}
          </Typography>
        ),
      },
      {
        id: "leaderName",
        enableSorting: false,
        header: t("features.depts.column.leader"),
        cell: ({ row }) => (
          <Typography type="body-sm">
            {row.original.leaderName ?? "—"}
          </Typography>
        ),
      },
      {
        id: "childCount",
        enableSorting: false,
        meta: { align: "center" },
        header: t("features.depts.column.childCount"),
        cell: ({ row }) => (
          <Chip size="sm">{row.original.children.length}</Chip>
        ),
      },
      {
        id: "status",
        enableSorting: false,
        meta: { align: "center" },
        header: t("features.depts.column.status"),
        cell: ({ row }) => (
          <Chip
            color={row.original.status === "enabled" ? "success" : "danger"}
            size="sm"
            variant="soft"
          >
            {t(
              row.original.status === "enabled"
                ? "features.depts.status.enabled"
                : "features.depts.status.disabled",
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
          if (!canEdit && !canDelete && !canAdd) return null;

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
                    if (key === "add") openCreateChild(row.original);
                    if (key === "edit") openEdit(row.original);
                    if (key === "delete") openDelete(row.original);
                  }}
                >
                  {canAdd && (
                    <Dropdown.Item
                      id="add"
                      textValue={t("features.depts.action.add")}
                    >
                      <Plus className="size-4 shrink-0 text-muted" />
                      <Label>{t("features.depts.action.add")}</Label>
                    </Dropdown.Item>
                  )}
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
    [t, canAdd, canEdit, canDelete, openCreateChild, openEdit, openDelete],
  );

  const table = useTable({
    columns,
    data: childNodes,
    features: appTableFeatures,
    // 全量展示：子组织列表随树派生，不渲染分页条
    manualPagination: true,
  });

  return (
    <div className="flex w-full flex-col pb-8">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* 左栏：组织树面板（与人员通讯录共用 DeptTreePanel） */}
        <DeptTreePanel
          canReorder={canEdit && !reorderMutation.isPending}
          emptyAction={
            canAdd ? (
              <Button size="sm" variant="outline" onPress={openCreateRoot}>
                <Plus className="size-4" />
                {t("features.depts.action.addRoot")}
              </Button>
            ) : undefined
          }
          emptyTitle={t("features.depts.tree.empty")}
          headerAction={
            canAdd ? (
              <Button
                isIconOnly
                aria-label={t("features.depts.action.addRoot")}
                size="sm"
                variant="outline"
                onPress={openCreateRoot}
              >
                <Plus className="size-4" />
              </Button>
            ) : undefined
          }
          isFetching={treeQuery.isFetching}
          isLoading={treeQuery.isLoading}
          nodes={tree}
          selectedId={selectedNode?.id ?? null}
          onReorder={handleReorder}
          onSelect={(node) => setSelectedId(node.id)}
        />

        {/* 右栏：选中组织详情 + 子组织列表 */}
        <div className="flex min-w-0 flex-col gap-6">
          <Surface className="flex flex-col gap-3 rounded-3xl p-4">
            {selectedNode ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Typography
                      className="truncate font-semibold"
                      type="body-sm"
                    >
                      {selectedNode.name}
                    </Typography>
                    <Chip
                      color={
                        selectedNode.status === "enabled" ? "success" : "danger"
                      }
                      size="sm"
                      variant="soft"
                    >
                      {t(
                        selectedNode.status === "enabled"
                          ? "features.depts.status.enabled"
                          : "features.depts.status.disabled",
                      )}
                    </Chip>
                  </div>
                  {/* 允许换行：窄屏/长名称时按钮折行右对齐，不挤压左侧标题区 */}
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {canAdd && (
                      <Button
                        size="sm"
                        onPress={() => openCreateChild(selectedNode)}
                      >
                        <Plus className="size-4" />
                        {t("features.depts.action.add")}
                      </Button>
                    )}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="tertiary"
                        onPress={() => openEdit(selectedNode)}
                      >
                        <Pencil className="size-4" />
                        {t("common.edit")}
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="sm"
                        variant="danger"
                        onPress={() => openDelete(selectedNode)}
                      >
                        <Trash2 className="size-4" />
                        {t("common.delete")}
                      </Button>
                    )}
                    <DataTableViewOptions
                      checkboxVariant="secondary"
                      storageKey={
                        userId
                          ? buildColumnSettingKey(userId, "/org/depts")
                          : undefined
                      }
                      table={table}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <Typography color="muted" type="body-sm">
                    {t("features.depts.column.code")}：
                    <span className="font-mono">
                      {selectedNode.code ?? "—"}
                    </span>
                  </Typography>
                  <Typography color="muted" type="body-sm">
                    {t("features.depts.column.leader")}：
                    {selectedNode.leaderName ?? "—"}
                  </Typography>
                  <Typography color="muted" type="body-sm">
                    {t("features.depts.detail.childCount", {
                      count: selectedNode.children.length,
                    })}
                  </Typography>
                </div>
              </>
            ) : (
              <EmptyContent
                className="flex flex-col items-center justify-center gap-2 py-10 text-muted"
                title={t("features.depts.detail.unselected")}
              />
            )}
          </Surface>

          {/* 子组织列表（与详情卡留出呼吸间距，页面底部有 pb-8） */}
          <div className="flex min-w-0 flex-col">
            <DataTable
              aria-label={t("menu.pageTitle.depts")}
              className="w-full"
              contentClassName="min-w-[640px]"
              isLoading={treeQuery.isLoading}
              table={table}
            />
          </div>
        </div>
      </div>

      {/* 弹窗集合 */}
      <DeptFormDialog
        dept={formContext.dept}
        isOpen={formDialog.isOpen}
        mode={formContext.mode}
        parentNode={formContext.parentNode}
        tree={tree}
        onOpenChange={formDialog.setOpen}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        destructive
        confirmText={t("common.delete")}
        description={t("features.depts.message.deleteDesc", {
          name: deleteTarget?.name ?? "",
        })}
        isLoading={deleteMutation.isPending}
        state={{
          isOpen: deleteDialog.isOpen,
          setOpen: deleteDialog.setOpen,
          close: deleteDialog.close,
        }}
        title={t("features.depts.message.deleteTitle")}
        onConfirm={async () => {
          await deleteMutation.mutateAsync(deleteTarget!.id);
        }}
      />
    </div>
  );
}

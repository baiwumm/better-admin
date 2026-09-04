import type { DictItem, DictType } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/common/data-table/table-types";

import {
  Button,
  Chip,
  Dropdown,
  Label,
  SearchField,
  Skeleton,
  Surface,
  Typography,
  cn,
  toast,
  useOverlayState,
} from "@heroui/react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTable } from "@tanstack/react-table";
import { Inbox, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import {
  DICT_TYPES_QUERY_KEY,
  deleteDictItem,
  deleteDictType,
  dictItemsQueryKey,
  fetchDictItems,
  fetchDictTypes,
  getDictErrorMessage,
} from "./dict-api";
import {
  DictItemFormDialog,
  type DictItemFormMode,
} from "./dict-item-form-dialog";
import {
  DictTypeFormDialog,
  type DictTypeFormMode,
} from "./dict-type-form-dialog";

import { ConfirmDialog } from "@/components/common/confirm-dialog/confirm-dialog";
import { DataTable } from "@/components/common/data-table";
import {
  DataTableSearchReset,
  DataTableToolbar,
  buildColumnSettingKey,
} from "@/components/common/data-table";
import { appTableFeatures } from "@/components/common/data-table/table-types";
import { useMenuPermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/stores/auth-store";
import { useDictStore } from "@/stores/dict-store";

/**
 * 字典管理页：双栏布局——左栏字典类型（DictType），右栏选中类型的字典项（DictItem）。
 *
 * - 契约 v1.4 无分页：类型/项均全量拉取 + 前端提交式关键字过滤（量级小）；
 * - 选中类型为派生态（selectedCode 失效自动回退首个，删除后无需手动清理）；
 * - 字典项保存后联动刷新 dict-store（业务页下拉实时更新）；
 * - 删除被引用的类型由后端 409（DICT_TYPE_IN_USE）拦截，toast 透出。
 */

export function DictsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const { canAdd, canEdit, canDelete } = useMenuPermissions();

  // ---------------- 字典类型（左栏） ----------------
  const typesQuery = useQuery({
    queryKey: DICT_TYPES_QUERY_KEY,
    queryFn: fetchDictTypes,
    staleTime: 0,
  });
  const types = useMemo(() => typesQuery.data ?? [], [typesQuery.data]);

  // 选中类型：派生态——selectedCode 不在列表中（被删/未选）时回退首个
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const activeType = useMemo(
    () => types.find((type) => type.code === selectedCode) ?? types[0] ?? null,
    [types, selectedCode],
  );

  // 左栏过滤（提交式本地过滤：code / 名称 / 描述）
  const [typeSearchInput, setTypeSearchInput] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const filteredTypes = useMemo(() => {
    const normalized = typeSearch.trim().toLowerCase();

    if (!normalized) return types;

    return types.filter((type) =>
      [type.code, type.name, type.description ?? ""].some((text) =>
        text.toLowerCase().includes(normalized),
      ),
    );
  }, [types, typeSearch]);

  const applyTypeSearch = useCallback(
    () => setTypeSearch(typeSearchInput.trim()),
    [typeSearchInput],
  );

  // ---------------- 字典项（右栏） ----------------
  const itemsQuery = useQuery({
    queryKey: dictItemsQueryKey(activeType?.code ?? ""),
    queryFn: () => fetchDictItems(activeType!.code),
    enabled: Boolean(activeType),
    placeholderData: keepPreviousData,
    staleTime: 0,
  });
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  // 右栏过滤（提交式本地过滤：value / label / i18nKey）
  const [itemSearchInput, setItemSearchInput] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const filteredItems = useMemo(() => {
    const normalized = itemSearch.trim().toLowerCase();

    if (!normalized) return items;

    return items.filter((item) =>
      [item.value, item.label, item.i18nKey ?? ""].some((text) =>
        text.toLowerCase().includes(normalized),
      ),
    );
  }, [items, itemSearch]);

  const applyItemSearch = useCallback(
    () => setItemSearch(itemSearchInput.trim()),
    [itemSearchInput],
  );
  const resetItemSearch = useCallback(() => {
    setItemSearchInput("");
    setItemSearch("");
  }, []);

  // 搜索按钮按「有未应用的新条件」启用，重置按「存在已应用条件或新条件」启用
  const itemSearchDirty = itemSearchInput.trim() !== itemSearch;
  const canResetItems = itemSearchDirty || itemSearch !== "";

  // ---------------- 缓存失效 ----------------
  /**
   * 刷新右栏列表并回填业务侧字典缓存：
   * 等待失效重取完成后，用本次请求结果直接写入 dict-store，
   * 避免为同步业务缓存再单独发一次请求。
   */
  const refreshItemsAndSync = useCallback(
    async (code: string) => {
      await queryClient.invalidateQueries({
        queryKey: dictItemsQueryKey(code),
        exact: true,
      });
      const fresh = queryClient.getQueryData<DictItem[]>(
        dictItemsQueryKey(code),
      );

      if (fresh) useDictStore.getState().setDict(code, fresh);
    },
    [queryClient],
  );

  /** 项保存后：刷新右栏列表 + 业务侧字典缓存（下拉实时，单次请求） */
  const handleItemSaved = useCallback(() => {
    if (activeType) void refreshItemsAndSync(activeType.code);
  }, [activeType, refreshItemsAndSync]);

  /**
   * 类型保存后：等待类型列表刷新完成再切选中（创建场景），
   * 保证切选时列表已包含新类型——右栏 items 只发一次请求。
   */
  const handleTypeSaved = useCallback(
    async (saved: DictType, mode: DictTypeFormMode) => {
      await queryClient.invalidateQueries({ queryKey: DICT_TYPES_QUERY_KEY });
      if (mode === "create") setSelectedCode(saved.code);
    },
    [queryClient],
  );

  // ---------------- 弹窗状态（useOverlayState，§7.2 受控浮层语义） ----------------
  const typeDialog = useOverlayState();
  const itemDialog = useOverlayState();
  const typeDeleteDialog = useOverlayState();
  const itemDeleteDialog = useOverlayState();

  const [typeFormContext, setTypeFormContext] = useState<{
    mode: DictTypeFormMode;
    type: DictType | null;
  }>({ mode: "create", type: null });
  const [itemFormContext, setItemFormContext] = useState<{
    mode: DictItemFormMode;
    item: DictItem | null;
  }>({ mode: "create", item: null });
  const [deleteTypeTarget, setDeleteTypeTarget] = useState<DictType | null>(
    null,
  );
  const [deleteItemTarget, setDeleteItemTarget] = useState<DictItem | null>(
    null,
  );

  const openTypeForm = useCallback(
    (mode: DictTypeFormMode, type: DictType | null) => {
      setTypeFormContext({ mode, type });
      typeDialog.open();
    },
    [typeDialog],
  );

  const openItemForm = useCallback(
    (mode: DictItemFormMode, item: DictItem | null) => {
      setItemFormContext({ mode, item });
      itemDialog.open();
    },
    [itemDialog],
  );

  const onDeleteType = useCallback(
    (type: DictType) => {
      setDeleteTypeTarget(type);
      typeDeleteDialog.open();
    },
    [typeDeleteDialog],
  );

  const onDeleteItem = useCallback(
    (item: DictItem) => {
      setDeleteItemTarget(item);
      itemDeleteDialog.open();
    },
    [itemDeleteDialog],
  );

  /**
   * 删除类型：失败（409 被引用等）toast 透出并关闭弹窗。
   * 成功后只清业务侧缓存与失效类型列表，不 removeQueries——
   * 激活中的 items 观察者被移除缓存后会立即重发请求（对已删类型
   * 返回 404）；残留缓存随 gcTime 回收，重建同名类型时 staleTime 0
   * 会立即重取，选中态经派生自动回退首个。
   */
  const confirmDeleteType = useCallback(async () => {
    if (!deleteTypeTarget) return;
    try {
      await deleteDictType(deleteTypeTarget.code);
    } catch (error) {
      toast.danger(getDictErrorMessage(error));

      return;
    }
    useDictStore.getState().clearDict(deleteTypeTarget.code);
    await queryClient.invalidateQueries({ queryKey: DICT_TYPES_QUERY_KEY });
    toast.success(t("features.dicts.message.typeDeleted"));
  }, [deleteTypeTarget, queryClient, t]);

  const confirmDeleteItem = useCallback(async () => {
    if (!deleteItemTarget) return;
    try {
      await deleteDictItem(deleteItemTarget.id);
    } catch (error) {
      toast.danger(getDictErrorMessage(error));

      return;
    }
    if (activeType) await refreshItemsAndSync(activeType.code);
    toast.success(t("features.dicts.message.itemDeleted"));
  }, [deleteItemTarget, activeType, refreshItemsAndSync, t]);

  // ---------------- 右栏表格列定义 ----------------
  const columns = useMemo<AppColumnDef<DictItem>[]>(
    () => [
      {
        id: "label",
        enableSorting: false,
        header: t("features.dicts.column.label"),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Typography className="font-medium" type="body-sm">
              {row.original.label}
            </Typography>
            {row.original.i18nKey && (
              <Typography color="muted" type="body-xs">
                {row.original.i18nKey}
              </Typography>
            )}
          </div>
        ),
      },
      {
        id: "value",
        enableSorting: false,
        header: t("features.dicts.column.value"),
        cell: ({ row }) => (
          <Typography className="font-mono" type="body-sm">
            {row.original.value}
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
        header: t("features.dicts.column.enabled"),
        cell: ({ row }) => (
          <Chip
            color={row.original.enabled ? "success" : "danger"}
            size="sm"
            variant="soft"
          >
            {t(
              row.original.enabled
                ? "features.dicts.enabled.yes"
                : "features.dicts.enabled.no",
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
                    if (key === "edit") openItemForm("edit", row.original);
                    if (key === "delete") onDeleteItem(row.original);
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
    [t, canEdit, canDelete, openItemForm, onDeleteItem],
  );

  const table = useTable({
    columns,
    data: filteredItems,
    features: appTableFeatures,
    // 全量展示：关闭自动分页切片（本页不渲染分页条）
    manualPagination: true,
  });

  return (
    <div className="flex w-full flex-col pb-8">
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* 左栏：字典类型 */}
        <Surface className="flex flex-col gap-3 rounded-3xl p-4">
          <div className="flex items-center justify-between gap-2">
            <Typography className="font-medium" type="body-sm">
              {t("features.dicts.type.title")}
              <span className="ms-1 text-muted">({types.length})</span>
            </Typography>
            {canAdd && (
              <Button
                isIconOnly
                aria-label={t("features.dicts.type.add")}
                size="sm"
                variant="outline"
                onPress={() => openTypeForm("create", null)}
              >
                <Plus className="size-4" />
              </Button>
            )}
          </div>

          <SearchField
            aria-label={t("features.dicts.type.searchPlaceholder")}
            value={typeSearchInput}
            variant="secondary"
            onChange={setTypeSearchInput}
            onSubmit={applyTypeSearch}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder={t("features.dicts.type.searchPlaceholder")}
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

          {typesQuery.isLoading ? (
            // 骨架屏：与列表行同形的占位（名称行 + code 行）
            <div className="flex flex-col gap-1">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-1.5 rounded-2xl px-3 py-2"
                >
                  <Skeleton className="h-3.5 w-3/5 rounded-md" />
                  <Skeleton className="h-3 w-2/5 rounded-md" />
                </div>
              ))}
            </div>
          ) : filteredTypes.length === 0 ? (
            <Typography color="muted" type="body-xs">
              {t(
                typeSearch
                  ? "features.dicts.type.noMatch"
                  : "features.dicts.type.empty",
              )}
            </Typography>
          ) : (
            <div className="flex flex-col gap-1">
              {filteredTypes.map((type) => {
                const isActive = type.code === activeType?.code;

                return (
                  <div
                    key={type.code}
                    className={cn(
                      "group flex w-full cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 text-start transition-colors",
                      "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                      isActive ? "bg-default" : "hover:bg-default/60",
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCode(type.code)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedCode(type.code);
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <Typography
                        className="truncate font-medium"
                        type="body-sm"
                      >
                        {type.name}
                      </Typography>
                      <Typography
                        className="truncate"
                        color="muted"
                        type="body-xs"
                      >
                        {type.code}
                      </Typography>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                      {canEdit && (
                        <Button
                          isIconOnly
                          aria-label={t("common.edit")}
                          className="data-[hovered=true]:bg-default-hover"
                          size="sm"
                          variant="ghost"
                          onPress={() => openTypeForm("edit", type)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          isIconOnly
                          aria-label={t("common.delete")}
                          className="data-[hovered=true]:bg-default-hover"
                          size="sm"
                          variant="ghost"
                          onPress={() => onDeleteType(type)}
                        >
                          <Trash2 className="size-3.5 text-danger" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Surface>

        {/* 右栏：选中类型的字典项 */}
        <div className="flex min-w-0 flex-col">
          <DataTableToolbar
            columnSettingKey={
              userId ? buildColumnSettingKey(userId, "/dicts") : undefined
            }
            table={table}
          >
            <SearchField
              aria-label={t("features.dicts.item.searchPlaceholder")}
              className="w-64"
              value={itemSearchInput}
              variant="secondary"
              onChange={setItemSearchInput}
              onSubmit={applyItemSearch}
            >
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  placeholder={t("features.dicts.item.searchPlaceholder")}
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <DataTableSearchReset
              canReset={canResetItems}
              isFetching={itemsQuery.isFetching}
              searchDirty={itemSearchDirty}
              onReset={resetItemSearch}
              onSearch={applyItemSearch}
            />
            {canAdd && (
              <Button
                isDisabled={!activeType}
                size="sm"
                variant="outline"
                onPress={() => openItemForm("create", null)}
              >
                <Plus className="size-4" />
                {t("features.dicts.item.add")}
              </Button>
            )}
          </DataTableToolbar>

          <DataTable
            aria-label={t("menu.pageTitle.dicts")}
            className="w-full"
            contentClassName="min-w-[640px]"
            emptyState={
              activeType ? undefined : (
                // 与 EmptyContent 同构的居中空态
                <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted">
                  <Inbox aria-hidden className="size-10" />
                  <Typography color="muted" type="body-sm">
                    {t("features.dicts.item.noSelection")}
                  </Typography>
                </div>
              )
            }
            isLoading={itemsQuery.isLoading || itemsQuery.isFetching}
            table={table}
          />
        </div>
      </div>

      {/* 弹窗集合 */}
      <DictTypeFormDialog
        isOpen={typeDialog.isOpen}
        mode={typeFormContext.mode}
        type={typeFormContext.type}
        onOpenChange={typeDialog.setOpen}
        onSaved={handleTypeSaved}
      />

      <DictItemFormDialog
        isOpen={itemDialog.isOpen}
        item={itemFormContext.item}
        mode={itemFormContext.mode}
        typeCode={activeType?.code ?? ""}
        onOpenChange={itemDialog.setOpen}
        onSaved={handleItemSaved}
      />

      <ConfirmDialog
        destructive
        confirmKeyword={deleteTypeTarget?.code}
        confirmText={t("common.delete")}
        description={t("features.dicts.message.deleteTypeDesc", {
          code: deleteTypeTarget?.code ?? "",
        })}
        keywordLabel={t("features.dicts.message.deleteTypeKeyword")}
        state={{
          isOpen: typeDeleteDialog.isOpen,
          setOpen: typeDeleteDialog.setOpen,
          close: typeDeleteDialog.close,
        }}
        title={t("features.dicts.message.deleteTypeTitle")}
        onConfirm={confirmDeleteType}
      />

      <ConfirmDialog
        destructive
        confirmText={t("common.delete")}
        description={t("features.dicts.message.deleteItemDesc", {
          label: deleteItemTarget?.label ?? "",
        })}
        state={{
          isOpen: itemDeleteDialog.isOpen,
          setOpen: itemDeleteDialog.setOpen,
          close: itemDeleteDialog.close,
        }}
        title={t("features.dicts.message.deleteItemTitle")}
        onConfirm={confirmDeleteItem}
      />
    </div>
  );
}

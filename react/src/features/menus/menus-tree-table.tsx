import type { TFunction } from "i18next";
import type { MenuNode, PermissionItem } from "@/lib/api-types";
import type { IconName } from "lucide-react/dynamic";

import { useTable } from "@tanstack/react-table";
import {
  Button,
  Checkbox,
  Chip,
  Dropdown,
  Label,
  Typography,
} from "@heroui/react";
import { DynamicIcon } from "lucide-react/dynamic";
import { memo, useMemo } from "react";
import {
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  DataTable,
  appTableFeatures,
  type AppColumnDef,
  type AppTable,
} from "@/components/common/data-table";
import { useHasPermissionKey, usePermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/i18n";

/**
 * 菜单管理树形表格：TanStack expanded 模型（getSubRows + expandedRowModel，
 * 初始全展开）+ DataTable 渲染层 —— 列设置/列显隐等通用能力即插即用。
 * 树形数据不接分页；列头不启用排序（排序由后端 order 参数控制）。
 *
 * 表实例由页面创建（useMenusTable）并共享给 DataTableToolbar（列设置），
 * 本组件只负责渲染。
 */

export interface MenusTreeTableProps {
  table: AppTable<MenuNode>;
  isLoading?: boolean;
}

export function MenusTreeTable({
  table,
  isLoading = false,
}: MenusTreeTableProps) {
  const { t } = useTranslation();

  return (
    <DataTable
      aria-label={t("menu.pageTitle.menus")}
      className="w-full"
      contentClassName="min-w-[860px]"
      isLoading={isLoading}
      table={table}
    />
  );
}

interface ColumnCallbacks {
  onEdit: (node: MenuNode) => void;
  onAddChild: (node: MenuNode) => void;
  onDelete: (node: MenuNode) => void;
}

/** 布尔开关单元格：Checkbox 只读展示（选中=开，未选中=关） */
function BoolCheckbox({ value, label }: { value: boolean; label: string }) {
  return (
    <Checkbox
      isDisabled
      aria-label={label}
      isSelected={value}
      variant="secondary"
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  );
}

/** 布尔开关独立列工厂（路由保活 / 侧边栏隐藏 / 启用 / 默认展开） */
function boolColumn(
  id: string,
  labelKey: string,
  field: "keepAlive" | "hideInMenu" | "enabled" | "defaultOpen",
  t: TFunction,
): AppColumnDef<MenuNode> {
  return {
    id,
    enableSorting: false,
    meta: { align: "center" },
    header: t(labelKey),
    cell: ({ row }) => (
      <BoolCheckbox
        label={t(labelKey)}
        value={Boolean((row.original as MenuNode)[field])}
      />
    ),
  };
}

interface GrantedPermission {
  displayName: string;
  icon: string;
}

/** 解析节点位掩码，返回已授权权限点（带 i18n 显示名） */
function getGrantedPermissions(
  permissions: string,
  items: PermissionItem[],
  t: TFunction,
): GrantedPermission[] {
  let bits: bigint;

  try {
    bits = BigInt(permissions || "0");
  } catch {
    return [];
  }

  if (bits === 0n) return [];

  return items
    .filter((item) => {
      const itemBits = BigInt(item.bits);

      return itemBits !== 0n && (bits & itemBits) === itemBits;
    })
    .map((item) => {
      const key = `features.permissions.items.${item.value}`;
      const name = t(key);

      return {
        displayName: name === key ? item.label : name,
        icon: item.icon,
      };
    });
}

/** 树形子行取值（模块级稳定引用，避免 options 变化引发行重建） */
const menuSubRows = (row: MenuNode) => row.children;

/**
 * 菜单图标（memo）：DynamicIcon 异步加载图标，重渲染/重挂载会短暂空白
 * 导致行高抖动；memo 化后仅在名称变化时才重新渲染。
 */
const MenuIcon = memo(function MenuIcon({ name }: { name: string }) {
  return (
    <span className="grid size-4 shrink-0 place-items-center">
      <DynamicIcon
        aria-hidden
        className="text-muted"
        name={name as IconName}
        size={16}
      />
    </span>
  );
});

/** 菜单表列定义（页面通过 useMenusTable 装配为表实例） */
export function useMenusTableColumns({
  onEdit,
  onAddChild,
  onDelete,
}: ColumnCallbacks): AppColumnDef<MenuNode>[] {
  const { t } = useTranslation();
  const canEdit = useHasPermissionKey("EDIT");
  const canAddChild = useHasPermissionKey("ADD_CHILD");
  const canDelete = useHasPermissionKey("DELETE");
  const { data: permissionItems } = usePermissions();

  return useMemo<AppColumnDef<MenuNode>[]>(
    () => [
      {
        id: "label",
        enableSorting: false,
        header: t("features.menus.column.name"),
        cell: ({ row }) => {
          const node = row.original as MenuNode;

          return (
            <span
              className="flex items-center gap-2"
              style={{ paddingInlineStart: row.depth * 12 }}
            >
              {row.getCanExpand() ? (
                <Button
                  isIconOnly
                  aria-label={t("features.menus.tree.toggle")}
                  className="shrink-0"
                  size="sm"
                  variant="ghost"
                  onPress={row.getToggleExpandedHandler()}
                >
                  <ChevronRight
                    aria-hidden
                    className={
                      row.getIsExpanded()
                        ? "size-4 text-muted transition-transform duration-150 rotate-90"
                        : "size-4 text-muted transition-transform duration-150"
                    }
                  />
                </Button>
              ) : (
                <span className="inline-block size-8 shrink-0" />
              )}
              <MenuIcon name={node.icon || "circle"} />
              <span className="font-medium">{node.label}</span>
            </span>
          );
        },
      },
      {
        id: "route",
        enableSorting: false,
        header: t("features.menus.column.route"),
        cell: ({ row }) => {
          const node = row.original as MenuNode;

          return (
            <Typography
              className="flex items-center gap-1"
              color="muted"
              type="body-sm"
            >
              {node.to ?? "—"}
            </Typography>
          );
        },
      },
      {
        // 按钮权限位：首个显示「图标 + 中文名」，其余以 +N 汇总；无则显示 -
        id: "permissions",
        enableSorting: false,
        header: t("features.menus.column.permissions"),
        cell: ({ row }) => {
          const node = row.original as MenuNode;
          const granted = getGrantedPermissions(
            node.permissions,
            permissionItems ?? [],
            t,
          );

          if (granted.length === 0) {
            return (
              <Typography color="muted" type="body-sm">
                —
              </Typography>
            );
          }

          const [first, ...rest] = granted;

          return (
            <span className="flex items-center gap-1.5">
              <Chip size="sm">
                <span className="flex items-center gap-1">
                  {first.icon ? (
                    <DynamicIcon
                      aria-hidden
                      className="text-muted"
                      name={first.icon as IconName}
                      size={14}
                    />
                  ) : null}
                  {first.displayName}
                </span>
              </Chip>
              {rest.length > 0 && (
                <Typography color="muted" type="body-xs">
                  +{rest.length}
                </Typography>
              )}
            </span>
          );
        },
      },
      boolColumn("keepAlive", "features.menus.form.keepAlive", "keepAlive", t),
      boolColumn(
        "hideInMenu",
        "features.menus.form.hideInMenu",
        "hideInMenu",
        t,
      ),
      boolColumn("enabled", "features.menus.form.enabled", "enabled", t),
      boolColumn(
        "defaultOpen",
        "features.menus.form.defaultOpen",
        "defaultOpen",
        t,
      ),
      {
        id: "sort",
        enableSorting: false,
        meta: { align: "center" },
        header: t("common.column.sort"),
        cell: ({ row }) => <Chip>{(row.original as MenuNode).sort}</Chip>,
      },
      {
        id: "actions",
        enableSorting: false,
        enableHiding: false,
        meta: { align: "center" },
        header: t("common.actions"),
        cell: ({ row }) => {
          const node = row.original as MenuNode;

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
                    if (key === "edit") onEdit(node);
                    if (key === "addChild") onAddChild(node);
                    if (key === "delete") onDelete(node);
                  }}
                >
                  {canEdit && (
                    <Dropdown.Item id="edit" textValue={t("common.edit")}>
                      <Pencil className="size-4 shrink-0 text-muted" />
                      <Label>{t("common.edit")}</Label>
                    </Dropdown.Item>
                  )}
                  {canAddChild && (
                    <Dropdown.Item
                      id="addChild"
                      textValue={t("features.menus.action.addChild")}
                    >
                      <Plus className="size-4 shrink-0 text-muted" />
                      <Label>{t("features.menus.action.addChild")}</Label>
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
    [
      t,
      canEdit,
      canAddChild,
      canDelete,
      permissionItems,
      onEdit,
      onAddChild,
      onDelete,
    ],
  );
}

/** 装配菜单管理表实例：树形展开（subRows = children），初始全部展开 */
export function useMenusTable({
  columns,
  data,
}: {
  columns: AppColumnDef<MenuNode>[];
  data: MenuNode[];
}): AppTable<MenuNode> {
  return useTable({
    columns: columns as never,
    data,
    features: appTableFeatures,
    getSubRows: menuSubRows,
    initialState: { expanded: true },
    manualPagination: true,
    manualSorting: true,
  });
}

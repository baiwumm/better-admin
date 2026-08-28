import type { RowData } from "@tanstack/react-table";
import type { Selection } from "@heroui/react";
import type { ColumnVisibilityState } from "@tanstack/react-table";
import type { AppTable } from "./table-types";

import { Dropdown, Label, Separator, Button } from "@heroui/react";
import { useEffect, useState } from "react";
import { Settings2, RotateCcw } from "lucide-react";

import { useTranslation } from "@/i18n";

/** 重置操作的保留 id（不参与列可见性） */
const RESET_ACTION_KEY = "__reset__";

/**
 * 列设置持久化 storage key 规则：
 * `column-setting:{userId}:{routePath}`（按用户 + 路由路径共享，不含查询参数）。
 *
 * @example buildColumnSettingKey("12345", "/users") => "column-setting:12345:/users"
 */
export function buildColumnSettingKey(userId: string, routePath: string) {
  return `column-setting:${userId}:${routePath}`;
}

/** 读取持久化的隐藏列 id 列表（schema 校验：仅接受字符串数组） */
function readHiddenColumns(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);

    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
    ) {
      return parsed;
    }

    return [];
  } catch {
    return [];
  }
}

export interface DataTableViewOptionsProps<TData extends RowData> {
  table: AppTable<TData>;
  /** 持久化 key（buildColumnSettingKey 生成）；不传则不持久化 */
  storageKey?: string;
  className?: string;
}

/**
 * 列设置下拉：多选切换列可见性，支持一键重置。
 * 仅存储「隐藏列」id 列表（最小化 localStorage 数据），可见列随列定义演进。
 */
export function DataTableViewOptions<TData extends RowData>({
  table,
  storageKey,
  className,
}: DataTableViewOptionsProps<TData>) {
  const { t } = useTranslation();
  const hideableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide());
  const [hasRestored, setHasRestored] = useState(false);

  // 挂载时恢复持久化的列设置（仅一次）
  useEffect(() => {
    if (!storageKey || hideableColumns.length === 0) return;
    const hidden = new Set(readHiddenColumns(storageKey));

    if (hidden.size > 0) {
      const visibility: ColumnVisibilityState = {};

      for (const column of hideableColumns) {
        visibility[column.id] = !hidden.has(column.id);
      }
      table.setColumnVisibility(visibility);
    }
    setHasRestored(true);
    // 仅挂载时恢复一次；依赖按 eslint 要求最小化
  }, [storageKey]);

  // 变更后持久化「隐藏列」id 列表
  useEffect(() => {
    if (!storageKey || !hasRestored) return;
    const hidden = hideableColumns
      .filter((column) => !column.getIsVisible())
      .map((column) => column.id);

    try {
      if (hidden.length === 0) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(hidden));
      }
    } catch {
      // 存储不可用时忽略（列设置退化为会话内生效）
    }
  }, [JSON.stringify(table.state.columnVisibility), storageKey]);

  if (hideableColumns.length === 0) return null;

  const selectedKeys = new Set<string>(
    hideableColumns.filter((c) => c.getIsVisible()).map((c) => c.id),
  );

  const handleSelectionChange = (keys: Selection) => {
    // 「全选」语义 = 恢复全部列可见
    if (keys === "all") {
      table.setColumnVisibility({});

      return;
    }
    const next = new Set<string>([...keys].map(String));

    if (next.has(RESET_ACTION_KEY)) {
      resetColumns();

      return;
    }
    const visibility: ColumnVisibilityState = {};

    for (const column of hideableColumns) {
      visibility[column.id] = next.has(column.id);
    }
    table.setColumnVisibility(visibility);
  };

  const resetColumns = () => {
    table.setColumnVisibility({});
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // 忽略存储异常
      }
    }
  };

  return (
    <Dropdown>
      <Button className={className} size="sm" variant="outline">
        <Settings2 />
        {t("common.datatable.columnSettings")}
      </Button>
      <Dropdown.Popover className="min-w-44">
        <Dropdown.Menu
          selectedKeys={selectedKeys}
          selectionMode="multiple"
          onSelectionChange={handleSelectionChange}
        >
          <Dropdown.Section>
            {hideableColumns.map((column) => (
              <Dropdown.Item
                key={column.id}
                id={column.id}
                textValue={
                  typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id
                }
              >
                <Dropdown.ItemIndicator />
                <Label>
                  {typeof column.columnDef.header === "string"
                    ? column.columnDef.header
                    : column.id}
                </Label>
              </Dropdown.Item>
            ))}
          </Dropdown.Section>
          <Separator />
          <Dropdown.Item
            id={RESET_ACTION_KEY}
            textValue={t("common.datatable.resetColumns")}
          >
            <RotateCcw className="size-4 shrink-0 text-muted" />
            <Label>{t("common.datatable.resetColumns")}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

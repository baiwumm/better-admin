import type { RowData } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { AppTable } from "./table-types";

import { Surface, cn } from "@heroui/react";

import { DataTableViewOptions } from "./data-table-view-options";

export interface DataTableToolbarProps<TData extends RowData> {
  /**
   * 列设置（传入 table 即渲染右侧「列设置」下拉；storageKey 用于持久化）。
   * 工具栏本身是纯布局壳：搜索框 / 筛选器 / 搜索重置按钮等搜索条件
   * 因页面而异，由各页面在 children 中自行组合。
   */
  table?: AppTable<TData>;
  /** 列设置持久化 key（column-setting:{userId}:{routePath}），不传则不持久化 */
  columnSettingKey?: string;
  /** 左侧区域：页面自行组合搜索框、筛选器、操作按钮等 */
  children?: ReactNode;
  /** 右侧动作区（列设置之后的追加插槽，如「新增」按钮） */
  endSlot?: ReactNode;
  className?: string;
}

/**
 * 表格工具栏（纯布局壳）：Surface 容器 + 左右分栏 + 可选列设置。
 * 左侧（children）放什么完全由页面决定；右侧固定为 endSlot + 列设置。
 */
export function DataTableToolbar<TData extends RowData>({
  table,
  columnSettingKey,
  children,
  endSlot,
  className,
}: DataTableToolbarProps<TData>) {
  return (
    <Surface
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl",
        className,
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      <div className="flex items-center gap-2">
        {endSlot}
        {table && (
          <DataTableViewOptions storageKey={columnSettingKey} table={table} />
        )}
      </div>
    </Surface>
  );
}

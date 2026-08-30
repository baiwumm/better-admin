import type { RowData, Table } from "@tanstack/react-table";
import type { AppRow, AppTableFeatures } from "./table-types";

import { Checkbox } from "@heroui/react";

import { useTranslation } from "@/i18n";

/**
 * 行选择 Checkbox 与 TanStack rowSelection 的桥接件。
 * 用法：feature 在列定义中添加 select 列——
 *
 * ```ts
 * {
 *   id: "select",
 *   enableSorting: false,
 *   enableHiding: false,
 *   header: ({ table }) => <DataTableSelectAll table={table} />,
 *   cell: ({ row }) => <DataTableSelectRow row={row} />,
 * }
 * ```
 *
 * 不启用 HeroUI Table 原生 selectionMode（保留行点击给业务行为）。
 */

/**
 * 列定义 header 上下文中的 table 为 TanStack core Table（不含 React 绑定层
 * 的 store/Subscribe/FlexRender），故此处收窄为 core Table 类型；
 * useTable 实例（ReactTable）天然可赋值给 core Table。
 */
type SelectionTable<TData extends RowData> = Table<AppTableFeatures, TData>;

export function DataTableSelectAll<TData extends RowData>({
  table,
}: {
  table: SelectionTable<TData>;
}) {
  const { t } = useTranslation();
  const allSelected = table.getIsAllRowsSelected();
  const someSelected = table.getIsSomeRowsSelected();

  return (
    // HeroUI Table（react-aria）上下文内 Checkbox 必须声明 selection slot，
    // 否则运行时抛 "A slot prop is required. Valid slot names are 'selection'"
    <Checkbox
      aria-label={t("common.datatable.selectAll")}
      isIndeterminate={someSelected && !allSelected}
      isSelected={allSelected}
      slot="selection"
      onChange={(checked) => table.toggleAllRowsSelected(checked)}
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  );
}

export function DataTableSelectRow<TData extends RowData>({
  row,
}: {
  row: AppRow<TData>;
}) {
  const { t } = useTranslation();

  return (
    // 同上：Table 上下文内必须声明 selection slot；行内用 secondary 弱化样式
    <Checkbox
      aria-label={t("common.datatable.selectRow")}
      isDisabled={!row.getCanSelect()}
      isSelected={row.getIsSelected()}
      slot="selection"
      variant="secondary"
      onChange={(checked) => row.toggleSelected(checked)}
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  );
}

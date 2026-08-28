import type { RowData } from "@tanstack/react-table";
import type { AppRow, AppTable } from "./table-types";

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

export function DataTableSelectAll<TData extends RowData>({
  table,
}: {
  table: AppTable<TData>;
}) {
  const { t } = useTranslation();
  const allSelected = table.getIsAllRowsSelected();
  const someSelected = table.getIsSomeRowsSelected();

  return (
    <Checkbox
      aria-label={t("common.datatable.selectAll")}
      isIndeterminate={someSelected && !allSelected}
      isSelected={allSelected}
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
    <Checkbox
      aria-label={t("common.datatable.selectRow")}
      isDisabled={!row.getCanSelect()}
      isSelected={row.getIsSelected()}
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

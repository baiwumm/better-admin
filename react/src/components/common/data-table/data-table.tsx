import type { SortDescriptor } from "@heroui/react";
import type { ReactNode } from "react";
import type { SortingState } from "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";
import type { LegacyReactTable as TanStackTableBase } from "@tanstack/react-table/legacy";

import { Spinner, Table, Typography, cn } from "@heroui/react";
import { flexRender } from "@tanstack/react-table";

import { useTranslation } from "@/i18n";

/** v9 legacy 兼容层类型（单泛型），业务列定义保持 v8 风格写法 */
type TanStackTable<TData extends RowData> = TanStackTableBase<TData>;

/**
 * TanStack Table（逻辑层）→ HeroUI Table（渲染层）桥接。
 *
 * - 排序：TanStack SortingState ↔ React Aria SortDescriptor；
 *   服务端排序在 feature 侧配置 `manualSorting: true`（由 useListQuery 的
 *   sortField/sortOrder 映射为 sort/order 请求参数）。
 * - 行选择：不启用 HeroUI 原生 selectionMode（避免行点击被 react-aria
 *   选中行为占用）；feature 在列定义中使用 DataTableSelectAll /
 *   DataTableSelectRow 受控 Checkbox 桥接 TanStack rowSelection。
 * - 服务端分页：feature 配置 `manualPagination: true` + `pageCount`。
 */

/** TanStack SortingState → React Aria SortDescriptor */
function toSortDescriptor(sorting: SortingState): SortDescriptor | undefined {
  const first = sorting[0];

  if (!first) return undefined;

  return {
    column: first.id,
    direction: first.desc ? "descending" : "ascending",
  };
}

/** React Aria SortDescriptor → TanStack SortingState */
function toSortingState(descriptor: SortDescriptor): SortingState {
  return [
    {
      desc: descriptor.direction === "descending",
      id: descriptor.column as string,
    },
  ];
}

export interface DataTableProps<TData extends RowData> {
  /** useReactTable 实例 */
  table: TanStackTable<TData>;
  /** 首次加载 / 整页刷新时展示遮罩 */
  isLoading?: boolean;
  /** 空数据占位（默认统一文案） */
  emptyState?: ReactNode;
  ariaLabel?: string;
  className?: string;
  /** Table.Content 的 className（如 min-w-* 控制横向滚动宽度） */
  contentClassName?: string;
}

export function DataTable<TData extends RowData>({
  table,
  isLoading = false,
  emptyState,
  ariaLabel,
  className,
  contentClassName,
}: DataTableProps<TData>) {
  const { t } = useTranslation();

  const sorting = table.getState().sorting;

  return (
    <div className={cn("relative", className)}>
      {isLoading && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-default/60">
          <Spinner size="md" />
        </div>
      )}
      <Table>
        <Table.ScrollContainer>
          <Table.Content
            aria-label={ariaLabel}
            className={contentClassName}
            sortDescriptor={toSortDescriptor(sorting)}
            onSortChange={(descriptor) =>
              table.setSorting(toSortingState(descriptor))
            }
          >
            <Table.Header>
              {table
                .getHeaderGroups()
                .flatMap((group) => group.headers)
                .map((header, index) => (
                  <Table.Column
                    key={header.id}
                    allowsSorting={header.column.getCanSort()}
                    id={header.id}
                    isRowHeader={index === 0}
                  >
                    {({ sortDirection }) =>
                      header.column.getCanSort() ? (
                        <Table.SortableColumnHeader
                          sortDirection={sortDirection}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </Table.SortableColumnHeader>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )
                    }
                  </Table.Column>
                ))}
            </Table.Header>
            <Table.Body
              renderEmptyState={() =>
                emptyState ?? (
                  <Typography className="py-10 text-center" color="muted">
                    {t("common.datatable.empty")}
                  </Typography>
                )
              }
            >
              {table.getRowModel().rows.map((row) => (
                <Table.Row key={row.id} id={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </div>
  );
}

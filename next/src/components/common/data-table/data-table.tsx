"use client";

import type { RowData } from "@tanstack/react-table";
import type { SortDescriptor } from "@heroui/react";
import type { ReactNode } from "react";
import type { SortingState } from "@tanstack/react-table";
import type { AppTable } from "./table-types";

import { Button, Skeleton, Spinner, Table, cn } from "@heroui/react";
import { flexRender } from "@tanstack/react-table";

import { DataTablePagination } from "./data-table-pagination";

import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { ErrorContent } from "@/components/common/error-content/error-content";
import { useTranslation } from "@/i18n";

/** 首屏加载骨架行数（ui-spec §14.2：表头 + 若干骨架行） */
const SKELETON_ROWS = 6;

/**
 * TanStack Table（逻辑层）→ HeroUI Table（渲染层）桥接。
 *
 * - 排序：TanStack SortingState ↔ React Aria SortDescriptor；
 *   服务端排序在 feature 侧配置 `manualSorting: true`（由 useListQuery 的
 *   sortField/sortOrder 映射为 sort/order 请求参数）。
 * - 行选择：不启用 HeroUI 原生 selectionMode（避免行点击被 react-aria
 *   选中行为占用）；feature 在列定义中使用 DataTableSelectAll /
 *   DataTableSelectRow 受控 Checkbox 桥接 TanStack rowSelection。
 * - 服务端分页：feature 配置 `manualPagination: true` + `pageCount`；
 *   传入 `total` 时在 Table.Footer 内渲染分页条，页面无需自行拼装。
 * - 错误态：`isError` 时强制清空行并渲染错误占位（重试走 `onRetry`），
 *   此时隐藏分页 Footer（旧 total 已不可信）。
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
  table: AppTable<TData>;
  /** 加载中（含 refetch）展示遮罩 */
  isLoading?: boolean;
  /** 服务端分页总数；传入时在 Table.Footer 渲染分页条 */
  total?: number;
  /** 数据加载失败：强制清空行并渲染错误占位 */
  isError?: boolean;
  /** 错误占位的重试回调（传入才显示重试按钮） */
  onRetry?: () => void;
  /** 空数据占位（默认统一文案） */
  emptyState?: ReactNode;
  /** 无障碍标签（透传 Table.Content；react-aria 对 Table 强制要求） */
  "aria-label"?: string;
  className?: string;
  /** Table.Content 的 className（如 min-w-* 控制横向滚动宽度） */
  contentClassName?: string;
}

export function DataTable<TData extends RowData>({
  table,
  isLoading = false,
  total,
  isError = false,
  onRetry,
  emptyState,
  "aria-label": ariaLabel,
  className,
  contentClassName,
}: DataTableProps<TData>) {
  const { t } = useTranslation();
  const sorting = table.state.sorting;
  const rows = table.getRowModel().rows;
  const columnCount = table.getVisibleLeafColumns().length;
  // 首屏加载（当前无任何数据）渲染骨架行；有数据时的 refetch 仍用遮罩保留旧数据
  const showSkeleton = isLoading && rows.length === 0 && !isError;

  return (
    <div className={cn("relative", className)}>
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
                    {({ sortDirection }) => {
                      const content = flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      );
                      const centered =
                        header.column.columnDef.meta?.align === "center";

                      if (!centered) {
                        return header.column.getCanSort() ? (
                          <Table.SortableColumnHeader
                            sortDirection={sortDirection}
                          >
                            {content}
                          </Table.SortableColumnHeader>
                        ) : (
                          content
                        );
                      }

                      return (
                        <div className="flex w-full justify-center">
                          {header.column.getCanSort() ? (
                            <Table.SortableColumnHeader
                              sortDirection={sortDirection}
                            >
                              {content}
                            </Table.SortableColumnHeader>
                          ) : (
                            content
                          )}
                        </div>
                      );
                    }}
                  </Table.Column>
                ))}
            </Table.Header>
            <Table.Body
              renderEmptyState={() =>
                isError ? (
                  <ErrorContent
                    action={
                      onRetry ? (
                        <Button size="sm" onPress={onRetry}>
                          {t("common.retry")}
                        </Button>
                      ) : undefined
                    }
                    title={t("common.loadError")}
                  />
                ) : (
                  (emptyState ?? <EmptyContent />)
                )
              }
            >
              {/* 错误态强制清空行（refetch 失败时 TanStack 仍持有旧数据），
                  以触发 renderEmptyState 展示错误占位 */}
              {isError
                ? []
                : showSkeleton
                  ? Array.from({ length: SKELETON_ROWS }, (_, rowIndex) => (
                      <Table.Row
                        key={`skeleton-${rowIndex}`}
                        id={`skeleton-${rowIndex}`}
                      >
                        {Array.from({ length: columnCount }, (_, colIndex) => (
                          <Table.Cell key={colIndex}>
                            <Skeleton
                              className="h-4 rounded-3xl"
                              style={{ width: colIndex === 0 ? "55%" : "78%" }}
                            />
                          </Table.Cell>
                        ))}
                      </Table.Row>
                    ))
                  : rows.map((row) => (
                      <Table.Row key={row.id} id={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <Table.Cell key={cell.id}>
                            {cell.column.columnDef.meta?.align === "center" ? (
                              <div className="flex w-full justify-center">
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )}
                              </div>
                            ) : (
                              flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )
                            )}
                          </Table.Cell>
                        ))}
                      </Table.Row>
                    ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        {total !== undefined && !isError && (
          <Table.Footer>
            <DataTablePagination table={table} total={total} />
          </Table.Footer>
        )}
      </Table>
      {isLoading && !showSkeleton && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-default/20 backdrop-blur-[1px]">
          <Spinner size="md" />
        </div>
      )}
    </div>
  );
}

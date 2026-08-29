import type { RowData } from "@tanstack/react-table";
import type { AppTable } from "./table-types";

import { ListBox, Pagination, Select } from "@heroui/react";

import { useTranslation } from "@/i18n";

/** 后端契约允许的 pageSize 档位（各列表接口 QueryDTO 一致） */
export const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

/**
 * 生成带省略号的页码序列（用于 Pagination 链接渲染）。
 * 规则：总页数 ≤ 7 全量展示；否则固定 1 与末页，窗口为当前页 ±1，空隙以省略号填充。
 */
export function getPageItems(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 0) return [1];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) items.push("ellipsis");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("ellipsis");
  items.push(total);

  return items;
}

export interface DataTablePaginationProps<TData extends RowData> {
  /** useReactTable 实例（manualPagination: true） */
  table: AppTable<TData>;
  /** 服务端总数 */
  total: number;
  className?: string;
}

/**
 * 表格底部分页条（三列布局，所有服务端分页列表共用）：
 * 左侧范围总数（第 X - Y 条，共 Z 条）、中间页码（带省略号）、右侧 pageSize 档位。
 * 服务端分页语义：page 从 1 开始（请求参数），TanStack pageIndex 从 0 开始。
 */
export function DataTablePagination<TData extends RowData>({
  table,
  total,
  className,
}: DataTablePaginationProps<TData>) {
  const { t } = useTranslation();

  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = pageIndex + 1;
  // 范围总数：空数据时按 0 展示，末页不满按实际条数截断
  const rangeStart = total === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, total);

  return (
    <div
      className={
        className ??
        "mt-3 grid grid-cols-1 items-center gap-3 px-1 sm:grid-cols-[1fr_auto_1fr]"
      }
    >
      <div className="flex items-center">
        <Pagination size="sm">
          <Pagination.Summary>
            {t("common.datatable.rangeTotal", {
              end: rangeEnd,
              start: rangeStart,
              total,
            })}
          </Pagination.Summary>
        </Pagination>
      </div>

      <div className="flex items-center justify-start sm:justify-center">
        <Pagination size="sm">
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.Previous
                isDisabled={!table.getCanPreviousPage()}
                onPress={() => table.previousPage()}
              >
                <Pagination.PreviousIcon />
              </Pagination.Previous>
            </Pagination.Item>
            {getPageItems(currentPage, pageCount).map((item, index) =>
              item === "ellipsis" ? (
                <Pagination.Item key={`ellipsis-${index}`}>
                  <Pagination.Ellipsis />
                </Pagination.Item>
              ) : (
                <Pagination.Item key={item}>
                  <Pagination.Link
                    isActive={item === currentPage}
                    onPress={() => table.setPageIndex(item - 1)}
                  >
                    {item}
                  </Pagination.Link>
                </Pagination.Item>
              ),
            )}
            <Pagination.Item>
              <Pagination.Next
                isDisabled={!table.getCanNextPage()}
                onPress={() => table.nextPage()}
              >
                <Pagination.NextIcon />
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      </div>

      <div className="flex items-center justify-start sm:justify-end">
        <Select
          aria-label={t("common.datatable.pageSizeLabel")}
          value={String(pageSize)}
          variant="secondary"
          onChange={(value) => {
            if (value === null) return;
            table.setPageSize(Number(value));
          }}
        >
          <Select.Trigger>
            <Select.Value>
              {t("common.datatable.pageSizeItem", { count: pageSize })}
            </Select.Value>
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <ListBox.Item
                  key={size}
                  id={String(size)}
                  textValue={String(size)}
                >
                  {t("common.datatable.pageSizeItem", { count: size })}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
    </div>
  );
}

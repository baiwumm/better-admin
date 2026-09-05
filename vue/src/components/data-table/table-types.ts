import type { ColumnDef, RowData } from "@tanstack/vue-table";
import type { VueTable } from "@tanstack/vue-table";

import {
  columnOrderingFeature,
  columnVisibilityFeature,
  createExpandedRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
} from "@tanstack/vue-table";

/**
 * 项目统一的 TanStack Table v9 feature 集（与 React 端 table-types.ts 同构；
 * 模块级静态注册，tree-shaking 友好）：列可见性/列排序/行展开（树形表格）
 * + 行排序 + 分页 + 行选择。新增 feature 时在此集中追加。
 */
export const appTableFeatures = tableFeatures({
  columnOrderingFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  expandedRowModel: createExpandedRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
});

export type AppTableFeatures = typeof appTableFeatures;

/** 列表页表格实例类型（v9 原生 API）。不传 state selector → table.state 为完整状态。 */
export type AppTable<TData extends RowData> = VueTable<AppTableFeatures, TData>;

/** 列定义类型（业务页 columns 声明用） */
export type AppColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  AppTableFeatures,
  TData,
  TValue
>;

/** 行类型（cell/header 渲染 props 与行选择桥接用） */
export type AppRow<TData extends RowData> = import("@tanstack/vue-table").Row<
  AppTableFeatures,
  TData
>;

/**
 * 通用渲染组件（DataTable / Pagination / BulkActions）专用的宽松表格类型。
 *
 * 为什么不用 AppTable<TData>：v9 的 Table 对 TData 标注 `in out`（不变），
 * vue-tsc 对泛型 SFC 的模板推断无法从 `AppTable<User>` 得出 `TData = User`，
 * 会回退到约束类型导致 TS2322。此处用非同构 mapped type 打破 variance 标注，
 * 让 TData 变为双变（通用组件只渲染、不产生 TData 差异，双变是安全的）。
 */
export type AppTableLike<TData extends RowData = RowData> = {
  [K in keyof AppTable<TData>]: AppTable<TData>[K] | AppTable<TData>[K];
};

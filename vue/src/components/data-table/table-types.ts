import type { ColumnDef, RowData } from "@tanstack/vue-table";
import type { Table } from "@tanstack/vue-table";

/**
 * 项目统一的 TanStack Table v8 配置（与 Nuxt UI UTable 兼容）。
 *
 * v8 与 v9 的关键差异：
 * - v8 用 `getCoreRowModel()` / `getSortedRowModel()` 等函数创建模型
 * - v9 用 `tableFeatures()` + feature 对象声明式配置
 * - v8 的 Table/ColumnDef/Row 类型不带 features 泛型参数
 *
 * 本文件定义项目统一的类型别名，业务页 columns / table 声明用。
 */

/** 列定义类型（业务页 columns 声明用） */
export type AppColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  TData,
  TValue
>;

/** 行类型（cell/header 渲染 props 与行选择桥接用） */
export type AppRow<TData extends RowData> =
  import("@tanstack/vue-table").Row<TData>;

/** 表格实例类型（v8 原生 API） */
export type AppTable<TData extends RowData> = Table<TData>;

/**
 * 通用渲染组件（DataTable / Pagination / BulkActions）专用的宽松表格类型。
 * 避免 vue-tsc 泛型 SFC 模板推断失败。
 */
export type AppTableLike<TData extends RowData = RowData> = {
  [K in keyof AppTable<TData>]: AppTable<TData>[K] | AppTable<TData>[K];
};

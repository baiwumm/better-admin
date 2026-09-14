"use client";

import type {
  ColumnDef,
  ReactTable,
  Row,
  RowData,
} from "@tanstack/react-table";

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
} from "@tanstack/react-table";

/**
 * 项目统一的 TanStack Table v9 feature 集（模块级静态注册，tree-shaking 友好）：
 * 列可见性/列排序/行展开（树形表格）+ 行排序 + 分页 + 行选择。
 * 新增 feature（如列筛选、展开行）时在此集中追加，所有业务页面同步获得类型与 API。
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
  // 列级 meta 类型声明（对齐 v9 类型槽机制）：align 控制表头/单元格居中
  columnMeta: {} as { align?: "center" },
});

export type AppTableFeatures = typeof appTableFeatures;

/**
 * 列表页表格实例类型（v9 原生 API）。
 * 业务页以 `useTable({ features: appTableFeatures, columns, data, ... })` 创建实例，
 * 不传 state selector → `table.state` 为完整状态（语义对齐 v8 的 getState()）。
 */
export type AppTable<TData extends RowData> = ReactTable<
  AppTableFeatures,
  TData
>;

/** 列定义类型（业务页 columns 声明用） */
export type AppColumnDef<TData extends RowData, TValue = unknown> = ColumnDef<
  AppTableFeatures,
  TData,
  TValue
>;

/** 行类型（cell/header 渲染 props 与行选择桥接用） */
export type AppRow<TData extends RowData> = Row<AppTableFeatures, TData>;

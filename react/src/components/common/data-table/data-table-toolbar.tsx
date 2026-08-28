type TanStackTable<TData extends RowData> = TanStackTableBase<TData>;

import type { ReactNode } from "react";
import type { RowData } from "@tanstack/react-table";
import type { LegacyReactTable as TanStackTableBase } from "@tanstack/react-table/legacy";

import { SearchField, cn } from "@heroui/react";
import { useEffect, useRef, useState } from "react";

import { DataTableViewOptions } from "./data-table-view-options";

import { useTranslation } from "@/i18n";

export interface DataTableToolbarProps<TData extends RowData> {
  /** 列设置（传入 table 即渲染右侧「列设置」下拉；storageKey 用于持久化） */
  table?: TanStackTable<TData>;
  /** 列设置持久化 key（column-setting:{userId}:{routePath}），不传则不持久化 */
  columnSettingKey?: string;
  /** 搜索关键字（受控，绑定列表 store 的 search） */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** 左侧搜索框之后的筛选区（DataTableFilterSelect 等任意节点） */
  children?: ReactNode;
  /** 右侧动作区（列设置之后的追加插槽，如「新增」按钮） */
  endSlot?: ReactNode;
  className?: string;
}

/** 搜索防抖提交延迟（ms）：停止输入后自动提交一次 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * 表格工具栏：左侧搜索框 + 筛选插槽，右侧列设置 + 动作插槽。
 * 搜索经 300ms 防抖提交（清空立即提交）；容器 reset 传入新值时同步回输入框。
 */
export function DataTableToolbar<TData extends RowData>({
  table,
  columnSettingKey,
  searchValue = "",
  onSearchChange,
  searchPlaceholder,
  children,
  endSlot,
  className,
}: DataTableToolbarProps<TData>) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(searchValue);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 外部重置（如 store.reset()）时同步输入框
  useEffect(() => {
    setInputValue(searchValue);
  }, [searchValue]);

  const commit = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    onSearchChange?.(value);
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    // 清空立即提交，输入停顿后防抖提交
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value === "") {
      onSearchChange?.("");

      return;
    }
    debounceRef.current = setTimeout(() => commit(value), SEARCH_DEBOUNCE_MS);
  };

  // 卸载时清理未提交的防抖
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const showSearch = Boolean(onSearchChange);

  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {showSearch && (
          <SearchField
            aria-label={searchPlaceholder ?? t("common.datatable.searchLabel")}
            className="w-64"
            value={inputValue}
            onChange={handleInputChange}
            onSubmit={commit}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder={
                  searchPlaceholder ?? t("common.datatable.searchPlaceholder")
                }
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        )}
        {children}
      </div>
      <div className="flex items-center gap-2">
        {endSlot}
        {table && (
          <DataTableViewOptions storageKey={columnSettingKey} table={table} />
        )}
      </div>
    </div>
  );
}

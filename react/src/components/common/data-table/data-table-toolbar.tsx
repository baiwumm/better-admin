import type { RowData } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { AppTable } from "./table-types";

import { Search, RotateCcw } from "lucide-react";
import { Button, SearchField, Surface, cn } from "@heroui/react";
import { useEffect, useRef, useState } from "react";

import { DataTableViewOptions } from "./data-table-view-options";

import { useTranslation } from "@/i18n";

export interface DataTableToolbarProps<TData extends RowData> {
  /** 列设置（传入 table 即渲染右侧「列设置」下拉；storageKey 用于持久化） */
  table?: AppTable<TData>;
  /** 列设置持久化 key（column-setting:{userId}:{routePath}），不传则不持久化 */
  columnSettingKey?: string;
  /** 搜索关键字（受控，绑定列表 store 的 search） */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** 左侧搜索框之后的筛选区（DataTableFilterSelect 等任意节点） */
  children?: ReactNode;
  /**
   * 「重置」按钮的外部回调（可选）：点击重置时除清空搜索外，
   * 额外重置列表 store 的筛选/排序等（服务端分页页使用）。
   */
  onReset?: () => void;
  /** 右侧动作区（列设置之后的追加插槽，如「新增」按钮） */
  endSlot?: ReactNode;
  className?: string;
}

/** 搜索防抖提交延迟（ms）：停止输入后自动提交一次 */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * 表格工具栏（各列表页统一形态）：
 * 左侧 = 搜索框 + 「搜索」「重置」按钮 + 筛选插槽；
 * 右侧 = 动作插槽（endSlot）+ 列设置。
 * 搜索经 300ms 防抖自动提交（清空立即提交），「搜索」按钮立即按当前输入提交，
 * 「重置」清空搜索并调用 onReset；容器 reset 传入新值时同步回输入框。
 */
export function DataTableToolbar<TData extends RowData>({
  table,
  columnSettingKey,
  searchValue = "",
  onSearchChange,
  searchPlaceholder,
  children,
  onReset,
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

  /** 「搜索」按钮：立即按当前输入提交（不等防抖） */
  const handleSearchPress = () => commit(inputValue);

  /** 「重置」按钮：清空搜索（含未提交的防抖），并触发外部重置回调 */
  const handleReset = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = null;
    setInputValue("");
    onSearchChange?.("");
    onReset?.();
  };

  return (
    <Surface
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl",
        className,
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {showSearch && (
          <SearchField
            aria-label={searchPlaceholder ?? t("common.datatable.searchLabel")}
            className="w-64"
            value={inputValue}
            variant="secondary"
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
        {showSearch && (
          <>
            <Button size="sm" onPress={handleSearchPress}>
              <Search />
              {t("common.datatable.search")}
            </Button>
            <Button size="sm" variant="tertiary" onPress={handleReset}>
              <RotateCcw />
              {t("common.datatable.reset")}
            </Button>
          </>
        )}
        {children}
      </div>
      <div className="flex items-center gap-2">
        {endSlot}
        {table && (
          <DataTableViewOptions storageKey={columnSettingKey} table={table} />
        )}
      </div>
    </Surface>
  );
}

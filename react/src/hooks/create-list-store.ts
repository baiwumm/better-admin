import type { SortingState } from "@tanstack/react-table";

import { create } from "zustand";

/**
 * 列表页状态统一工厂：分页 / 搜索 / 排序 / 筛选 收敛到一个 zustand store，
 * 避免每个 feature 手写重复代码。
 *
 * 设计约束（keepAlive）：实例池按 fullPath 分池，列表状态若写入 URL search params，
 * 每次筛选变化都会产生新 fullPath 导致保活实例被淘汰。因此列表状态放 feature 内
 * store（内存态，随保活实例保留），由 queryKey 驱动 React Query 重新请求。
 */

/** 列表 store 状态与 actions 的形状 */
export interface ListState<Filters extends Record<string, unknown>> {
  page: number;
  pageSize: number;
  /** 搜索关键字（由工具栏输入，提交后写入；默认空串不参与请求） */
  search: string;
  /** 服务端排序（TanStack SortingState 单列排序语义） */
  sorting: SortingState;
  /** 业务筛选字段（由各 feature 定义形状与默认值） */
  filters: Filters;
  setPage: (page: number) => void;
  /** 切换 pageSize 时回到第 1 页（避免越界空页） */
  setPageSize: (pageSize: number) => void;
  /** 提交搜索关键字时回到第 1 页 */
  setSearch: (search: string) => void;
  setSorting: (sorting: SortingState) => void;
  /** 局部合并 filters，变更后回到第 1 页 */
  setFilters: (patch: Partial<Filters>) => void;
  /** 全量重置到初始态（工具栏「重置」按钮） */
  reset: () => void;
}

export type ListStore<Filters extends Record<string, unknown>> = ReturnType<
  typeof createListStore<Filters>
>;

/**
 * 创建一个列表状态 store。
 *
 * @example
 * const useUsersListStore = createListStore({ status: null, roleId: null });
 * const { page, pageSize, search, filters, sorting, setPage, setFilters } =
 *   useUsersListStore();
 */
export function createListStore<Filters extends Record<string, unknown>>(
  defaultFilters: Filters,
) {
  return create<ListState<Filters>>()((set) => ({
    page: 1,
    pageSize: 10,
    search: "",
    sorting: [],
    filters: { ...defaultFilters },

    setPage: (page) => set({ page }),
    setPageSize: (pageSize) => set({ pageSize, page: 1 }),
    setSearch: (search) => set({ search, page: 1 }),
    setSorting: (sorting) => set({ sorting }),
    setFilters: (patch) =>
      set((state) => ({ filters: { ...state.filters, ...patch }, page: 1 })),
    reset: () =>
      set({
        page: 1,
        pageSize: 10,
        search: "",
        sorting: [],
        filters: { ...defaultFilters },
      }),
  }));
}

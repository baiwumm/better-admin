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
  /**
   * 条件代际号：搜索提交 / 筛选变更 / 重置时 +1，翻页 / pageSize / 排序不变。
   * 纳入 queryKey 后，条件重构必然产生全新 key（无缓存可回放），
   * 由 keepPreviousData 保住旧条件结果直到新数据返回（消除 stale 缓存闪回）；
   * 数据导航（翻页/排序）仍可命中目标 key 缓存加速。
   * 旧代际缓存条目无 observer、无性能影响，由 gcTime 自动回收，无需清理。
   */
  epoch: number;
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
    epoch: 0,
    search: "",
    sorting: [],
    filters: { ...defaultFilters },

    setPage: (page) => set({ page }),
    setPageSize: (pageSize) => set({ pageSize, page: 1 }),
    setSearch: (search) =>
      set((state) =>
        state.search === search
          ? state
          : { search, page: 1, epoch: state.epoch + 1 },
      ),
    setSorting: (sorting) => set({ sorting }),
    setFilters: (patch) =>
      set((state) => {
        // 同值幂等（与 setSearch / reset 一致，mechanisms §4.2）：patch 与现有
        // filters 逐键比较全部同值时不 bump epoch、不重置页码、不触发重新请求。
        // 典型场景：URL query 同步 effect 与「重置」先后写回同一 deptId，
        // 无幂等会产生一次重置双 epoch bump、发两次请求。
        const changed = (Object.keys(patch) as (keyof Filters)[]).some(
          (key) => !Object.is(state.filters[key], patch[key]),
        );

        if (!changed) {
          return state;
        }

        return {
          filters: { ...state.filters, ...patch },
          page: 1,
          epoch: state.epoch + 1,
        };
      }),
    reset: () =>
      set((state) => {
        const nextFilters = { ...defaultFilters };

        // 已处于初始态时同值幂等：不 bump epoch、不触发重新请求
        if (
          state.page === 1 &&
          state.pageSize === 10 &&
          state.search === "" &&
          state.sorting.length === 0 &&
          JSON.stringify(state.filters) === JSON.stringify(nextFilters)
        ) {
          return state;
        }

        return {
          page: 1,
          pageSize: 10,
          search: "",
          sorting: [],
          filters: nextFilters,
          epoch: state.epoch + 1,
        };
      }),
  }));
}

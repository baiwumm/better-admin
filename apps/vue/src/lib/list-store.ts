/**
 * 列表页状态统一工厂（模块级 reactive 单例，语义对齐 React 端 zustand 版）：
 * 分页 / 搜索 / 排序 / 筛选收敛到一个 store，避免每个 feature 手写重复代码。
 *
 * 模块级单例的意义：SPA 内导航离开再返回时组件重新挂载，但列表状态保留
 * （与 React 端 keepAlive 分池复用同一份状态的产品预期一致）。
 *
 * 设计约束（硬约定，mechanisms §4）：搜索提交 / 筛选变更 / 重置 = 条件重构，
 * epoch +1 且回到第 1 页；翻页 / pageSize / 排序 = 数据导航，不变 epoch。
 */

import { reactive } from "vue";

export interface SortingStateItem {
  id: string;
  desc: boolean;
}

export interface ListState<Filters extends Record<string, unknown>> {
  page: number;
  pageSize: number;
  /** 条件代际号：搜索 / 筛选 / 重置时 +1（纳入 queryKey 隔离缓存，见 use-list-query） */
  epoch: number;
  search: string;
  sorting: SortingStateItem[];
  filters: Filters;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setSorting: (sorting: SortingStateItem[]) => void;
  setFilters: (patch: Partial<Filters>) => void;
  reset: () => void;
}

export function createListStore<Filters extends Record<string, unknown>>(
  defaultFilters: Filters,
) {
  const state = reactive({
    page: 1,
    pageSize: 10,
    epoch: 0,
    search: "",
    sorting: [] as SortingStateItem[],
    filters: { ...defaultFilters },
  }) as unknown as ListState<Filters>;

  state.setPage = (page: number) => {
    state.page = page;
  };

  state.setPageSize = (pageSize: number) => {
    state.pageSize = pageSize;
    state.page = 1;
  };

  state.setSearch = (search: string) => {
    // 同值幂等（mechanisms §4.2）：重复提交相同搜索词不 bump epoch、不发请求
    if (state.search === search) return;

    state.search = search;
    state.page = 1;
    state.epoch++;
  };

  state.setSorting = (sorting: SortingStateItem[]) => {
    state.sorting = sorting;
  };

  state.setFilters = (patch: Partial<Filters>) => {
    // 同值幂等（与 setSearch / reset 一致）：patch 逐键比较全部同值时不 bump
    // epoch、不重置页码。典型场景：URL query 同步 watcher 与「重置」先后
    // 写回同一 deptId，无幂等会产生一次重置双 epoch bump、发两次请求。
    const changed = (Object.keys(patch) as (keyof Filters)[]).some(
      (key) => !Object.is(state.filters[key], patch[key]),
    );

    if (!changed) return;

    state.filters = { ...state.filters, ...patch };
    state.page = 1;
    state.epoch++;
  };

  state.reset = () => {
    const nextFilters = { ...defaultFilters };

    // 已处于初始态时同值幂等：不 bump epoch、不触发重新请求
    if (
      state.page === 1 &&
      state.pageSize === 10 &&
      state.search === "" &&
      state.sorting.length === 0 &&
      JSON.stringify(state.filters) === JSON.stringify(nextFilters)
    ) {
      return;
    }

    state.page = 1;
    state.pageSize = 10;
    state.search = "";
    state.sorting = [];
    state.filters = nextFilters;
    state.epoch++;
  };

  return state;
}

/** 列表 store 类型（模块级单例对象） */
export type ListStore<Filters extends Record<string, unknown>> =
  ListState<Filters>;

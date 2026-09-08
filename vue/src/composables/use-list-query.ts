import type { ListQueryParams } from "@/lib/api-types";
import type { ListStore } from "@/lib/list-store";

import { keepPreviousData, useQuery } from "@tanstack/vue-query";

import { fetchApiList } from "@/lib/api-client";

/**
 * 列表页通用装配（与 React 端 use-list-query.ts 同构平移）：
 * 从列表 store 读取分页/搜索/排序/筛选，组装请求参数与 queryKey
 * （key 包含所有影响列表结果的字段），经 vue-query 发起服务端分页请求。
 *
 * epoch 硬约定：必须放在 prefix 之后、其余字段之前——搜索提交 / 筛选变更 /
 * 重置使 epoch +1，条件重构必然产生全新 key，无缓存可回放，由
 * keepPreviousData 保住旧条件结果直到新数据返回（消除 stale 缓存闪回）；
 * 翻页 / 排序 / pageSize 不变 epoch，目标 key 仍可命中缓存加速。
 */

/** 构建列表页 queryKey（供 useListQuery 与单测共用）。 */
export function buildListQueryKey<
  TFilters extends Record<string, unknown>,
>(options: {
  queryKeyPrefix: readonly unknown[];
  epoch: number;
  page: number;
  pageSize: number;
  search: string;
  sortField: string;
  sortOrder: string;
  filters: TFilters;
  extraParams?: ListQueryParams | null;
}): readonly unknown[] {
  return [
    ...options.queryKeyPrefix,
    "list",
    options.epoch,
    options.page,
    options.pageSize,
    options.search,
    options.sortField,
    options.sortOrder,
    options.filters,
    options.extraParams ?? null,
  ];
}

/**
 * 搜索提交分支（供 useListQuery 的 submitSearch 包装，独立导出便于测试）：
 * 输入与已生效条件相同 → refetch 刷新当前列表（setSearch 同值幂等不会发包，
 * 见 list-store）；不同 → setSearch 正常提交（epoch+1、回第 1 页）。
 */
export function submitListSearch<Filters extends Record<string, unknown>>(
  store: ListStore<Filters>,
  refetch: () => void,
  input: string,
): void {
  if (store.search === input) {
    refetch();

    return;
  }
  store.setSearch(input);
}

export function useListQuery<
  TData,
  Filters extends Record<string, unknown>,
>(options: {
  /** 列表 store（createListStore 的返回值） */
  store: ListStore<Filters>;
  /** queryKey 前缀，如 ["users"] */
  queryKeyPrefix: readonly unknown[];
  /** 请求路径，如 "/users" */
  path: string;
  /** 搜索参数名：后端各接口命名不一（/users 为 search，/org/* 为 keyword） */
  searchParam?: string;
  /** 由 filters 派生的额外请求参数（如 status/roleId），与 filters 同步变化 */
  buildFilters?: (filters: Filters) => ListQueryParams;
  /** 额外固定参数（合并进请求；同时并入 queryKey） */
  extraParams?: ListQueryParams;
}) {
  const {
    store,
    queryKeyPrefix,
    path,
    searchParam = "search",
    buildFilters,
    extraParams,
  } = options;

  // 请求参数必须在 queryFn 执行时实时读取 store：组件 setup 只跑一次，
  // 若在 setup 构建快照，翻页 / 搜索 / 筛选变更后仍会用初始参数发请求
  // （queryKey 变化触发 refetch，但参数 stale，等于每次都取第一页旧条件）。
  // React 端每次渲染重建 params 由最新闭包兜底；Vue 端以函数调用等价实现。
  const buildParams = (): ListQueryParams => {
    // 后端排序为 sort + order 两参数（单列排序语义）
    const sortField = store.sorting[0]?.id ?? "";
    const sortOrder = store.sorting[0]
      ? store.sorting[0].desc
        ? "desc"
        : "asc"
      : "";

    const filterParams: ListQueryParams = buildFilters
      ? buildFilters(store.filters)
      : {};

    return {
      page: store.page,
      pageSize: store.pageSize,
      ...(store.search ? { [searchParam]: store.search } : {}),
      ...(sortField ? { sort: sortField, order: sortOrder } : {}),
      ...filterParams,
      ...extraParams,
    };
  };

  const query = useQuery({
    queryKey: computed(() =>
      buildListQueryKey({
        queryKeyPrefix,
        epoch: store.epoch,
        page: store.page,
        pageSize: store.pageSize,
        search: store.search,
        sortField: store.sorting[0]?.id ?? "",
        sortOrder: store.sorting[0]
          ? store.sorting[0].desc
            ? "desc"
            : "asc"
          : "",
        filters: store.filters,
        extraParams: extraParams ?? null,
      }),
    ),
    queryFn: () => fetchApiList<TData>(path, buildParams()),
    placeholderData: keepPreviousData,
  });

  // 搜索提交统一入口：与已生效条件不同 → setSearch（epoch+1、回第 1 页，正常提交）；
  // 相同 → setSearch 同值幂等不会发包（list-store 的防重复请求机制），
  // 此时 refetch 强制绕过缓存重新请求，承担「条件未变、单纯想刷新列表」的语义
  // （当前页码 / 筛选 / 排序全保留；请求期间 keepPreviousData 保住旧数据不闪空）。
  const submitSearch = (input: string) =>
    submitListSearch(store, () => query.refetch(), input);

  return {
    /** 当前页数据 */
    data: computed(() => query.data.value?.data ?? []),
    /** 服务端分页信息（请求未返回时按当前分页参数兜底，保证分页条可渲染） */
    pagination: computed(
      () =>
        query.data.value?.pagination ?? {
          page: store.page,
          pageSize: store.pageSize,
          total: 0,
        },
    ),
    /** 当前 key 从未有过数据（空表 + 全量加载态） */
    isLoading: computed(() => query.isLoading.value),
    /** 后台刷新中（当前数据 + 半透明遮罩；与 keepPreviousData 占位互斥） */
    isFetching: computed(() => query.isFetching.value),
    isError: computed(() => query.isError.value),
    error: computed(() => query.error.value),
    /** 手动重试（错误态 ErrorContent 的重试按钮） */
    refetch: () => query.refetch(),
    /** 搜索提交（同值 → refetch 刷新列表；异值 → setSearch 正常提交） */
    submitSearch,
  };
}

// computed 自动导入依赖（unplugin-auto-import 未覆盖纯 ts 文件），显式引入
import { computed } from "vue";

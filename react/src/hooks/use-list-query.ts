import type { ListQueryParams } from "@/lib/api-types";
import type { ListStore } from "@/hooks/create-list-store";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchApiList } from "@/lib/api-client";

/**
 * 列表页通用装配：从列表 store 读取分页/搜索/排序/筛选，
 * 组装请求参数与 queryKey（key 包含所有影响列表结果的字段），
 * 经 React Query 发起服务端分页请求。
 *
 * queryKey 说明（硬约定）：必须包含 store 中全部影响列表的字段，
 * 任一字段变化 → key 变化 → 自动重新请求；缓存按字段组合隔离。
 *
 * epoch 说明（硬约定）：必须放在 prefix 之后、其余字段之前。
 * 搜索提交 / 筛选变更 / 重置会使 epoch +1（见 create-list-store），
 * 条件重构因此必然产生全新 key——无缓存可回放，由 keepPreviousData
 * 保住旧条件结果直到新数据返回（消除 stale 缓存闪回）；翻页 / 排序 /
 * pageSize 不变 epoch，目标 key 仍可命中缓存加速。
 */
/**
 * 构建列表页 queryKey（供 useListQuery 与单测共用）。
 *
 * 硬约定：epoch 必须在 prefix 之后、其余字段之前——搜索提交 / 筛选变更 /
 * 重置使 epoch +1（见 create-list-store），条件重构因此必然产生全新 key，
 * 无缓存可回放，由 keepPreviousData 保住旧条件结果直到新数据返回（消除
 * stale 缓存闪回）；翻页 / 排序 / pageSize 不变 epoch，目标 key 仍可命中
 * 缓存加速。key 同时包含全部影响列表结果的字段，按字段组合隔离缓存
 * （filters/extraParams 为对象——React Query 稳定哈希）。
 */
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
  /** 由 filters 派生的额外请求参数（如 status/roleId），与 filters 同步变化 */
  buildFilters?: (filters: Filters) => ListQueryParams;
  /** 额外固定参数（合并进请求；同时并入 queryKey） */
  extraParams?: ListQueryParams;
}) {
  const { store, queryKeyPrefix, path, buildFilters, extraParams } = options;

  const page = store((s) => s.page);
  const pageSize = store((s) => s.pageSize);
  const epoch = store((s) => s.epoch);
  const search = store((s) => s.search);
  const sorting = store((s) => s.sorting);
  const filters = store((s) => s.filters);

  // 后端排序为 sort + order 两参数（单列排序语义）
  const sortField = sorting[0]?.id ?? "";
  const sortOrder = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : "";

  const filterParams: ListQueryParams = buildFilters
    ? buildFilters(filters)
    : {};

  const params: ListQueryParams = {
    page,
    pageSize,
    ...(search ? { search } : {}),
    ...(sortField ? { sort: sortField, order: sortOrder } : {}),
    ...filterParams,
    ...extraParams,
  };

  const query = useQuery({
    queryKey: buildListQueryKey({
      queryKeyPrefix,
      epoch,
      page,
      pageSize,
      search,
      sortField,
      sortOrder,
      filters,
      extraParams: extraParams ?? null,
    }),
    queryFn: () => fetchApiList<TData>(path, params),
    placeholderData: keepPreviousData,
  });

  return {
    /** 当前页数据 */
    data: query.data?.data ?? [],
    /** 服务端分页信息（请求未返回时按当前分页参数兜底，保证分页条可渲染） */
    pagination: query.data?.pagination ?? { page, pageSize, total: 0 },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
  };
}

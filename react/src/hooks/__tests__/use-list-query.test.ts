import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildListQueryKey } from "@/hooks/use-list-query";

/**
 * 列表 queryKey 契约与缓存隔离测试。
 *
 * epoch 语义见 use-list-query.ts 头注释：条件重构（搜索/筛选/重置）必然
 * 产生全新 key（无缓存可回放），数据导航（翻页/排序）命中缓存加速。
 */

const PREFIX = ["roles"] as const;

function buildKey(
  overrides?: Partial<Parameters<typeof buildListQueryKey>[0]>,
) {
  return buildListQueryKey({
    queryKeyPrefix: PREFIX,
    epoch: 0,
    page: 1,
    pageSize: 10,
    search: "",
    sortField: "",
    sortOrder: "",
    filters: { status: null },
    extraParams: null,
    ...overrides,
  });
}

describe("buildListQueryKey", () => {
  it("不同 epoch 的 queryKey 互不相同（条件重构后无缓存可回放）", () => {
    const epoch0 = buildKey({ epoch: 0 });
    const epoch1 = buildKey({ epoch: 1 });

    expect(epoch0).not.toEqual(epoch1);
    // epoch 位于 prefix 之后、其余字段之前
    expect(epoch0.slice(0, 3)).toEqual(["roles", "list", 0]);
  });

  it("同 epoch 内翻页 / 排序按字段组合区分 key", () => {
    const base = buildKey({ epoch: 1 });

    expect(buildKey({ epoch: 1, page: 2 })).not.toEqual(base);
    expect(
      buildKey({ epoch: 1, sortField: "createdAt", sortOrder: "desc" }),
    ).not.toEqual(base);
    // epoch 不同则无论翻页与否都隔离
    expect(buildKey({ epoch: 2, page: 2 })).not.toEqual(
      buildKey({ epoch: 1, page: 2 }),
    );
  });
});

describe("列表缓存策略（React Query 集成）", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("前缀失效兼容：invalidateQueries 按前缀命中所有 epoch 的 key", () => {
    queryClient.setQueryData(buildKey({ epoch: 0 }), "A");
    queryClient.setQueryData(buildKey({ epoch: 1 }), "B");

    queryClient.invalidateQueries({ queryKey: [...PREFIX] });

    const matched = queryClient
      .getQueryCache()
      .findAll({ queryKey: [...PREFIX] });

    expect(matched).toHaveLength(2);
  });

  it("慢请求返回后不覆盖新请求：per-key 隔离，各写各的缓存", async () => {
    // 场景：条件连续变更（搜索 B → 筛选 C），B 的响应晚于 C 才返回
    const keyB = buildKey({ epoch: 1, search: "B" });
    const keyC = buildKey({ epoch: 2, filters: { status: "C" } });

    let resolveB: (value: string) => void;
    const deferredB = new Promise<string>((resolve) => {
      resolveB = resolve;
    });

    // B 的请求先发出但迟迟不返回
    const fetchingB = queryClient.fetchQuery({
      queryKey: keyB,
      queryFn: () => deferredB,
    });

    // C 的请求后发出、先返回
    await queryClient.fetchQuery({
      queryKey: keyC,
      queryFn: () => Promise.resolve("C-data"),
    });

    expect(queryClient.getQueryData(keyC)).toBe("C-data");
    expect(queryClient.getQueryData(keyB)).toBeUndefined();

    // B 的慢响应最终返回：只写入 B 自己的缓存条目
    resolveB!("B-data");
    await fetchingB;

    expect(queryClient.getQueryData(keyB)).toBe("B-data");
    expect(queryClient.getQueryData(keyC)).toBe("C-data");
  });
});

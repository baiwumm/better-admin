import { describe, expect, it } from "vitest";

import { createListStore } from "@/lib/list-store";

/**
 * 列表 store epoch 契约测试（mechanisms §4 硬约定，与 React 端
 * create-list-store.test.ts 语义对齐）：
 * - 条件重构（搜索提交 / 筛选变更 / 重置）→ epoch +1 且回到第 1 页；
 * - 数据导航（翻页 / pageSize / 排序）→ epoch 不变；
 * - 同值幂等：重复提交相同条件不 bump epoch。
 */
describe("list-store epoch contract", () => {
  it("搜索提交使 epoch+1 并回到第 1 页；同值幂等", () => {
    const store = createListStore<{ status: string | null }>({ status: null });

    store.setPage(3);

    const epoch0 = store.epoch;
    store.setSearch("foo");

    expect(store.epoch).toBe(epoch0 + 1);
    expect(store.page).toBe(1);

    // 同值幂等：不 bump、不发请求
    store.setSearch("foo");

    expect(store.epoch).toBe(epoch0 + 1);
  });

  it("筛选变更使 epoch+1；无变化补丁幂等", () => {
    const store = createListStore<{ status: string | null }>({ status: null });

    const epoch0 = store.epoch;
    store.setFilters({ status: "active" });

    expect(store.epoch).toBe(epoch0 + 1);
    expect(store.filters.status).toBe("active");

    store.setFilters({ status: "active" });

    expect(store.epoch).toBe(epoch0 + 1);
  });

  it("翻页 / pageSize / 排序不变 epoch", () => {
    const store = createListStore<{ status: string | null }>({ status: null });

    const epoch0 = store.epoch;
    store.setPage(2);
    store.setPageSize(20);
    store.setSorting([{ id: "createdAt", desc: true }]);

    expect(store.epoch).toBe(epoch0);
    // 切换 pageSize 回到第 1 页（契约：避免越界空页，React 端同语义）
    expect(store.page).toBe(1);
    expect(store.pageSize).toBe(20);
    expect(store.sorting).toEqual([{ id: "createdAt", desc: true }]);
  });

  it("重置使 epoch+1；已处初始态时幂等", () => {
    const store = createListStore<{ status: string | null }>({ status: null });

    store.setSearch("foo");
    store.setFilters({ status: "active" });
    const epoch = store.epoch;

    store.reset();

    expect(store.epoch).toBe(epoch + 1);
    expect(store.search).toBe("");
    expect(store.filters.status).toBeNull();
    expect(store.page).toBe(1);

    const epochAfterReset = store.epoch;
    store.reset();

    expect(store.epoch).toBe(epochAfterReset);
  });
});

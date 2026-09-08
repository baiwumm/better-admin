import { describe, expect, it, vi } from "vitest";

import { createListStore } from "@/lib/list-store";
import { submitListSearch } from "@/composables/use-list-query";

/**
 * 搜索按钮「提交 / 刷新」分支契约测试（与 React 端 use-list-query.test.ts
 * 的 submitListSearch 用例语义对齐）：
 * - 异值 → setSearch 正常提交（epoch+1、回第 1 页、不 refetch）；
 * - 同值 → setSearch 同值幂等不发包，改走 refetch 刷新当前列表
 *   （不 bump epoch、保持页码与筛选）。
 */
describe("submitListSearch", () => {
  it("异值走 setSearch 正常提交：epoch+1、回第 1 页、不 refetch", () => {
    const store = createListStore<{ status: string | null }>({ status: null });

    store.setPage(4);
    const refetch = vi.fn();

    submitListSearch(store, refetch, "abc");

    expect(refetch).not.toHaveBeenCalled();
    expect(store.search).toBe("abc");
    expect(store.epoch).toBe(1);
    expect(store.page).toBe(1);
  });

  it("同值走 refetch 刷新：不 bump epoch、保持页码与筛选", () => {
    const store = createListStore<{ status: string | null }>({ status: null });

    store.setSearch("abc");
    store.setPage(3);
    const epochBefore = store.epoch;
    const refetch = vi.fn();

    submitListSearch(store, refetch, "abc");

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(store.epoch).toBe(epochBefore);
    expect(store.page).toBe(3);
  });
});

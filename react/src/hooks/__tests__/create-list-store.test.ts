import { describe, expect, it } from "vitest";

import { createListStore } from "@/hooks/create-list-store";

describe("createListStore", () => {
  it("初始状态为 page=1 / pageSize=10 / 空搜索 / 空排序 / 默认筛选", () => {
    const useStore = createListStore<{
      status: string | null;
      roleId: string | null;
    }>({
      status: null,
      roleId: null,
    });
    const state = useStore.getState();

    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(10);
    expect(state.search).toBe("");
    expect(state.sorting).toEqual([]);
    expect(state.filters).toEqual({ status: null, roleId: null });
  });

  it("setPage 直接生效", () => {
    const useStore = createListStore({});

    useStore.getState().setPage(3);

    expect(useStore.getState().page).toBe(3);
  });

  it("setPageSize 重置回第 1 页", () => {
    const useStore = createListStore({});

    useStore.getState().setPage(5);
    useStore.getState().setPageSize(20);

    expect(useStore.getState().pageSize).toBe(20);
    expect(useStore.getState().page).toBe(1);
  });

  it("setSearch / setFilters 均重置回第 1 页", () => {
    const useStore = createListStore<{ status: string | null }>({
      status: null,
    });

    useStore.getState().setPage(4);
    useStore.getState().setSearch("admin");

    expect(useStore.getState().page).toBe(1);
    expect(useStore.getState().search).toBe("admin");

    useStore.getState().setPage(4);
    useStore.getState().setFilters({ status: "active" });

    expect(useStore.getState().page).toBe(1);
    expect(useStore.getState().filters.status).toBe("active");
  });

  it("setFilters 局部合并不覆盖其它筛选字段", () => {
    const useStore = createListStore<{
      status: string | null;
      roleId: string | null;
    }>({
      status: null,
      roleId: "r1",
    });

    useStore.getState().setFilters({ status: "disabled" });
    const { filters } = useStore.getState();

    expect(filters).toEqual({ status: "disabled", roleId: "r1" });
  });

  it("setSorting 写入排序状态", () => {
    const useStore = createListStore({});

    useStore.getState().setSorting([{ desc: true, id: "createdAt" }]);

    expect(useStore.getState().sorting).toEqual([
      { desc: true, id: "createdAt" },
    ]);
  });

  it("reset 全量回到初始态（筛选字段深拷贝，后续修改不污染默认值）", () => {
    const useStore = createListStore<{
      status: string | null;
      roleId: string | null;
    }>({
      status: null,
      roleId: null,
    });

    useStore.getState().setFilters({ status: "active", roleId: "r2" });
    useStore.getState().setPage(9);
    useStore.getState().setSearch("x");
    useStore.getState().reset();
    const state = useStore.getState();

    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(10);
    expect(state.search).toBe("");
    expect(state.filters).toEqual({ status: null, roleId: null });

    // 再修改 filters 不应污染 reset 的默认值来源
    useStore.getState().setFilters({ status: "disabled" });
    expect(useStore.getState().filters).toEqual({
      status: "disabled",
      roleId: null,
    });
  });

  it("不同 store 实例状态互相隔离", () => {
    const useA = createListStore<{ status: string | null }>({ status: null });
    const useB = createListStore({ type: "all" });

    useA.getState().setPage(2);

    expect(useA.getState().page).toBe(2);
    expect(useB.getState().page).toBe(1);
  });
});

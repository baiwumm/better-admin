import { describe, expect, it } from "vitest";

import {
  commitNavigation,
  makePoolEntry,
  MAX_POOL_SIZE,
  reconcileWithTabs,
  registerDisplayed,
  type PoolEntry,
} from "../keepalive-pool";

const KEEP = new Set(["/keep/a", "/keep/b"]);
const OPEN_ALL = new Set(["/keep/a", "/keep/b", "/next"]);

function entry(path: string, permanent = false): PoolEntry {
  return { path, permanent };
}

describe("makePoolEntry", () => {
  it("keepAlive 命中的路径为 permanent", () => {
    expect(makePoolEntry("/keep/a", KEEP)).toEqual({
      path: "/keep/a",
      permanent: true,
    });
  });

  it("未命中的路径为 transient", () => {
    expect(makePoolEntry("/plain", KEEP)).toEqual({
      path: "/plain",
      permanent: false,
    });
  });
});

describe("registerDisplayed", () => {
  it("空池时登记呈现路径", () => {
    const result = registerDisplayed([], "/keep/a", "/keep/a", KEEP);

    expect(result).toEqual([entry("/keep/a", true)]);
  });

  it("已在池中时不重复追加", () => {
    const pool = [entry("/a"), entry("/b")];
    const result = registerDisplayed(pool, "/a", "/a", KEEP);

    expect(result.map((e) => e.path)).toEqual(["/a", "/b"]);
  });

  it("满池登记新路径时优先淘汰最早的 transient", () => {
    // 满池（无呈现路径）：登记 /new → 超限 → 淘汰最早的 /p/0
    const pool: PoolEntry[] = Array.from({ length: MAX_POOL_SIZE }, (_, i) =>
      entry(`/p/${i}`),
    );

    const result = registerDisplayed(pool, "/new", "/new", KEEP);

    expect(result.length).toBe(MAX_POOL_SIZE);
    expect(result.some((e) => e.path === "/p/0")).toBe(false);
    expect(result.at(-1)?.path).toBe("/new");
  });

  it("transient 不足时在 permanent 间做 LRU（受保护项除外）", () => {
    // 全部为 permanent 且已满，新 permanent 进入 → LRU 淘汰最早的 /keep/0
    const pool: PoolEntry[] = Array.from({ length: MAX_POOL_SIZE }, (_, i) =>
      entry(`/keep/${i}`, true),
    );
    const keepAll = new Set([...pool.map((e) => e.path), "/keep/new"]);

    const result = registerDisplayed(pool, "/keep/new", "/keep/new", keepAll);

    expect(result.length).toBe(MAX_POOL_SIZE);
    expect(result.some((e) => e.path === "/keep/new")).toBe(true);
    expect(result.some((e) => e.path === "/keep/0")).toBe(false);
  });

  it("无实质变更时返回原引用（供 setState 跳过更新）", () => {
    const pool = [entry("/a"), entry("/b")];

    expect(registerDisplayed(pool, "/a", "/a", KEEP)).toBe(pool);
  });
});

describe("commitNavigation", () => {
  it("清理 transient 与已关闭的 permanent，仅保留未关闭的 permanent 与目标页", () => {
    const pool = [
      entry("/keep/a", true),
      entry("/keep/b", true), // 已被关闭（不在 openedTabs）
      entry("/transient/1"),
      entry("/transient/2"),
      entry("/next"),
    ];
    const opened = new Set(["/keep/a", "/next"]);

    const result = commitNavigation(pool, "/next", KEEP, opened);

    expect(result.map((e) => e.path)).toEqual(["/keep/a", "/next"]);
  });

  it("目标页缺失时补入（permanent 判定正确）", () => {
    const result = commitNavigation(
      [entry("/keep/a", true)],
      "/keep/b",
      KEEP,
      OPEN_ALL,
    );

    expect(result).toEqual([entry("/keep/a", true), entry("/keep/b", true)]);
  });

  it("无变更时返回原引用", () => {
    const pool = [entry("/keep/a", true), entry("/next")];

    expect(commitNavigation(pool, "/next", KEEP, OPEN_ALL)).toBe(pool);
  });
});

describe("reconcileWithTabs", () => {
  it("清除已关闭且非呈现中的 permanent 条目", () => {
    const pool = [entry("/keep/a", true), entry("/keep/b", true)];
    const opened = new Set(["/keep/a"]);

    const result = reconcileWithTabs(pool, opened, "/keep/a", KEEP);

    expect(result.map((e) => e.path)).toEqual(["/keep/a"]);
  });

  it("已关闭但正在呈现的条目保留（等待导航提交处理）", () => {
    const pool = [entry("/keep/b", true)];

    const result = reconcileWithTabs(pool, new Set(), "/keep/b", KEEP);

    expect(result).toEqual(pool);
  });

  it("已打开的 keepAlive transient 转正为 permanent", () => {
    const pool = [entry("/keep/b")];
    const opened = new Set(["/keep/b"]);

    const result = reconcileWithTabs(pool, opened, "/other", KEEP);

    expect(result).toEqual([{ path: "/keep/b", permanent: true }]);
  });

  it("非 keepAlive 的 opened 条目不转正", () => {
    const pool = [entry("/plain")];
    const opened = new Set(["/plain"]);

    const result = reconcileWithTabs(pool, opened, "/other", KEEP);

    expect(result).toBe(pool);
  });

  it("无变更时返回原引用", () => {
    const pool = [entry("/keep/a", true)];

    expect(reconcileWithTabs(pool, OPEN_ALL, "/keep/a", KEEP)).toBe(pool);
  });
});

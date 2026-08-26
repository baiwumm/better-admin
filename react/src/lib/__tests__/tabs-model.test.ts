import { describe, expect, it } from "vitest";

import {
  closeAllTabPaths,
  closeLeftTabPaths,
  closeOtherTabPaths,
  closeRightTabPaths,
  closeTabPaths,
  ensureHomeTab,
  HOME_TAB_PATH,
  MAX_OPEN_TABS,
  parseStoredTabs,
  pruneTabPaths,
  withOpenedPath,
} from "../tabs-model";

describe("withOpenedPath", () => {
  it("新路径追加到末尾", () => {
    expect(withOpenedPath(["/a"], "/b", "/a")).toEqual(["/a", "/b"]);
  });

  it("已存在时去重（不改变顺序）", () => {
    expect(withOpenedPath(["/", "/a", "/b"], "/a", "/a")).toEqual([
      "/",
      "/a",
      "/b",
    ]);
  });

  it("超上限时淘汰最早的可关闭且非当前、非目标项", () => {
    const paths = Array.from({ length: MAX_OPEN_TABS }, (_, i) =>
      i === 0 ? HOME_TAB_PATH : `/p/${i}`,
    );

    const next = withOpenedPath(paths, "/new", "/p/1");

    expect(next.length).toBe(MAX_OPEN_TABS);
    expect(next.includes("/new")).toBe(true);
    // 最早的可关闭项 /p/1 是当前页，应被保护；淘汰的是 /p/2
    expect(next.includes("/p/1")).toBe(true);
    expect(next.includes("/p/2")).toBe(false);
    expect(next[0]).toBe(HOME_TAB_PATH);
  });

  it("无可淘汰项时不强制缩减", () => {
    // 仅固定标签 + 当前 + 目标：无候选可淘汰
    const next = withOpenedPath([HOME_TAB_PATH], "/new", HOME_TAB_PATH);

    expect(next).toEqual([HOME_TAB_PATH, "/new"]);
  });
});

describe("closeTabPaths", () => {
  it("关闭当前页：优先回退到原右侧第一位幸存者", () => {
    const result = closeTabPaths([HOME_TAB_PATH, "/a", "/b", "/c"], "/b", "/b");

    expect(result.paths).toEqual([HOME_TAB_PATH, "/a", "/c"]);
    expect(result.redirect).toBe("/c");
  });

  it("关闭当前页且无右侧幸存者：回退到左侧最后一位", () => {
    const result = closeTabPaths([HOME_TAB_PATH, "/a", "/b"], "/b", "/b");

    expect(result.paths).toEqual([HOME_TAB_PATH, "/a"]);
    expect(result.redirect).toBe("/a");
  });

  it("关闭当前页后仅剩固定标签：回退到固定首页", () => {
    const result = closeTabPaths([HOME_TAB_PATH, "/a"], "/a", "/a");

    expect(result.redirect).toBe(HOME_TAB_PATH);
  });

  it("关闭非当前页：不需要导航", () => {
    const result = closeTabPaths([HOME_TAB_PATH, "/a", "/b"], "/b", "/a");

    expect(result.paths).toEqual([HOME_TAB_PATH, "/a"]);
    expect(result.redirect).toBeNull();
  });

  it("固定标签不可关闭", () => {
    const result = closeTabPaths([HOME_TAB_PATH, "/a"], HOME_TAB_PATH, "/");

    expect(result.paths).toEqual([HOME_TAB_PATH, "/a"]);
    expect(result.redirect).toBeNull();
  });

  it("目标不存在时返回原数组引用", () => {
    const paths = [HOME_TAB_PATH, "/a"];

    expect(closeTabPaths(paths, "/missing", "/a").paths).toBe(paths);
  });
});

describe("closeOtherTabPaths", () => {
  it("仅保留固定标签与锚点", () => {
    const result = closeOtherTabPaths(
      [HOME_TAB_PATH, "/a", "/b", "/c"],
      "/b",
      "/a",
    );

    expect(result.paths).toEqual([HOME_TAB_PATH, "/b"]);
    // 当前页 /a 被关闭 → 回退锚点
    expect(result.redirect).toBe("/b");
  });

  it("锚点不存在时不做任何变更", () => {
    const paths = [HOME_TAB_PATH, "/a"];

    const result = closeOtherTabPaths(paths, "/missing", "/a");

    expect(result.paths).toBe(paths);
  });
});

describe("closeLeftTabPaths", () => {
  it("移除锚点左侧可关闭标签", () => {
    const result = closeLeftTabPaths(
      [HOME_TAB_PATH, "/a", "/b", "/c"],
      "/c",
      "/a",
    );

    expect(result.paths).toEqual([HOME_TAB_PATH, "/c"]);
    expect(result.redirect).toBe("/c");
  });

  it("左侧仅剩固定标签时不可用", () => {
    const paths = [HOME_TAB_PATH, "/a", "/b"];

    const result = closeLeftTabPaths(paths, "/a", "/a");

    expect(result.paths).toBe(paths);
    expect(result.redirect).toBeNull();
  });

  it("锚点是首位时不可用", () => {
    const paths = [HOME_TAB_PATH, "/a"];

    expect(closeLeftTabPaths(paths, HOME_TAB_PATH, "/a").paths).toBe(paths);
  });
});

describe("closeRightTabPaths", () => {
  it("移除锚点右侧可关闭标签", () => {
    const result = closeRightTabPaths(
      [HOME_TAB_PATH, "/a", "/b", "/c"],
      "/a",
      "/c",
    );

    expect(result.paths).toEqual([HOME_TAB_PATH, "/a"]);
    expect(result.redirect).toBe("/a");
  });

  it("锚点是最后一位时不可用", () => {
    const paths = [HOME_TAB_PATH, "/a", "/b"];

    const result = closeRightTabPaths(paths, "/b", "/b");

    expect(result.paths).toBe(paths);
    expect(result.redirect).toBeNull();
  });
});

describe("closeAllTabPaths", () => {
  it("仅保留固定标签；当前页被关则回退首页", () => {
    const result = closeAllTabPaths([HOME_TAB_PATH, "/a", "/b"], "/b");

    expect(result.paths).toEqual([HOME_TAB_PATH]);
    expect(result.redirect).toBe(HOME_TAB_PATH);
  });

  it("当前已在固定标签时不需要导航", () => {
    const result = closeAllTabPaths([HOME_TAB_PATH, "/a"], HOME_TAB_PATH);

    expect(result.paths).toEqual([HOME_TAB_PATH]);
    expect(result.redirect).toBeNull();
  });
});

describe("pruneTabPaths", () => {
  it("移除不在可达集合中的标签并保留固定标签", () => {
    const allowed = new Set([HOME_TAB_PATH, "/a"]);

    expect(pruneTabPaths([HOME_TAB_PATH, "/a", "/b"], allowed)).toEqual([
      HOME_TAB_PATH,
      "/a",
    ]);
  });

  it("无变更时返回原数组引用", () => {
    const paths = [HOME_TAB_PATH, "/a"];
    const allowed = new Set([HOME_TAB_PATH, "/a"]);

    expect(pruneTabPaths(paths, allowed)).toBe(paths);
  });
});

describe("ensureHomeTab", () => {
  it("缺失控制台时插入首位", () => {
    expect(ensureHomeTab(["/a", "/b"])).toEqual([HOME_TAB_PATH, "/a", "/b"]);
  });

  it("已存在时不重复添加（返回原引用）", () => {
    const paths = [HOME_TAB_PATH, "/a"];

    expect(ensureHomeTab(paths)).toBe(paths);
  });
});

describe("parseStoredTabs", () => {
  it("解析合法 JSON 并保证控制台在首位", () => {
    const result = parseStoredTabs('{"paths":["/a","/b"],"meta":{}}');

    expect(result.paths).toEqual([HOME_TAB_PATH, "/a", "/b"]);
  });

  it("解析元数据快照并剔除非法项", () => {
    const result = parseStoredTabs(
      '{"paths":["/a"],"meta":{"/a":{"title":"用户管理","icon":"users"},"/x":{"title":123},"/y":"oops"}}',
    );

    expect(result.meta).toEqual({ "/a": { title: "用户管理", icon: "users" } });
  });

  it("剔除非法路径与非法元数据键", () => {
    const result = parseStoredTabs('["/a","a/b","/a",42,{"meta":"bad"}]' + "");

    // 旧版纯数组结构不再支持 → 返回空
    expect(result.paths).toEqual([]);
    expect(result.meta).toEqual({});
  });

  it("meta 非对象时忽略", () => {
    const result = parseStoredTabs('{"paths":["/a"],"meta":"nope"}');

    expect(result.paths).toEqual([HOME_TAB_PATH, "/a"]);
    expect(result.meta).toEqual({});
  });

  it("非法 JSON 返回空", () => {
    expect(parseStoredTabs("{oops").paths).toEqual([]);
  });

  it("空输入返回空", () => {
    expect(parseStoredTabs(null).paths).toEqual([]);
  });
});

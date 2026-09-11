import { beforeEach, describe, expect, it } from "vitest";

import {
  buildColumnSettingKey,
  mergeColumnOrder,
  parseColumnSetting,
  readColumnSetting,
  restoreColumnOrder,
  writeColumnSetting,
} from "@/components/data-table/column-setting";

/**
 * 列设置持久化纯函数：key 规则 / 结构解析（含 v1 旧格式兼容）/ 顺序合并，
 * 口径与 React 端 data-table-view-options 一致（同一浏览器下两端可互读）。
 */

describe("buildColumnSettingKey", () => {
  it("按用户 + 路由路径拼接，不含查询参数", () => {
    expect(buildColumnSettingKey("u1", "/settings/users")).toBe(
      "column-setting:u1:/settings/users",
    );
  });
});

describe("parseColumnSetting", () => {
  it("空值 / 非法 JSON / 非法结构回退空设置", () => {
    expect(parseColumnSetting(null)).toEqual({ hidden: [], order: [] });
    expect(parseColumnSetting("")).toEqual({ hidden: [], order: [] });
    expect(parseColumnSetting("{not json")).toEqual({ hidden: [], order: [] });
    expect(parseColumnSetting('{"hidden":"a","order":[]}')).toEqual({
      hidden: [],
      order: [],
    });
    expect(parseColumnSetting("[1,2]")).toEqual({ hidden: [], order: [] });
  });

  it("v1 旧格式（字符串数组）视为隐藏列，顺序为空", () => {
    expect(parseColumnSetting('["a","b"]')).toEqual({
      hidden: ["a", "b"],
      order: [],
    });
  });

  it("v2 结构原样返回", () => {
    expect(
      parseColumnSetting('{"hidden":["a"],"order":["b","a","c"]}'),
    ).toEqual({ hidden: ["a"], order: ["b", "a", "c"] });
  });
});

describe("readColumnSetting / writeColumnSetting", () => {
  const key = buildColumnSettingKey("u1", "/settings/users");

  beforeEach(() => {
    localStorage.clear();
  });

  it("写入后可读回；全默认时清除存储", () => {
    writeColumnSetting(key, { hidden: ["a"], order: ["b", "a"] }, false);
    expect(readColumnSetting(key)).toEqual({
      hidden: ["a"],
      order: ["b", "a"],
    });

    writeColumnSetting(key, { hidden: [], order: ["a", "b"] }, true);
    expect(localStorage.getItem(key)).toBeNull();
    expect(readColumnSetting(key)).toEqual({ hidden: [], order: [] });
  });
});

describe("restoreColumnOrder", () => {
  it("过滤已删除列，新增列按默认顺序追加到末尾", () => {
    expect(restoreColumnOrder(["c", "x", "a"], ["a", "b", "c", "d"])).toEqual([
      "c",
      "a",
      "b",
      "d",
    ]);
  });

  it("持久化顺序为空时保持默认顺序", () => {
    expect(restoreColumnOrder([], ["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("mergeColumnOrder", () => {
  const isHideable = (id: string) => !["select", "actions"].includes(id);

  it("功能性列保持原位，可隐藏列按面板顺序占据默认槽位", () => {
    expect(
      mergeColumnOrder(
        ["select", "a", "b", "c", "actions"],
        ["c", "a", "b"],
        isHideable,
      ),
    ).toEqual(["select", "c", "a", "b", "actions"]);
  });

  it("无功能性列时即面板顺序本身", () => {
    expect(mergeColumnOrder(["a", "b"], ["b", "a"], () => true)).toEqual([
      "b",
      "a",
    ]);
  });
});

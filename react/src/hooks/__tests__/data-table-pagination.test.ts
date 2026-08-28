import { describe, expect, it } from "vitest";

import { getPageItems } from "@/components/common/data-table/data-table-pagination";

describe("getPageItems", () => {
  it("总页数 ≤ 7 时全量返回", () => {
    expect(getPageItems(1, 1)).toEqual([1]);
    expect(getPageItems(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("当前页靠前时右侧出现省略号", () => {
    expect(getPageItems(2, 10)).toEqual([1, 2, 3, "ellipsis", 10]);
  });

  it("当前页靠后时左侧出现省略号", () => {
    expect(getPageItems(9, 10)).toEqual([1, "ellipsis", 8, 9, 10]);
  });

  it("当前页居中时两侧均为省略号", () => {
    expect(getPageItems(5, 10)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
  });

  it("总页数为 0 时兜底返回 [1]", () => {
    expect(getPageItems(1, 0)).toEqual([1]);
  });
});

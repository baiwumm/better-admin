import { describe, expect, it } from "vitest";

import {
  areaPath,
  axisScale,
  donutSlicePath,
  relativePoints,
  smoothPath,
  zeroBasedPoints,
} from "../chart-geometry";

/**
 * Dashboard 图表几何纯函数测试（手写 SVG 图表的正确性完全押在这几个函数上：
 * 坐标归一、面积闭合、环形扇区角度），与 React 端 recharts 的等价性靠这些断言守住。
 */

const BOX = { x: 0, y: 0, width: 100, height: 40 };

describe("axisScale", () => {
  it("步长向上取整，保证每一档刻度都是整数", () => {
    expect(axisScale(23)).toEqual({ step: 6, top: 24 });
    expect(axisScale(7)).toEqual({ step: 2, top: 8 });
  });

  it("空量程也至少给出 4 的顶值，避免除零与零高度网格", () => {
    expect(axisScale(0)).toEqual({ step: 1, top: 4 });
    expect(axisScale(1)).toEqual({ step: 1, top: 4 });
  });
});

describe("relativePoints", () => {
  it("按序列自身 min/max 归一：最小值贴底、最大值贴顶、横等分", () => {
    const points = relativePoints([2, 6, 10], BOX);

    expect(points).toEqual([
      { x: 0, y: 40 },
      { x: 50, y: 20 },
      { x: 100, y: 0 },
    ]);
  });

  it("全平序列（max=min）不除零，落在绘图区底边", () => {
    expect(relativePoints([5, 5], BOX)).toEqual([
      { x: 0, y: 40 },
      { x: 100, y: 40 },
    ]);
  });
});

describe("zeroBasedPoints", () => {
  it("0 基线按轴量程归一（面积图自底部生长）", () => {
    expect(zeroBasedPoints([6, 24], BOX, 24)).toEqual([
      { x: 0, y: 30 },
      { x: 100, y: 0 },
    ]);
  });
});

describe("smoothPath / areaPath", () => {
  it("少于两点不成线（单点卡不画趋势带）", () => {
    expect(smoothPath([{ x: 0, y: 0 }])).toBe("");
    expect(areaPath("", [{ x: 0, y: 0 }], 40)).toBe("");
  });

  it("首段为 M、其余为三次贝塞尔，面积闭合回基线两端", () => {
    const points = relativePoints([2, 6, 10], BOX);
    const line = smoothPath(points);

    expect(line.startsWith("M0.00,40.00 C")).toBe(true);
    expect(line.match(/C/g)).toHaveLength(2);
    expect(
      areaPath(line, points, 40).endsWith("L100.00,40.00 L0.00,40.00 Z"),
    ).toBe(true);
  });
});

describe("donutSlicePath", () => {
  it("半环从 12 点起、顺时针扫到 6 点，内外弧回程闭合（180° 不算大弧）", () => {
    expect(donutSlicePath(0, 180, 44, 34, 50, 50)).toBe(
      "M50.00,6.00 A44,44 0 0 1 50.00,94.00 L50.00,84.00 A34,34 0 0 0 50.00,16.00 Z",
    );
  });

  it("起始角按 12 点方向顺时针：90° 落在 3 点位置", () => {
    expect(donutSlicePath(0, 90, 44, 34, 50, 50)).toContain(
      "A44,44 0 0 1 94.00,50.00",
    );
  });

  it("跨越 180° 的大扇区置 large-arc-flag=1", () => {
    expect(donutSlicePath(0, 270, 44, 34, 50, 50)).toContain(
      "A44,44 0 1 1 6.00,50.00",
    );
  });

  it("缝隙角吃掉整个扇区时不产出路径（零值扇区自然消失）", () => {
    expect(donutSlicePath(10, 11, 44, 34, 50, 50, 2)).toBe("");
  });
});

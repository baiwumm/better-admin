import { describe, expect, it } from "vitest";

import {
  areaPath,
  axisScale,
  relativePoints,
  smoothPath,
} from "../chart-geometry";

/**
 * Dashboard 图表几何纯函数测试。
 *
 * 主图表已交给 Unovis 封装，这里覆盖剩下的两块自有逻辑：KPI sparkline 的坐标归一
 * 与路径闭合，以及趋势图显式 y 轴量程的整数刻度（不用库 nice-ticks 的原因见
 * LoginTrendChart 注释）。
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

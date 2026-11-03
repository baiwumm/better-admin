import { describe, expect, it } from "vitest";

import {
  EASE_DRAWER,
  EASE_IN_OUT,
  EASE_OUT,
  EASE_OUT_CSS,
  SPRING_GLIDE,
  SPRING_LAYOUT,
  SPRING_MOUSE,
  SPRING_PANEL,
  SPRING_PRESS,
  SPRING_SWAP,
} from "@/lib/ease";

/**
 * 动效 token 不变量测试。
 * ease.ts 是全站共享动效真源（globals.css 的 CSS 变量与之镜像），
 * 两组断言守护两类真实缺陷：
 * 1. EASE_OUT_CSS 字符串与 EASE_OUT 数组脱节（注释声明的镜像关系）；
 * 2. cubic-bezier 的 x 分量越界（CSS 非法值，浏览器静默丢弃整条 transition）。
 */
describe("ease", () => {
  it("EASE_OUT_CSS 字符串与 EASE_OUT 数组严格镜像", () => {
    expect(EASE_OUT_CSS).toBe(`cubic-bezier(${EASE_OUT.join(", ")})`);
  });

  it.each([
    ["EASE_OUT", EASE_OUT],
    ["EASE_IN_OUT", EASE_IN_OUT],
    ["EASE_DRAWER", EASE_DRAWER],
  ] as const)(
    "%s：四分量且 x 分量落在 [0,1]（CSS cubic-bezier 合法域）",
    (_name, curve) => {
      expect(curve).toHaveLength(4);
      // cubic-bezier(x1, y1, x2, y2)：y 可超出 [0,1]（回弹），x 必须在 [0,1]
      expect(curve[0]).toBeGreaterThanOrEqual(0);
      expect(curve[0]).toBeLessThanOrEqual(1);
      expect(curve[2]).toBeGreaterThanOrEqual(0);
      expect(curve[2]).toBeLessThanOrEqual(1);
    },
  );

  describe("spring 配置", () => {
    const springs = {
      SPRING_PRESS,
      SPRING_SWAP,
      SPRING_PANEL,
      SPRING_LAYOUT,
      SPRING_MOUSE,
      SPRING_GLIDE,
    } as const;

    it.each(Object.entries(springs))(
      "%s：刚度 / 阻尼 / 质量均为正数",
      (_name, spring) => {
        expect(spring.stiffness).toBeGreaterThan(0);
        expect(spring.damping).toBeGreaterThan(0);
        expect(spring.mass).toBeGreaterThan(0);
      },
    );

    it("SPRING_GLIDE 阻尼比 ≥ 1（注释承诺 dragged 跟随「永不回弹」的物理不变量）", () => {
      const dampingRatio =
        SPRING_GLIDE.damping /
        (2 * Math.sqrt(SPRING_GLIDE.stiffness * SPRING_GLIDE.mass));

      expect(dampingRatio).toBeGreaterThanOrEqual(1);
    });
  });
});

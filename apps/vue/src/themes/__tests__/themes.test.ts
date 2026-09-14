import { describe, expect, it } from "vitest";

import {
  applyColorVisionToDOM,
  isColorVisionMode,
} from "@/themes/color-vision";
import {
  applyPrimaryColorToDOM,
  DEFAULT_PRIMARY_COLOR,
  formatColorLabel,
  getColorShade,
  isPrimaryColor,
  PRIMARY_COLORS,
  PRIMARY_SHADES,
} from "@/themes/primary-colors";
import {
  applyRadiusToDOM,
  DEFAULT_RADIUS_ID,
  isRadiusId,
} from "@/themes/radius";
import {
  applyRouteTransitionSpeedToDOM,
  applyRouteTransitionToDOM,
  isRouteTransition,
  isRouteTransitionSpeed,
} from "@/themes/route-transitions";
import {
  isTransitionDirection,
  runViewTransition,
} from "@/themes/transition-direction";

const root = () => document.documentElement;

describe("primary-colors（主题色板派生与 DOM 应用）", () => {
  it("候选色板剔除中性系 / 黑白 / 特殊值，保留色相色板", () => {
    expect(PRIMARY_COLORS).toContain("red");
    expect(PRIMARY_COLORS).toContain("blue");
    expect(PRIMARY_COLORS).toContain(DEFAULT_PRIMARY_COLOR);
    for (const key of [
      "slate",
      "gray",
      "zinc",
      "neutral",
      "stone",
      "black",
      "white",
      "transparent",
      "inherit",
      "current",
    ]) {
      expect(PRIMARY_COLORS).not.toContain(key);
    }
    expect(isPrimaryColor("red")).toBe(true);
    expect(isPrimaryColor("slate")).toBe(false);
    expect(isPrimaryColor(null)).toBe(false);
  });

  it("每个候选色的 11 个 shade 均有色值", () => {
    for (const color of PRIMARY_COLORS) {
      for (const shade of PRIMARY_SHADES) {
        expect(getColorShade(color, shade)).not.toBe("");
      }
    }
    expect(getColorShade("not-a-color", 500)).toBe("");
  });

  it("色名展示为英文首字母大写", () => {
    expect(formatColorLabel("red")).toBe("Red");
    expect(formatColorLabel("emerald")).toBe("Emerald");
  });

  it("色板档覆盖 11 个 shade 变量并清除 --ui-primary；默认档清除全部覆盖", () => {
    applyPrimaryColorToDOM("red", false, false);
    for (const shade of PRIMARY_SHADES) {
      expect(root().style.getPropertyValue(`--ui-color-primary-${shade}`)).toBe(
        getColorShade("red", shade),
      );
    }
    expect(root().style.getPropertyValue("--ui-primary")).toBe("");

    applyPrimaryColorToDOM(DEFAULT_PRIMARY_COLOR, false, false);
    for (const shade of PRIMARY_SHADES) {
      expect(root().style.getPropertyValue(`--ui-color-primary-${shade}`)).toBe(
        "",
      );
    }
  });

  it("Black 档清除 shade 覆盖、按明暗覆盖 --ui-primary 为 black / white", () => {
    applyPrimaryColorToDOM("red", false, false);
    applyPrimaryColorToDOM("red", true, false);
    expect(root().style.getPropertyValue("--ui-color-primary-500")).toBe("");
    expect(root().style.getPropertyValue("--ui-primary")).toBe("black");

    applyPrimaryColorToDOM("red", true, true);
    expect(root().style.getPropertyValue("--ui-primary")).toBe("white");

    // 选回色板：反向清除 --ui-primary 覆盖
    applyPrimaryColorToDOM("red", false, true);
    expect(root().style.getPropertyValue("--ui-primary")).toBe("");
    expect(root().style.getPropertyValue("--ui-color-primary-500")).not.toBe(
      "",
    );

    applyPrimaryColorToDOM(DEFAULT_PRIMARY_COLOR, false, false);
  });
});

describe("radius（圆角档位）", () => {
  it("默认档不写 DOM，其余档位覆盖 --ui-radius 为 Nuxt UI 标度", () => {
    applyRadiusToDOM("large");
    expect(root().style.getPropertyValue("--ui-radius")).toBe("0.5rem");
    applyRadiusToDOM("none");
    expect(root().style.getPropertyValue("--ui-radius")).toBe("0rem");
    applyRadiusToDOM("small");
    expect(root().style.getPropertyValue("--ui-radius")).toBe("0.125rem");
    applyRadiusToDOM(DEFAULT_RADIUS_ID);
    expect(root().style.getPropertyValue("--ui-radius")).toBe("");
  });

  it("档位 id 校验", () => {
    expect(isRadiusId("medium")).toBe(true);
    expect(isRadiusId("huge")).toBe(false);
  });
});

describe("color-vision / route-transitions（data-* 属性应用与校验）", () => {
  it("色彩模式 normal 移除属性，其余写入 data-color-vision", () => {
    applyColorVisionToDOM("grayscale");
    expect(root().getAttribute("data-color-vision")).toBe("grayscale");
    applyColorVisionToDOM("normal");
    expect(root().hasAttribute("data-color-vision")).toBe(false);
    expect(isColorVisionMode("color-weak")).toBe(true);
    expect(isColorVisionMode("blind")).toBe(false);
  });

  it("路由动画 none / 速度 normal 移除属性，其余写入", () => {
    applyRouteTransitionToDOM("glide");
    expect(root().getAttribute("data-route-transition")).toBe("glide");
    applyRouteTransitionToDOM("none");
    expect(root().hasAttribute("data-route-transition")).toBe(false);

    applyRouteTransitionSpeedToDOM("fast");
    expect(root().getAttribute("data-rt-speed")).toBe("fast");
    applyRouteTransitionSpeedToDOM("normal");
    expect(root().hasAttribute("data-rt-speed")).toBe(false);

    expect(isRouteTransition("blur")).toBe(true);
    expect(isRouteTransition("spin")).toBe(false);
    expect(isRouteTransitionSpeed("slow")).toBe(true);
    expect(isRouteTransitionSpeed("turbo")).toBe(false);
    expect(isTransitionDirection("btt")).toBe(true);
    expect(isTransitionDirection("diag")).toBe(false);
  });
});

describe("runViewTransition（无 ViewTransition 环境回退）", () => {
  it("jsdom 无 startViewTransition：直接执行 mutate 并正常 resolve，不残留标记", async () => {
    let ran = false;

    await runViewTransition(() => {
      ran = true;
    }, "ltr");

    expect(ran).toBe(true);
    expect(root().hasAttribute("data-theme-transition")).toBe(false);
    expect(root().style.getPropertyValue("--tt-from")).toBe("");
  });
});

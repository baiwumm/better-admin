import { describe, expect, it } from "vitest";

import { isOverlayEscapeKey } from "../overlay-escape";

/**
 * 命令面板 Esc 关闭判定：面板打开时任意焦点位置按 Esc 必定关闭；
 * 输入法组合中（isComposing）不响应，避免中文候选框取消时误关面板。
 */
describe("isOverlayEscapeKey", () => {
  it("Escape 且非输入法组合中 → true", () => {
    expect(isOverlayEscapeKey("Escape", false)).toBe(true);
  });

  it("输入法组合中按 Escape → false（不误关面板）", () => {
    expect(isOverlayEscapeKey("Escape", true)).toBe(false);
  });

  it("其它按键 → false（不会误关其它浮层）", () => {
    expect(isOverlayEscapeKey("Enter", false)).toBe(false);
    expect(isOverlayEscapeKey("k", false)).toBe(false);
    expect(isOverlayEscapeKey("ArrowDown", false)).toBe(false);
  });
});

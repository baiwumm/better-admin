import { describe, expect, it } from "vitest";

import { formatDateTime, formatRelativeTime } from "@/lib/format-date";

/**
 * 日期时间格式化测试。
 * Intl 输出随 ICU 版本有细微差异（空格 / 连接词），断言只锁定
 * 稳定成分（年月日数字、时分、单位词），不断言整串字面量。
 * 测试用例用本地时间分量构造 Date，结果不受运行环境时区影响。
 */
describe("format-date", () => {
  describe("formatDateTime", () => {
    const value = new Date(2026, 8, 3, 10, 46); // 2026-09-03 10:46 本地时间

    it("zh-CN：长日期 + 24 小时制短时间", () => {
      const out = formatDateTime(value, "zh-CN");

      expect(out).toContain("2026");
      expect(out).toContain("9");
      expect(out).toContain("3");
      expect(out).toContain("10:46");
    });

    it("en：月份全称 + at 连接", () => {
      const out = formatDateTime(value, "en");

      expect(out).toContain("September");
      expect(out).toContain("2026");
      expect(out).toContain("10:46");
    });

    it("同一 locale 重复调用结果一致（模块级 formatter 缓存）", () => {
      expect(formatDateTime(value, "zh-CN")).toBe(
        formatDateTime(value, "zh-CN"),
      );
    });

    it("接受 ISO 字符串入参", () => {
      expect(formatDateTime(value.toISOString(), "en")).toContain("September");
    });
  });

  describe("formatRelativeTime", () => {
    const now = new Date(2026, 8, 3, 12, 0, 0);

    it("45 秒内 → 「刚刚 / just now」", () => {
      expect(
        formatRelativeTime(new Date(now.getTime() - 44_000), "zh-CN", now),
      ).toBe("刚刚");
      expect(
        formatRelativeTime(new Date(now.getTime() - 44_000), "en", now),
      ).toBe("just now");
    });

    it("超过 45 秒落入秒级区间", () => {
      const out = formatRelativeTime(
        new Date(now.getTime() - 45_000),
        "zh-CN",
        now,
      );

      expect(out).toMatch(/45.*秒/);
    });

    it("分钟 / 小时 / 天 / 年 档位正确（过去）", () => {
      expect(
        formatRelativeTime(new Date(now.getTime() - 3 * 60_000), "zh-CN", now),
      ).toMatch(/3.*分钟/);
      expect(
        formatRelativeTime(new Date(now.getTime() - 2 * 3_600_000), "en", now),
      ).toMatch(/2 hours? ago/);
      expect(
        formatRelativeTime(new Date(now.getTime() - 5 * 86_400_000), "en", now),
      ).toMatch(/5 days? ago/);
      // numeric:"auto" 下 ±1 年会输出「去年/明年」，用 800 天验证年档位
      expect(
        formatRelativeTime(
          new Date(now.getTime() - 800 * 86_400_000),
          "zh-CN",
          now,
        ),
      ).toMatch(/2.*年/);
    });

    it("未来时间（站内信提醒等场景）", () => {
      expect(
        formatRelativeTime(
          new Date(now.getTime() + 2 * 3_600_000),
          "zh-CN",
          now,
        ),
      ).toMatch(/2.*小时/);
      expect(
        formatRelativeTime(new Date(now.getTime() + 3 * 60_000), "en", now),
      ).toMatch(/in 3 minutes?/);
    });
  });
});

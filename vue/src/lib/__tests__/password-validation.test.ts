import { describe, expect, it } from "vitest";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  getPasswordError,
  passwordContainsUsername,
} from "@/lib/password-validation";

/**
 * 密码策略（契约 v1.8.0）前端预检——用例与 React 端 / Nest 端 password-policy 的边界口径一致，
 * 任一侧规则调整时各端用例须同步（前后端漂移由此暴露）。
 */

describe("getPasswordError · 格式规则", () => {
  it("8 位字母+数字通过；20 位上限通过", () => {
    expect(getPasswordError("abc12345")).toBeNull();
    expect(getPasswordError(`${"a".repeat(19)}1`)).toBeNull();
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_MAX_LENGTH).toBe(20);
  });

  it("长度越界：7 位 tooShort、21 位 tooLong、空串 tooShort", () => {
    expect(getPasswordError("abc1234")).toBe("tooShort");
    expect(getPasswordError(`${"a".repeat(20)}1`)).toBe("tooLong");
    expect(getPasswordError("")).toBe("tooShort");
  });

  it("空白与非 ASCII 一律 invalidChars（空格 / 首空格 / tab / 中文）", () => {
    expect(getPasswordError("abcd 1234")).toBe("invalidChars");
    expect(getPasswordError(" abcd1234")).toBe("invalidChars");
    expect(getPasswordError("abcd1234\t")).toBe("invalidChars");
    expect(getPasswordError("abcd1234中")).toBe("invalidChars");
  });

  it("必须同时含字母和数字：纯数字 / 纯字母 / 纯符号 → missingLetterOrDigit", () => {
    expect(getPasswordError("12345678")).toBe("missingLetterOrDigit");
    expect(getPasswordError("abcdefgh")).toBe("missingLetterOrDigit");
    expect(getPasswordError("!@#$%^&*")).toBe("missingLetterOrDigit");
  });

  it("ASCII 可打印符号全部允许（含边界字符 ~ ` | \\ < >）", () => {
    expect(getPasswordError("Abc!@#12")).toBeNull();
    expect(getPasswordError("~`a1|\\<>")).toBeNull();
  });

  it("规则按顺序短路：长度不足时不再报字符/字母数字问题", () => {
    expect(getPasswordError("中 1")).toBe("tooShort");
  });
});

describe("passwordContainsUsername / getPasswordError · 用户名规则", () => {
  it("包含用户名（不区分大小写）→ containsUsername", () => {
    expect(passwordContainsUsername("Admin12345", "admin")).toBe(true);
    expect(getPasswordError("Admin12345", "admin")).toBe("containsUsername");
    expect(getPasswordError("ADMIN123", "admin")).toBe("containsUsername");
  });

  it("用户名不足 3 位跳过检查；恰 3 位参与检查", () => {
    expect(passwordContainsUsername("ab123456", "ab")).toBe(false);
    expect(getPasswordError("ab123456", "ab")).toBeNull();
    expect(getPasswordError("abc12345", "abc")).toBe("containsUsername");
  });

  it("无用户名 / 不包含时通过", () => {
    expect(getPasswordError("xyz12345", "admin")).toBeNull();
    expect(getPasswordError("abc12345", null)).toBeNull();
    expect(getPasswordError("abc12345", undefined)).toBeNull();
  });
});

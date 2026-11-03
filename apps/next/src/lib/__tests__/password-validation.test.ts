import { describe, expect, it } from "vitest";

import {
  buildPasswordSchema,
  getPasswordError,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordContainsUsername,
} from "@/lib/password-validation";

/**
 * 密码策略（契约 v1.8.0）前端预检测试。
 * 本模块与 Nest 端 password-policy.ts、react 端同文件为同构副本，
 * 规则常量（8-20 位 / ASCII 可打印 / 字母+数字 / 不含用户名）即契约。
 */
describe("password-validation", () => {
  describe("getPasswordError 长度边界", () => {
    it("短于 8 位 → tooShort；恰好 8 位合法", () => {
      expect(getPasswordError("Ab1")).toBe("tooShort");
      expect(getPasswordError("a".repeat(PASSWORD_MIN_LENGTH - 2) + "1")).toBe(
        "tooShort",
      );
      expect(getPasswordError("Abcd1234")).toBeNull();
    });

    it("长于 20 位 → tooLong；恰好 20 位合法", () => {
      expect(getPasswordError(`A1${"b".repeat(PASSWORD_MAX_LENGTH - 1)}`)).toBe(
        "tooLong",
      );
      expect(
        getPasswordError(`A1${"b".repeat(PASSWORD_MAX_LENGTH - 2)}`),
      ).toBeNull();
    });
  });

  describe("getPasswordError 字符集与组成", () => {
    it("含空格或非 ASCII → invalidChars", () => {
      expect(getPasswordError("Abcd 123")).toBe("invalidChars");
      expect(getPasswordError("密码Abcd123")).toBe("invalidChars");
    });

    it("纯字母或纯数字 → missingLetterOrDigit", () => {
      expect(getPasswordError("abcdefgh")).toBe("missingLetterOrDigit");
      expect(getPasswordError("12345678")).toBe("missingLetterOrDigit");
    });
  });

  describe("passwordContainsUsername", () => {
    it("包含用户名 → 不区分大小写命中", () => {
      expect(passwordContainsUsername("Baiwumm123", "baiwumm")).toBe(true);
      expect(getPasswordError("Baiwumm123", "baiwumm")).toBe(
        "containsUsername",
      );
    });

    it("用户名短于 3 位时跳过包含检查", () => {
      expect(passwordContainsUsername("ab12345678", "ab")).toBe(false);
      expect(getPasswordError("ab12345678", "ab")).toBeNull();
    });

    it("不包含用户名的合法密码通过", () => {
      expect(getPasswordError("Str0ng!Pass", "baiwumm")).toBeNull();
    });
  });

  describe("buildPasswordSchema（zod 集成）", () => {
    it("合法密码通过校验", () => {
      const schema = buildPasswordSchema("baiwumm");

      expect(schema.safeParse("Str0ng!Pass").success).toBe(true);
    });

    it("非法密码的 issue.message 即 PasswordErrorKey（表单按 key 取 i18n 文案）", () => {
      const schema = buildPasswordSchema("baiwumm");
      const result = schema.safeParse("Baiwumm123");

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe("containsUsername");
    });
  });
});

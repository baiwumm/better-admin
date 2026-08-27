import { describe, expect, it } from "vitest";

import authEn from "../locales/en/auth.json";
import commonEn from "../locales/en/common.json";
import errorsEn from "../locales/en/errors.json";
import layoutEn from "../locales/en/layout.json";
import menuEn from "../locales/en/menu.json";
import authZh from "../locales/zh-CN/auth.json";
import commonZh from "../locales/zh-CN/common.json";
import errorsZh from "../locales/zh-CN/errors.json";
import layoutZh from "../locales/zh-CN/layout.json";
import menuZh from "../locales/zh-CN/menu.json";

/** 语言包文件与其域前缀（键为完整字面量形式，见 config.ts 说明）。 */
const DOMAINS = [
  ["auth", authZh, authEn],
  ["common", commonZh, commonEn],
  ["errors", errorsZh, errorsEn],
  ["layout", layoutZh, layoutEn],
  ["menu", menuZh, menuEn],
] as const;

describe("i18n locales", () => {
  it("zh-CN 与 en 的 key 集合完全一致（逐域）", () => {
    for (const [domain, zh, en] of DOMAINS) {
      const zhKeys = Object.keys(zh).sort();
      const enKeys = Object.keys(en).sort();

      expect(zhKeys, `${domain} zh-CN 独有键`).toEqual(enKeys);
    }
  });

  it("所有键值均为非空字符串", () => {
    for (const [domain, zh, en] of DOMAINS) {
      for (const [key, value] of Object.entries(zh)) {
        expect(typeof value, `${domain}:${key} zh-CN 类型`).toBe("string");
        expect(value.length, `${domain}:${key} zh-CN 非空`).toBeGreaterThan(0);
      }
      for (const [key, value] of Object.entries(en)) {
        expect(typeof value, `${domain}:${key} en 类型`).toBe("string");
        expect(value.length, `${domain}:${key} en 非空`).toBeGreaterThan(0);
      }
    }
  });

  it("键均以所在域名为前缀（防止跨域拼接出错）", () => {
    for (const [domain, zh, en] of DOMAINS) {
      for (const key of Object.keys(zh)) {
        expect(key.startsWith(`${domain}.`), `${domain}:${key} 前缀`).toBe(
          true,
        );
      }
      for (const key of Object.keys(en)) {
        expect(key.startsWith(`${domain}.`), `${domain}:${key} 前缀`).toBe(
          true,
        );
      }
    }
  });
});

import { createInstance } from "i18next";

import authEn from "./locales/en/auth.json";
import commonEn from "./locales/en/common.json";
import errorsEn from "./locales/en/errors.json";
import featuresEn from "./locales/en/features.json";
import layoutEn from "./locales/en/layout.json";
import menuEn from "./locales/en/menu.json";
import authZh from "./locales/zh-CN/auth.json";
import commonZh from "./locales/zh-CN/common.json";
import errorsZh from "./locales/zh-CN/errors.json";
import featuresZh from "./locales/zh-CN/features.json";
import layoutZh from "./locales/zh-CN/layout.json";
import menuZh from "./locales/zh-CN/menu.json";

/** 支持的语言列表（有顺序，语言切换菜单按此渲染）。 */
export const SUPPORTED_LANGUAGES = ["zh-CN", "en"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const FALLBACK_LANGUAGE: Language = "zh-CN";

function isLanguage(value: unknown): value is Language {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

/**
 * 语言资源：五个顶层域文件（common / auth / layout / menu / errors），
 * 每个文件内是**完整字面量键**（如 menu.json 内的 "menu.users"），
 * 此处合并为单一 translation 扁平对象。
 *
 * 采用扁平键 + keySeparator: false 的原因：后端菜单 i18nKey 存在
 * "menu.settings"（组）与 "menu.settings.profile"（子项）这类叶子/分支
 * 共存的键，i18next 的嵌套结构（按 "." 逐级下钻）无法表达；扁平 map
 * 天然支持任意字面量键，与后端 i18nKey 一字不差直连。
 */
const resources = {
  en: {
    translation: {
      ...authEn,
      ...commonEn,
      ...errorsEn,
      ...featuresEn,
      ...layoutEn,
      ...menuEn,
    },
  },
  "zh-CN": {
    translation: {
      ...authZh,
      ...commonZh,
      ...errorsZh,
      ...featuresZh,
      ...layoutZh,
      ...menuZh,
    },
  },
} as const;

/**
 * i18next 实例（不用默认单例，便于测试与隔离）。
 * 注意：实例必须先 init 再允许任何 t() 调用——由 main.tsx 的
 * bootstrap 保证「await initI18n() 之后才 createRoot().render()」；
 * 非 hook 环境（api-client 等）一律走 index.ts 导出的 t / getErrorMessage。
 */
export const i18n = createInstance({
  fallbackLng: FALLBACK_LANGUAGE,
  // 扁平字面量键：禁用 "." 键下钻与 ":" 命名空间分隔（键内无冒号）
  keySeparator: false,
  nsSeparator: false,
  interpolation: {
    // React 已自行转义，关闭 i18next 的插值转义避免双重转义
    escapeValue: false,
  },
  resources,
  returnNull: false,
});

export { isLanguage };

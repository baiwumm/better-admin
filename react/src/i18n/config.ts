import { createInstance } from "i18next";

import authEn from "./locales/en/auth.json";
import commonEn from "./locales/en/common.json";
import errorsEn from "./locales/en/errors.json";
import layoutEn from "./locales/en/layout.json";
import menuEn from "./locales/en/menu.json";
import authZh from "./locales/zh-CN/auth.json";
import commonZh from "./locales/zh-CN/common.json";
import errorsZh from "./locales/zh-CN/errors.json";
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
 * 各文件内容挂在同名前缀下拼成完整 key（如 auth.json 内的 signIn.title →
 * "auth.signIn.title"）。资源静态 import 打进 bundle（站点文案量级无需网络懒加载）。
 */
const resources = {
  en: {
    translation: {
      auth: authEn,
      common: commonEn,
      errors: errorsEn,
      layout: layoutEn,
      menu: menuEn,
    },
  },
  "zh-CN": {
    translation: {
      auth: authZh,
      common: commonZh,
      errors: errorsZh,
      layout: layoutZh,
      menu: menuZh,
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
  interpolation: {
    // React 已自行转义，关闭 i18next 的插值转义避免双重转义
    escapeValue: false,
  },
  resources,
  returnNull: false,
});

export { isLanguage };

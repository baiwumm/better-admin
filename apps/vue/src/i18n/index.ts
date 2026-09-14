import { createI18n } from "vue-i18n";

import authEn from "./locales/en/auth.json";
import commonEn from "./locales/en/common.json";
import dictEn from "./locales/en/dict.json";
import errorsEn from "./locales/en/errors.json";
import featuresEn from "./locales/en/features.json";
import layoutEn from "./locales/en/layout.json";
import menuEn from "./locales/en/menu.json";
import authZh from "./locales/zh-CN/auth.json";
import commonZh from "./locales/zh-CN/common.json";
import dictZh from "./locales/zh-CN/dict.json";
import errorsZh from "./locales/zh-CN/errors.json";
import featuresZh from "./locales/zh-CN/features.json";
import layoutZh from "./locales/zh-CN/layout.json";
import menuZh from "./locales/zh-CN/menu.json";
import { FALLBACK_LANGUAGE, readStoredLanguage, type Language } from "./config";

/**
 * 语言资源：七个顶层域文件（auth / common / dict / errors / features / layout / menu），
 * 每个文件内是**完整字面量键**（如 menu.json 内的 "menu.users"），
 * 合并为单一扁平 map。
 *
 * 采用扁平键 + 自定义 messageResolver 的原因（与 React 端 i18next
 * keySeparator: false 语义对齐）：
 * 1. 后端菜单 i18nKey 存在 "menu.settings"（组名）与 "menu.settings.profile"
 *    这类叶子/分支共存的键，vue-i18n 默认嵌套结构（按 "." 逐级下钻）无法表达；
 * 2. 自定义 resolver 直接对扁平 map 做精确查找，与后端 i18nKey 一字不差直连。
 */
const resources = {
  en: {
    ...authEn,
    ...commonEn,
    ...dictEn,
    ...errorsEn,
    ...featuresEn,
    ...layoutEn,
    ...menuEn,
  },
  "zh-CN": {
    ...authZh,
    ...commonZh,
    ...dictZh,
    ...errorsZh,
    ...featuresZh,
    ...layoutZh,
    ...menuZh,
  },
};

/**
 * 插值占位符归一化：语言包沿用 React 端 i18next 的双花括号语法（{{status}}），
 * vue-i18n 使用单花括号（{status}）；构建消息时统一替换，源 JSON 保持与 React 端零漂移。
 */
function normalizeInterpolation(map: Record<string, string>) {
  for (const [key, value] of Object.entries(map)) {
    if (typeof value === "string" && value.includes("{{")) {
      map[key] = value.replaceAll(/\{\{(\w+)\}\}/g, "{$1}");
    }
  }
}

for (const map of Object.values(resources)) {
  normalizeInterpolation(map);
}

/**
 * i18n 实例（ Composition API 模式）。
 * 模块级取词：i18n.global.t()，供 api-client / 守卫等非组件环境使用；
 * 组件内用 useI18n()（语言切换时自动重渲染）。
 */
export const i18n = createI18n<[Record<string, string>], "zh-CN" | "en", false>(
  {
    legacy: false,
    locale: readStoredLanguage(),
    fallbackLocale: FALLBACK_LANGUAGE,
    // 扁平字面量键：直接对 map 精确查找（含点号键原样命中）
    messageResolver: (obj, key) =>
      (obj as Record<string, string>)[key] as never,
    // 缺键时 vue-i18n 返回 key 本身（与 i18next 行为一致），关闭控制台警告
    missingWarn: false,
    fallbackWarn: false,
    messages: resources,
  },
);

/**
 * 延迟求值的容错取词：缺键（返回 key 本身）时回退到调用方提供的 fallback 文案，
 * 保证任何时刻用户至少能看到原文而非 key 名。
 * 典型用例：api-client 的错误信息（非组件环境取词）。
 */
export function getErrorMessage(
  key: string,
  fallback: string,
  options?: Record<string, unknown>,
): string {
  const translated = i18n.global.t(key, options ?? {});

  return translated === key ? fallback : translated;
}

/** 切换语言（language-store 调用；组件内响应式更新）。 */
export function setGlobalLanguage(language: Language) {
  i18n.global.locale.value = language;
}

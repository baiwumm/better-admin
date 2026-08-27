import { useTranslation } from "react-i18next";

import { FALLBACK_LANGUAGE, i18n, isLanguage } from "./config";

/**
 * 模块级取词：供 api-client、lib 等非 hook 环境使用。
 * 组件内请使用 react-i18next 的 useTranslation()（语言切换时自动重渲染）。
 */
export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options);
}

/**
 * 延迟求值的容错取词：i18n 未初始化（或初始化异常）时回退到调用方提供的
 * fallback 文案，保证任何时刻用户至少能看到原文而非空串或报错。
 * 典型用例：api-client 的错误信息（模块加载早于 React 渲染，不能定义常量时取词）。
 */
export function getErrorMessage(key: string, fallback: string): string {
  if (!i18n.isInitialized) return fallback;

  const translated = i18n.t(key);

  // 未命中 key 时 i18next 会回显 key 本身，此时也退回 fallback
  return translated === key ? fallback : translated;
}

/**
 * 初始化 i18n 实例。main.tsx 的 bootstrap 必须先 await 本函数再 render：
 * 菜单树可能在首帧前经 useMenus prefetch 到达并触发渲染，t() 必须已可用。
 *
 * @param language 启动语言（由 language-store 从 localStorage 读出；
 * 缺省时使用 fallback 简体中文）。切换语言在运行期走 changeLanguage，不经此处。
 */
export async function initI18n(language?: string): Promise<void> {
  if (i18n.isInitialized) return;

  await i18n.init({
    lng: isLanguage(language) ? language : FALLBACK_LANGUAGE,
  });
}

// 统一转发官方 hook，业务组件从 "@/i18n" 单点引入，避免到处拼两个包名
export { useTranslation };
export {
  FALLBACK_LANGUAGE,
  i18n,
  SUPPORTED_LANGUAGES,
  isLanguage,
  type Language,
} from "./config";

import { createInstance } from "i18next";
import { useTranslation } from "react-i18next";

import { FALLBACK_LANGUAGE, i18n, isLanguage, resources } from "./config";

/**
 * 同步初始化 i18n 实例（幂等，重复调用直接返回）。
 *
 * Next 适配说明：React 版在 main.tsx 中 await initI18n() 后才渲染；
 * App Router 没有渲染前的 bootstrap 入口，改为在根 Providers 首次渲染时
 * 以根 layout 从 Cookie 读出的启动语言同步调用本函数——语言资源为内置
 * 静态 JSON，i18next.init 同步完成，任何 useTranslation()/t() 在调用后
 * 立即可用；服务端与客户端使用同一启动语言，水合输出一致、无首屏闪烁。
 * 运行期切换语言走 i18n.changeLanguage，不经此处。
 */
export function initI18n(language?: string): void {
  if (i18n.isInitialized) return;

  i18n.init({
    lng: isLanguage(language) ? language : FALLBACK_LANGUAGE,
  });
}

/**
 * 创建独立的 i18n 实例（仅服务端 SSR 用）。
 *
 * 模块单例是浏览器端的会话实例；服务端若复用同一单例，会以「首个请求的
 * Cookie 语言」初始化并跨请求污染后续用户的渲染语言（模块级可变状态禁止
 * 承载请求态）。因此服务端每次 SSR 用启动语言创建独立实例，经
 * I18nextProvider 注入本次渲染树；服务端模块级 t()/getErrorMessage() 不经
 * 初始化，自动回退调用方提供的默认文案（如 server-fetch 的错误信息）。
 */
export function createI18nInstance(language?: string) {
  const instance = createInstance({
    fallbackLng: FALLBACK_LANGUAGE,
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    resources,
    returnNull: false,
  });

  instance.init({ lng: isLanguage(language) ? language : FALLBACK_LANGUAGE });

  return instance;
}

// 统一转发官方 hook，业务组件从 "@/i18n" 单点引入，避免到处拼两个包名；
// t / getErrorMessage 等非 hook 取词函数自 config.ts 转发——该文件不含
// react-i18next：服务端模块只能引 config，一旦引到 index 会在 RSC 运行时
// 评估 react-i18next（其 createContext 在 react-server 构建中不存在）而崩溃
export { useTranslation };
export {
  FALLBACK_LANGUAGE,
  i18n,
  SUPPORTED_LANGUAGES,
  isLanguage,
  t,
  getErrorMessage,
  type Language,
} from "./config";

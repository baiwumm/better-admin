import type { Language } from '@/i18n/config'

/**
 * i18n 运行时桥（api-client / language-store 与 @nuxtjs/i18n 的解耦层）。
 *
 * Vue 端 i18n 是模块级单例（i18n.global.t），api-client 直接 import；
 * Nuxt 端 i18n 实例由 @nuxtjs/i18n plugin 创建（nuxtApp.$i18n），
 * 为避免非组件模块依赖 Nuxt 上下文与循环 import，采用「plugin 启动时绑定」
 * 模式（与 bindAuthSnapshot / initEnv 同一惯例）：
 * app/plugins/i18n-bridge.ts 调用 bindI18nRuntime() 注入实现。
 */

interface I18nRuntime {
  /** 容错取词：缺键（返回 key 本身）时回退 fallback 文案。 */
  getErrorMessage: (
    key: string,
    fallback: string,
    options?: Record<string, unknown>
  ) => string
  /** 切换全局语言（组件内 useI18n 响应式更新）。 */
  setGlobalLocale: (language: Language) => void
}

let runtime: I18nRuntime | null = null

/** plugin 启动时注入 i18n 运行时实现（应用生命周期内调用一次）。 */
export function bindI18nRuntime(impl: I18nRuntime) {
  runtime = impl
}

/**
 * 延迟求值的容错取词：缺键（返回 key 本身）时回退到调用方提供的 fallback 文案，
 * 保证任何时刻用户至少能看到原文而非 key 名。
 * 典型用例：api-client 的错误信息（非组件环境取词）。
 */
export function getErrorMessage(
  key: string,
  fallback: string,
  options?: Record<string, unknown>
): string {
  return runtime
    ? runtime.getErrorMessage(key, fallback, options)
    : fallback
}

/** 切换语言（language-store 调用；组件内响应式更新）。 */
export function setGlobalLanguage(language: Language) {
  runtime?.setGlobalLocale(language)
}

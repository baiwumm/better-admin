import type { I18nOptions } from 'vue-i18n'

import authEn from './locales/en/auth.json'
import commonEn from './locales/en/common.json'
import dictEn from './locales/en/dict.json'
import errorsEn from './locales/en/errors.json'
import featuresEn from './locales/en/features.json'
import layoutEn from './locales/en/layout.json'
import menuEn from './locales/en/menu.json'
import authZh from './locales/zh-CN/auth.json'
import commonZh from './locales/zh-CN/common.json'
import dictZh from './locales/zh-CN/dict.json'
import errorsZh from './locales/zh-CN/errors.json'
import featuresZh from './locales/zh-CN/features.json'
import layoutZh from './locales/zh-CN/layout.json'
import menuZh from './locales/zh-CN/menu.json'

/**
 * 语言资源合并 + 插值占位符归一化（逐字平移自 vue/src/i18n/index.ts 的
 * resources 构建，保持与 Vue 端同构）：七个顶层域文件（auth / common /
 * dict / errors / features / layout / menu）合并为单一扁平 map。
 *
 * 在此显式 import 而非走 @nuxtjs/i18n 的 locales[].files 加载，是因为语言包
 * 沿用 React 端 i18next 的双花括号插值（{{status}}），vue-i18n 使用单花括号
 * （{status}）——与 Vue 端一致，加载时统一替换归一化，源 JSON 与 React 端
 * 零漂移（nuxt.config.ts 的 locales 声明仅保留 code/language/name 元信息）。
 */
const resources: Record<string, Record<string, string>> = {
  'en': {
    ...authEn,
    ...commonEn,
    ...dictEn,
    ...errorsEn,
    ...featuresEn,
    ...layoutEn,
    ...menuEn
  } as Record<string, string>,
  'zh-CN': {
    ...authZh,
    ...commonZh,
    ...dictZh,
    ...errorsZh,
    ...featuresZh,
    ...layoutZh,
    ...menuZh
  } as Record<string, string>
}

/** 插值占位符归一化：{{status}} → {status}（构建消息时统一替换）。 */
function normalizeInterpolation(map: Record<string, string>) {
  for (const [key, value] of Object.entries(map)) {
    if (typeof value === 'string' && value.includes('{{')) {
      map[key] = value.replaceAll(/\{\{(\w+)\}\}/g, '{$1}')
    }
  }
}

for (const map of Object.values(resources)) {
  normalizeInterpolation(map)
}

/**
 * vue-i18n 运行时配置（@nuxtjs/i18n v10，nuxt-plan.md §5 D3）。
 * 采用扁平键 + 自定义 messageResolver 的原因（与 React 端 i18next
 * keySeparator: false 语义对齐，同 Vue 端 i18n/index.ts）：
 * 1. 后端菜单 i18nKey 存在 "menu.settings"（组名）与叶子键共存的形态，
 *    vue-i18n 默认嵌套结构（按 "." 逐级下钻）无法表达；
 * 2. 自定义 resolver 直接对扁平 map 做精确查找，与后端 i18nKey 一字不差直连。
 */
export default defineI18nConfig(() => ({
  legacy: false,
  fallbackLocale: 'zh-CN',
  // 扁平字面量键：直接对 map 精确查找（含点号键原样命中）
  messageResolver: (obj: unknown, key: string) =>
    (obj as Record<string, unknown>)[key] as never,
  // 缺键时 vue-i18n 返回 key 本身（与 i18next 行为一致），关闭控制台警告
  missingWarn: false,
  fallbackWarn: false,
  messages: resources as I18nOptions['messages']
} satisfies I18nOptions))

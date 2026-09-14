import type { Language } from '@/i18n/config'

import { readStoredLanguage } from '@/i18n/config'
import { bindI18nRuntime } from '@/lib/i18n-bridge'

/**
 * i18n 运行时桥绑定（app/lib/i18n-bridge.ts 的注入端）：
 * - getErrorMessage：容器错取词（缺键回退 fallback），供 api-client 等非组件模块；
 * - setGlobalLocale：语言切换（组件内 useI18n 响应式更新）；
 * - 启动时恢复 localStorage 持久化语言（对齐 Vue 端 createI18n
 *   locale: readStoredLanguage() 初始化语义；@nuxtjs/i18n 的
 *   detectBrowserLanguage 已关闭，持久化由 language-store 管理）。
 */
export default defineNuxtPlugin(() => {
  const i18n = useNuxtApp().$i18n

  bindI18nRuntime({
    getErrorMessage: (key, fallback, options) => {
      const translated = i18n.t(key, options ?? {})

      return translated === key ? fallback : translated
    },
    setGlobalLocale: (language: Language) => {
      i18n.locale.value = language
    }
  })

  const stored = readStoredLanguage()

  if (i18n.locale.value !== stored) {
    i18n.locale.value = stored
  }
})

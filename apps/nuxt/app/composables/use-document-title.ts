import { computed } from 'vue'

import { ENV } from '@/lib/env'
import { resolveRouteTitleKey } from '@/lib/route-access'
import { useLanguageStore } from '@/stores/language-store'

/**
 * 同步浏览器标签页标题（语义对齐 Vue 端 use-document-title 与 React 端
 * lib/use-document-title，实现改用 Nuxt 内置 useHead）：
 * 当前路径 → menu.pageTitle.* i18n 键（精确 + 前缀匹配，如公告详情复用
 * 列表页标题），翻译后拼接 `${页面标题} - ${ENV.appName}`；无键路径回退
 * `${ENV.appName}`。响应式依赖「路由路径 + 语言」两个来源：导航与切换语言
 * 均即时刷新（切语言不导航也更新，与 Vue 端 watch 双源语义一致）。
 */
export function useDocumentTitle(): void {
  const route = useRoute()
  const language = useLanguageStore()
  const i18n = useNuxtApp().$i18n

  const title = computed(() => {
    // 显式读取 store 的 locale：保证切换语言（不导航）时重算标题
    void language.locale

    const titleKey = resolveRouteTitleKey(route.path)
    const translated = titleKey ? i18n.t(titleKey) : ''

    return translated ? `${translated} - ${ENV.appName}` : ENV.appName
  })

  useHead({ title })
}

import { VueQueryPlugin } from '@tanstack/vue-query'

import { queryClient } from '@/lib/query-client'

/**
 * vue-query 接线（nuxt-plan.md §4 选型：刻意不用内置 useFetch/useAsyncData
 * 替代——缓存 / refetch / epoch 语义会重写，违反「行为不变」；沿用 Vue 端
 * 的 QueryClient + fetch 版 api-client，baseURL 已改为同源 /api）。
 * ssr:false（SPA）下模块级单例 query-client 安全，与 Vue 端同构。
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueQueryPlugin, { queryClient })
})

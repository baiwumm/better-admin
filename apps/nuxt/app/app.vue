<script setup lang="ts">
import { computed } from 'vue'
import * as uiLocales from '@nuxt/ui/locale'

import { useDocumentTitle } from '@/composables/use-document-title'
import { isAdminLayoutRoute, isAuthLayoutPath } from '@/lib/route-access'

/**
 * 应用根组件（对齐 vue/src/App.vue 语义）：
 * - NuxtLoadingIndicator：路由切换进度条（nuxt-plan.md §4 双轨拍板之路由轨；
 *   接口请求进度由 ProgressProvider（@bprogress）+ lib/progress.ts 状态机承担，
 *   api-client 已在请求前后改写状态机）
 * - UApp：toast 等全局上下文；内置文案跟随全局语言切换
 *   （vue-i18n locale zh-CN / en → @nuxt/ui/locale zh_cn / en）
 * - 布局：definePageMeta layout 缺省为 admin（登录页 auth、独立错误页 empty）；
 * - useDocumentTitle：订阅路由 + 语言即时刷新标签页标题
 */
const route = useRoute()

useDocumentTitle()

const UI_LOCALE_MAP = {
  'zh-CN': 'zh_cn',
  'en': 'en'
} as const

const { locale } = useI18n()

const uiLocale = computed(
  () => uiLocales[UI_LOCALE_MAP[locale.value as keyof typeof UI_LOCALE_MAP]]
)

const layoutName = computed(() => {
  const metaLayout = route.meta.layout as
    | 'admin'
    | 'auth'
    | 'empty'
    | undefined

  if (metaLayout) return metaLayout

  // 缺省分支按「路由位置」判定（对齐 Vue 端 AppShell：isAuthLayoutPath /
  // isAdminLayoutRoute），不掺入认证态。认证态驱动会让布局先于导航切换：
  // 退出时 clearSession 同步置 isAuthenticated=false，而 route 仍停在业务页，
  // 布局立刻切成 auth 却套着尚未离开的控制台页面，等撤销请求返回、
  // router.push('/sign-in') 完成后表单才出现（机制见 docs/mechanisms.md §25 后续调整）。
  // 「未登录时 admin 布局不挂载」仍成立：Nuxt 客户端入口在 applyPlugins 阶段
  // await router.isReady() 后才 mount，首帧 route 已是守卫重定向后的最终位置
  // （未登录直访业务路径 → 此刻已是 /sign-in，显式 auth）。
  if (isAuthLayoutPath(route.path)) return 'auth'

  return isAdminLayoutRoute(route) ? 'admin' : 'empty'
})
</script>

<template>
  <UApp
    :locale="uiLocale"
    :toaster="{ position: 'top-center', duration: 2000 }"
  >
    <NuxtLoadingIndicator
      color="var(--ui-primary)"
      :height="2"
    />

    <!-- 请求驱动进度条：@bprogress Provider + lib/progress.ts 状态机桥接 -->
    <ProgressProvider>
      <NuxtLayout :name="layoutName">
        <!-- 保活宿主（对齐 Vue 端 KeepAliveOutlet）：标签集合约束 KeepAlive include，
             路由 VT 编排 / 刷新重建 / 滚动回顶均在宿主内；auth / empty 布局下
             cachedNames 为空，行为等同普通渲染 -->
        <KeepAliveOutlet>
          <NuxtPage />
        </KeepAliveOutlet>
      </NuxtLayout>
    </ProgressProvider>
  </UApp>
</template>

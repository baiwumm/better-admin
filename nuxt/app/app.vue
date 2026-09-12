<script setup lang="ts">
import { computed } from 'vue'
import * as uiLocales from '@nuxt/ui/locale'

import { useDocumentTitle } from '@/composables/use-document-title'

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

const layoutName = computed(
  () =>
    (route.meta.layout as 'admin' | 'auth' | 'empty' | undefined) ?? 'admin'
)
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
        <NuxtPage />
      </NuxtLayout>
    </ProgressProvider>
  </UApp>
</template>

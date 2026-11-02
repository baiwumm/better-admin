<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import * as uiLocales from "@nuxt/ui/locale";
import { Analytics } from "@vercel/analytics/vue";

import { ProgressProvider } from "@/components/common/progress-provider";
import { useDocumentTitle } from "@/composables/use-document-title";

/**
 * Nuxt UI 内置文案（密码显隐 aria、Toast 关闭按钮等）跟随全局语言切换：
 * vue-i18n locale（zh-CN / en）映射到 @nuxt/ui/locale（zh_cn / en），
 * 写法参照 better-nuxt 端 app/app.vue。
 */
const UI_LOCALE_MAP = {
  "zh-CN": "zh_cn",
  en: "en",
} as const;

const { locale } = useI18n();

// 浏览器标签页标题：订阅路由与语言，导航 / 切换语言即时刷新（根级挂载
// 覆盖登录页、错误页与管理区全部页面，语义对齐 React 端 __root.tsx）。
useDocumentTitle();

const uiLocale = computed(
  () => uiLocales[UI_LOCALE_MAP[locale.value as keyof typeof UI_LOCALE_MAP]],
);
</script>

<template>
  <ProgressProvider>
    <UApp
      :locale="uiLocale"
      :toaster="{ position: 'top-center', duration: 2000 }"
    >
      <AppShell />
      <!-- Vercel 站点分析：组件内 useRoute() 关掉 pushState 自动跟踪、改为逐页
           上报，动态段经 computeRoute 归一；非 Vercel 部署下按设计为 no-op -->
      <Analytics />
    </UApp>
  </ProgressProvider>
</template>

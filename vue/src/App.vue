<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import * as uiLocales from "@nuxt/ui/locale";

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

const uiLocale = computed(
  () => uiLocales[UI_LOCALE_MAP[locale.value as keyof typeof UI_LOCALE_MAP]],
);
</script>

<template>
  <UApp
    :locale="uiLocale"
    :toaster="{ position: 'top-center', duration: 2000 }"
  >
    <UTheme
      :ui="{
        button: {
          base: 'cursor-pointer',
        },
      }"
    >
      <AppShell />
    </UTheme>
  </UApp>
</template>

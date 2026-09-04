<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useColorMode } from "@vueuse/core";

import { useLanguageStore } from "@/stores/language-store";

/**
 * 偏好配置抽屉（对齐 React 端 Header 操作区的 ConfigDrawer 位置）。
 * M0 提供：主题模式 + 语言两项；React 端的侧栏变体 / 布局模式等
 * 偏好由 Nuxt UI Dashboard 套件内置行为接管，M3 再评审剩余项。
 */
const open = ref(false);
const { t } = useI18n();
const languageStore = useLanguageStore();

const colorMode = useColorMode();

const themeOptions = computed<
  { label: string; value: "auto" | "light" | "dark" }[]
>(() => [
  { label: t("layout.prefs.themeMode.system"), value: "auto" },
  { label: t("layout.prefs.themeMode.light"), value: "light" },
  { label: t("layout.prefs.themeMode.dark"), value: "dark" },
]);

const languageOptions = computed(() => [
  { label: t("common.language.zhCN"), value: "zh-CN" },
  { label: t("common.language.en"), value: "en" },
]);
</script>

<template>
  <USlideover v-model:open="open" :title="t('layout.prefs.title')">
    <UButton
      aria-label="Preferences"
      color="neutral"
      icon="i-lucide-settings-2"
      variant="ghost"
    />

    <template #body>
      <div class="flex flex-col gap-6">
        <UFormField :label="t('layout.prefs.themeMode.label')">
          <USelect
            v-model="colorMode"
            :items="themeOptions"
            class="w-full"
            value-key="value"
          />
        </UFormField>

        <UFormField :label="t('common.language.label')">
          <USelect
            :model-value="languageStore.locale"
            :items="languageOptions"
            class="w-full"
            value-key="value"
            @update:model-value="
              (value) => languageStore.changeLanguage(value as 'zh-CN' | 'en')
            "
          />
        </UFormField>
      </div>
    </template>
  </USlideover>
</template>

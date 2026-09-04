<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { SUPPORTED_LANGUAGES, type Language } from "@/i18n/config";
import { useLanguageStore } from "@/stores/language-store";

/** 语言切换（zh-CN / en）：文案包从 React 端同步，键一致。 */
const { t } = useI18n();
const languageStore = useLanguageStore();

const languageLabels: Record<Language, string> = {
  "zh-CN": "common.language.zhCN",
  en: "common.language.en",
};

const items = computed(() => [
  SUPPORTED_LANGUAGES.map((language) => ({
    label: t(languageLabels[language]),
    active: languageStore.locale === language,
    onSelect: () => {
      languageStore.changeLanguage(language);
    },
  })),
]);
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      aria-label="Language"
      color="neutral"
      icon="i-lucide-languages"
      variant="ghost"
    />
  </UDropdownMenu>
</template>

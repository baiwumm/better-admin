import { ref } from "vue";
import { defineStore } from "pinia";

import {
  isLanguage,
  LANGUAGE_STORAGE_KEY,
  type Language,
  readStoredLanguage,
} from "@/i18n/config";
import { setGlobalLanguage } from "@/i18n";

/**
 * 语言偏好 store：localStorage 持久化（key: better-admin:language），
 * 切换时同步 vue-i18n 全局 locale（组件内 $t / useI18n 响应式更新）。
 */
export const useLanguageStore = defineStore("language", () => {
  const locale = ref<Language>(readStoredLanguage());

  function changeLanguage(next: Language) {
    if (!isLanguage(next)) return;

    locale.value = next;
    setGlobalLanguage(next);

    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // 存储不可用时语言偏好仅会话内生效
    }
  }

  return { locale, changeLanguage };
});

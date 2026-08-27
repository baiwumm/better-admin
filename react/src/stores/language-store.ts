import { create } from "zustand";

import { i18n, isLanguage, type Language } from "@/i18n";
import { useTabsStore } from "@/stores/tabs-store";

const LANGUAGE_KEY = "better-admin-language";

function readLanguageFromStorage(): Language {
  if (typeof window === "undefined") return "zh-CN";

  const stored = localStorage.getItem(LANGUAGE_KEY);

  return isLanguage(stored) ? stored : "zh-CN";
}

function writeLanguageToStorage(language: Language): void {
  localStorage.setItem(LANGUAGE_KEY, language);
}

interface LanguageState {
  /** 当前语言（简体中文默认 / English） */
  language: Language;
  /**
   * 切换语言：store + localStorage + i18next.changeLanguage +
   * html lang 联动，并作废多标签页的旧语言标题快照。
   */
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()((set) => ({
  language: readLanguageFromStorage(),

  setLanguage: (language) => {
    // 非法值收窄为默认语言
    const valid = isLanguage(language) ? language : "zh-CN";

    set({ language: valid });
    writeLanguageToStorage(valid);
    void i18n.changeLanguage(valid);
    document.documentElement.lang = valid;
    // 标签栏缓存的是上一语言的标题快照，直接清空，
    // tags-bar 会回退到实时菜单名称（已是新语言）渲染
    useTabsStore.getState().clearTabsCache();
  },
}));

/**
 * 渲染前同步初始化（main.tsx 在 createRoot 前调用，防首屏闪烁）：
 * 读 localStorage（非法值收窄 zh-CN）→ 同步 store → 设置 <html lang>，
 * 并把结果返回给 initI18n 作为启动语言。翻译实例本身由 main.tsx await
 * initI18n() 初始化，本函数不做异步操作。
 */
export function initLanguage(): Language {
  const stored = readLanguageFromStorage();

  document.documentElement.lang = stored;

  // store 的初始值经同一读取函数已与 storage 一致，此处仅为幂等校正
  if (useLanguageStore.getState().language !== stored) {
    useLanguageStore.setState({ language: stored });
  }

  return stored;
}

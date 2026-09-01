import { create } from "zustand";

import { i18n, isLanguage, type Language } from "@/i18n/config";

const LANGUAGE_KEY = "better-admin-language";
const LANGUAGE_COOKIE = "better-admin-language";
const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * 从 Cookie 读取语言（非 httpOnly，浏览器端 JS 可读）。
 * 服务端在根 layout 经 next/headers 读取同一 Cookie 注入启动语言，
 * 客户端 store 初始化时读取同一值——两端首帧渲染语言一致，无水合偏差。
 */
function readLanguageFromCookie(): Language | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${LANGUAGE_COOKIE}=([^;]+)`),
  );

  if (!match) return null;

  return isLanguage(decodeURIComponent(match[1]))
    ? (decodeURIComponent(match[1]) as Language)
    : null;
}

function readLanguageFromStorage(): Language {
  if (typeof window === "undefined") return "zh-CN";

  const stored = readLanguageFromCookie();

  if (stored) return stored;

  const saved = localStorage.getItem(LANGUAGE_KEY);

  return isLanguage(saved) ? saved : "zh-CN";
}

function writeLanguageToStorage(language: Language): void {
  localStorage.setItem(LANGUAGE_KEY, language);
  // 双写 Cookie：服务端根 layout 据此注入启动语言（localStorage 服务端不可见）
  document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(language)}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE}; samesite=lax`;
}

interface LanguageState {
  /** 当前语言（简体中文默认 / English） */
  language: Language;
  /**
   * 切换语言：store + localStorage + Cookie 双写 + i18next.changeLanguage +
   * html lang 联动。
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
    // 多标签页缓存的是上一语言的标题快照，切换后需作废；
    // 待 tabs-store（N2 布局期）落地后接入 clearTabsCache 联动
  },
}));

/**
 * 供服务端（根 layout RSC）读取启动语言的 Cookie 名单例，
 * 客户端读写函数使用同一常量，避免命名漂移。
 */
export const LANGUAGE_COOKIE_NAME = LANGUAGE_COOKIE;

/** 支持的语言列表（有顺序，语言切换菜单按此渲染）。 */
export const SUPPORTED_LANGUAGES = ["zh-CN", "en"] as const;

export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const FALLBACK_LANGUAGE: Language = "zh-CN";

/** 语言偏好的 localStorage 键（language-store 与防闪烁脚本共用）。 */
export const LANGUAGE_STORAGE_KEY = "better-admin:language";

export function isLanguage(value: unknown): value is Language {
  return (
    typeof value === "string" &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

/** 从 localStorage 读取持久化语言（i18n 初始化用，避免 store ↔ i18n 循环依赖）。 */
export function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);

    return isLanguage(stored) ? stored : FALLBACK_LANGUAGE;
  } catch {
    return FALLBACK_LANGUAGE;
  }
}

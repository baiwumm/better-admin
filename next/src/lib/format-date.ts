/**
 * 按语言环境格式化日期时间（长日期 + 短时间）：
 * zh-CN →「2026年9月3日 10:46」，en →「September 3, 2026 at 10:46」。
 * locale 由调用方从 i18n 当前语言传入，保持函数纯净可复用。
 */
export function formatDateTime(value: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

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

/**
 * 相对时间格式化：根据与当前时间的差值输出「3 分钟前 / in 2 hours」。
 * 适用于公告列表与详情中的轻量时间提示。
 */
export function formatRelativeTime(
  value: string | Date,
  locale: string,
  now = new Date(),
): string {
  const target = new Date(value);
  const diffMs = target.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  if (absMs < 45_000) {
    return locale.startsWith("zh") ? "刚刚" : "just now";
  }

  const intervals: Array<{
    unit: Intl.RelativeTimeFormatUnit;
    ms: number;
  }> = [
    { unit: "year", ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: "month", ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: "week", ms: 7 * 24 * 60 * 60 * 1000 },
    { unit: "day", ms: 24 * 60 * 60 * 1000 },
    { unit: "hour", ms: 60 * 60 * 1000 },
    { unit: "minute", ms: 60 * 1000 },
  ];

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  for (const { unit, ms } of intervals) {
    if (absMs >= ms) {
      return formatter.format(Math.round(diffMs / ms), unit);
    }
  }

  return formatter.format(Math.round(diffMs / 1000), "second");
}

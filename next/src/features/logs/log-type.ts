"use client";

import type { LogType } from "@/lib/api-types";
import type { DictItem } from "@/lib/api-types";

/**
 * 日志类型元信息：契约四枚举（operation/login/api/error）的类型值集合、
 * Chip 颜色映射与显示名解析。
 *
 * 显示名以字典管理（log_type 类型）为真源：字典项 i18nKey 翻译命中优先，
 * 回退字典 label；字典不可用（当前用户无字典 SEARCH 位 / 加载失败）时
 * 回退内置 dict.log_type.* i18n 文案，最终回退原始值。
 */

export const LOG_TYPE_VALUES = [
  "operation",
  "login",
  "api",
  "error",
] as const satisfies readonly LogType[];

const LOG_TYPE_VALUE_SET = new Set<string>(LOG_TYPE_VALUES);

export function isLogType(value: string): value is LogType {
  return LOG_TYPE_VALUE_SET.has(value);
}

/** 日志类型 → Chip 颜色（未知类型回退 default 中性色） */
export function logTypeColor(
  type: string,
): "accent" | "danger" | "default" | "success" {
  switch (type) {
    case "login":
      return "accent";
    case "error":
      return "danger";
    case "api":
      return "success";
    default:
      return "default";
  }
}

/** 类型显示名：字典 i18nKey 翻译 → 字典 label → 内置 i18n → 原始值 */
export function logTypeLabel(
  type: string,
  dictItems: DictItem[] | undefined,
  t: (key: string) => string,
): string {
  const item = dictItems?.find((d) => d.value === type);

  if (item?.i18nKey) {
    const translated = t(item.i18nKey);

    if (translated !== item.i18nKey) return translated;
  }
  if (item) return item.label;

  const builtinKey = `dict.log_type.${type}`;
  const builtin = t(builtinKey);

  return builtin !== builtinKey ? builtin : type;
}

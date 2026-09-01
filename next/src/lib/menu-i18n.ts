import type { MenuNode } from "@/lib/api-types";

/** 翻译函数形态（与 useTranslation 的 t 兼容的最小子集）。 */
export type Translate = (key: string) => string;

/**
 * 菜单显示名：后端下发 i18nKey 时按语言包取词，否则回退数据库 label 原文。
 * t 由调用方传入（useTranslation 的 t），语言切换时组件自动重渲染。
 */
export function getMenuLabel(
  node: Pick<MenuNode, "i18nKey" | "label">,
  t: Translate,
): string {
  return node.i18nKey ? t(node.i18nKey) : node.label;
}

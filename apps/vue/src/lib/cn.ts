import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 条件拼接 + Tailwind 冲突去重的 className 工具（shadcn 生态惯例）。
 * `@nuxt/ui` v4 不向业务代码导出 `cn`，故本端自带（plan-dashboard-playground.md §7）。
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Description } from "@heroui/react";
import { TriangleAlert } from "lucide-react";

/**
 * 错误状态占位（数据加载失败、请求异常等场景统一使用，与 EmptyContent
 * 同构但语义独立）：居中「警示图标 + 标题 +（原因说明 + 操作）」。
 */
export interface ErrorContentProps {
  /** 图标（默认 TriangleAlert，danger 色） */
  icon?: LucideIcon;
  /** 主文案（如「数据加载失败」） */
  title: ReactNode;
  /** 具体原因（如本地化的后端错误信息） */
  description?: ReactNode;
  /** 操作区（如「重试」按钮） */
  action?: ReactNode;
  className?: string;
}

export function ErrorContent({
  icon: Icon = TriangleAlert,
  title,
  description,
  action,
  className,
}: ErrorContentProps) {
  return (
    <div
      className={
        className ??
        "flex flex-col items-center justify-center gap-2 py-20 text-muted"
      }
    >
      <Icon aria-hidden className="size-10 text-danger" />
      <Description className="font-medium text-foreground">{title}</Description>
      {description && (
        <Description className="max-w-80 text-center">
          {description}
        </Description>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

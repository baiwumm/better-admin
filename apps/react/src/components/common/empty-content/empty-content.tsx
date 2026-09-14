import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Description, cn } from "@heroui/react";
import { Inbox } from "lucide-react";

import { useTranslation } from "@/i18n";

export interface EmptyContentProps {
  /** 图标（默认 Inbox） */
  icon?: LucideIcon;
  /** 主文案（默认「暂无数据」） */
  title?: ReactNode;
  /** 次要说明（如具体错误原因），主文案下方弱化展示 */
  description?: ReactNode;
  /** 操作区（如「重试」按钮），说明文案下方 */
  action?: ReactNode;
  className?: string;
}

/**
 * 空状态占位（表格 renderEmptyState / 弹窗空数据 / 加载失败等场景统一使用）：
 * 居中「图标 + 主文案 +（说明 + 操作）」。不传 props 即表格默认空数据样式。
 */
export function EmptyContent({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyContentProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-20 text-muted",
        className,
      )}
    >
      <Icon aria-hidden className="size-10" />
      <Description>{title ?? t("common.datatable.empty")}</Description>
      {description && (
        <Description className="max-w-80 text-center">
          {description}
        </Description>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

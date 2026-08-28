import { Description } from "@heroui/react";
import { Inbox } from "lucide-react";

import { useTranslation } from "@/i18n";

/**
 * 空数据占位（表格 renderEmptyState 等场景统一使用）：
 * 居中图标 + 「暂无数据」文案。
 */
export function EmptyContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-muted">
      <Inbox aria-hidden className="size-10" />
      <Description>{t("common.datatable.empty")}</Description>
    </div>
  );
}

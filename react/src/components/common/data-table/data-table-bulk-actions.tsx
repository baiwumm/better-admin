import type { RowData } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { AppTable } from "./table-types";

import { Button, Chip, Separator, cn } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { useTranslation } from "@/i18n";

export interface DataTableBulkActionsProps<TData extends RowData> {
  table: AppTable<TData>;
  /** 选中后展示的操作按钮（如「批量删除」，由消费方做权限门控） */
  children?: ReactNode;
  className?: string;
}

/** 进/退场动画时长（ms）：与 transition-all duration-200 对齐 */
const EXIT_ANIMATION_MS = 200;

/**
 * 批量操作悬浮条（胶囊形 ActionBar）：行选中数 > 0 时固定显示在底部居中。
 * 布局对齐 HeroUI Action Bar 模式：计数徽章 | 操作插槽 | 清空按钮；
 * 进场自底部淡入上滑，退场向下淡出滑出（尊重 prefers-reduced-motion）。
 * Esc 键清空选择。
 */
export function DataTableBulkActions<TData extends RowData>({
  table,
  children,
  className,
}: DataTableBulkActionsProps<TData>) {
  const { t } = useTranslation();
  const selectedCount = table.getSelectedRowModel().rows.length;
  /** mounted：延长退场动画期的渲染；visible：驱动过渡类切换 */
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const exitTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (selectedCount > 0) {
      window.clearTimeout(exitTimer.current);
      setMounted(true);
      // 先以隐藏态插入 DOM，下一帧再切入可见态，保证 CSS 过渡生效
      const raf = requestAnimationFrame(() => setVisible(true));

      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    exitTimer.current = window.setTimeout(
      () => setMounted(false),
      EXIT_ANIMATION_MS,
    );

    return () => window.clearTimeout(exitTimer.current);
  }, [selectedCount]);

  useEffect(() => {
    if (selectedCount === 0) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        table.resetRowSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCount, table]);

  if (!mounted) return null;

  const hasActions = children != null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
      <div
        aria-live="polite"
        className={cn(
          "pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-overlay py-1.5 ps-3 pe-1.5 shadow-lg transition-all duration-200 ease-out motion-reduce:transition-none",
          visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
          className,
        )}
      >
        <span className="sr-only">
          {t("common.datatable.selected", { count: selectedCount })}
        </span>
        <Chip className="mx-1 shrink-0" size="sm">
          {selectedCount}
        </Chip>
        {hasActions && (
          <Separator className="h-5 self-center" orientation="vertical" />
        )}
        {children}
        {hasActions && (
          <Separator className="h-5 self-center" orientation="vertical" />
        )}
        <Button
          isIconOnly
          aria-label={t("common.datatable.clearSelection")}
          size="sm"
          variant="ghost"
          onPress={() => table.resetRowSelection()}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

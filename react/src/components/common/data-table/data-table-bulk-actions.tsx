type TanStackTable<TData extends RowData> = TanStackTableBase<TData>;

import type { ReactNode } from "react";
import type { RowData } from "@tanstack/react-table";
import type { LegacyReactTable as TanStackTableBase } from "@tanstack/react-table/legacy";

import { Button, Separator, Typography, cn } from "@heroui/react";
import { useEffect } from "react";
import { X } from "lucide-react";

import { useTranslation } from "@/i18n";

export interface DataTableBulkActionsProps<TData extends RowData> {
  table: TanStackTable<TData>;
  /** 选中后展示的操作按钮（如「批量删除」，由消费方做权限门控） */
  children?: ReactNode;
  className?: string;
}

/**
 * 批量操作悬浮条：行选中数 > 0 时固定显示在底部居中，
 * 展示已选数量、清空按钮与自定义操作插槽；无选中时不渲染。
 * Esc 键清空选择。
 */
export function DataTableBulkActions<TData extends RowData>({
  table,
  children,
  className,
}: DataTableBulkActionsProps<TData>) {
  const { t } = useTranslation();
  const selectedCount = table.getSelectedRowModel().rows.length;

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

  if (selectedCount === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-overlay px-4 py-2 shadow-lg",
          className,
        )}
      >
        <Typography className="font-medium" type="body-sm">
          {t("common.datatable.selected", { count: selectedCount })}
        </Typography>
        <Button
          isIconOnly
          aria-label={t("common.datatable.clearSelection")}
          size="sm"
          variant="ghost"
          onPress={() => table.resetRowSelection()}
        >
          <X className="size-4" />
        </Button>
        {children ? (
          <>
            <Separator className="h-6" orientation="vertical" />
            {children}
          </>
        ) : null}
      </div>
    </div>
  );
}

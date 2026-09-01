"use client";

import type { ReactNode } from "react";

import { Button, cn } from "@heroui/react";
import { Plus } from "lucide-react";

import { useTranslation } from "@/i18n";
import { useHasPermissionKey } from "@/hooks/use-permissions";

export interface PageHeaderProps {
  /** 页面标题（i18n key） */
  titleKey: string;
  /** 页面描述（i18n key，可选） */
  descriptionKey?: string;
  /** 右侧操作区插槽（新增按钮之外的追加动作） */
  actions?: ReactNode;
  /** 是否显示「新增」按钮 */
  showAddButton?: boolean;
  onAdd?: () => void;
  /** 「新增」按钮所需权限点 value（由 GET /permissions 下发，如 "ADD"）；
   *  传了则按当前用户权限自动显隐，不传则不做门控 */
  addPermissionKey?: string;
  className?: string;
}

/**
 * 页内头部：「标题 + 描述」居左，「新增」按钮与自定义操作居右。
 * 标题/描述走 i18n key（由调用方传入，组件内统一取词）。
 */
export function PageHeader({
  titleKey,
  descriptionKey,
  actions,
  showAddButton = false,
  onAdd,
  addPermissionKey,
  className,
}: PageHeaderProps) {
  const { t } = useTranslation();
  const permitted = useHasPermissionKey(addPermissionKey);
  const showAdd =
    showAddButton &&
    Boolean(onAdd) &&
    (addPermissionKey === undefined || permitted);

  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="text-xl font-semibold leading-tight">{t(titleKey)}</h2>
        {descriptionKey && (
          <p className="mt-1 text-sm text-muted">{t(descriptionKey)}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {showAdd && (
          <Button onPress={onAdd}>
            <Plus className="size-4" />
            {t("common.pageHeader.add")}
          </Button>
        )}
      </div>
    </div>
  );
}

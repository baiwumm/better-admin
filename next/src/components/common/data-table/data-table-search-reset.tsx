"use client";

import { Button, Spinner } from "@heroui/react";
import { RotateCcw, Search } from "lucide-react";

import { useMenuPermissions } from "@/hooks/use-permissions";
import { useTranslation } from "@/i18n";

/**
 * DataTable 工具栏「搜索 / 重置」按钮对（全局共用）。
 *
 * - 位掩码门控内置：搜索按钮消费 SEARCH 位、重置按钮消费 RESET 位，
 *   两个位都缺失时整体不渲染（显隐策略与操作按钮一致）；
 *   「重置」是纯前端清筛选动作，RESET 位按 v1.3 约定仅控制显隐，不挂后端守卫；
 * - searchDirty / canReset / isFetching 由页面按各自列表语义传入
 *   （服务端分页页传请求态，纯本地过滤页可省略 isFetching）。
 * - 自动读取当前菜单的 userPermissions 进行精确权限判断，
 *   避免使用用户全局权限（可能包含其他菜单的权限位）。
 */

interface DataTableSearchResetProps {
  /** 存在未提交的搜索条件（false 时搜索按钮禁用；纯本地过滤页恒传 true） */
  searchDirty: boolean;
  /** 存在可清除的已生效条件（false 时重置按钮禁用） */
  canReset: boolean;
  /** 列表请求进行中：搜索按钮转 pending，两按钮均禁用 */
  isFetching?: boolean;
  onSearch: () => void;
  onReset: () => void;
}

export function DataTableSearchReset({
  searchDirty,
  canReset,
  isFetching = false,
  onSearch,
  onReset,
}: DataTableSearchResetProps) {
  const { t } = useTranslation();
  const { canSearch, canReset: canResetByPermission } = useMenuPermissions();

  if (!canSearch && !canResetByPermission) return null;

  return (
    <>
      {canSearch && (
        <Button
          isDisabled={!searchDirty || isFetching}
          isPending={isFetching}
          size="sm"
          onPress={onSearch}
        >
          {({ isPending }) =>
            isPending ? (
              <>
                <Spinner color="current" size="sm" />
                {t("common.datatable.search")}
              </>
            ) : (
              <>
                <Search className="size-4" />
                {t("common.datatable.search")}
              </>
            )
          }
        </Button>
      )}
      {canResetByPermission && (
        <Button
          isDisabled={!canReset || isFetching}
          size="sm"
          variant="tertiary"
          onPress={onReset}
        >
          <RotateCcw className="size-4" />
          {t("common.datatable.reset")}
        </Button>
      )}
    </>
  );
}

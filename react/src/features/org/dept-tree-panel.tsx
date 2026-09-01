import type { ReactNode } from "react";
import type { DeptSortItem, DeptTreeNode } from "@/lib/api-types";

import { Skeleton, Spinner, Surface, Typography } from "@heroui/react";

import { DeptTree } from "./dept-tree";

import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { useTranslation } from "@/i18n";

/**
 * 组织树面板（组织管理 / 人员通讯录共用）：标题 + 计数 + 头部操作区 +
 * 加载骨架屏 + 空态 + DeptTree，两页左栏样式与间距单点维护。
 *
 * - 骨架屏与树行同形（展开箭头 + 名称条，逐行缩进模拟层级）；
 * - canReorder / onReorder 仅组织管理使用（同级拖拽排序）；
 * - headerAction / emptyAction 为插槽：头部操作区（如组织管理的「+」按钮）
 *   与空态操作区（如「新增顶级组织」按钮）由页面按各自权限语义传入。
 */
export interface DeptTreePanelProps {
  nodes: DeptTreeNode[];
  isLoading: boolean;
  /** 有数据时的刷新遮罩（增删改/排序后 refetch 全程可见，数据保留不闪白） */
  isFetching?: boolean;
  selectedId: string | null;
  onSelect: (node: DeptTreeNode) => void;
  /** 同级拖拽排序（可选；通讯录不启用） */
  canReorder?: boolean;
  onReorder?: (items: DeptSortItem[]) => void;
  /** 头部右侧自定义操作区（插槽） */
  headerAction?: ReactNode;
  /** 空态主文案（如「暂无组织」） */
  emptyTitle: ReactNode;
  /** 空态操作区（插槽，可选） */
  emptyAction?: ReactNode;
}

export function DeptTreePanel({
  nodes,
  isLoading,
  isFetching = false,
  selectedId,
  onSelect,
  canReorder = false,
  onReorder,
  headerAction,
  emptyTitle,
  emptyAction,
}: DeptTreePanelProps) {
  const { t } = useTranslation();

  return (
    <Surface className="flex flex-col gap-3 rounded-3xl p-4">
      <div className="flex items-center justify-between gap-2">
        <Typography className="font-medium" type="body-sm">
          {t("features.depts.tree.title")}
          <span className="ms-1 text-muted">({nodes.length})</span>
        </Typography>
        {headerAction}
      </div>

      {isLoading ? (
        // 骨架屏：与树行同形的占位（展开箭头 + 名称条，逐行缩进模拟层级）
        <div className="flex flex-col gap-1">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-2xl py-2"
              style={{ paddingInlineStart: (index % 3) * 16 + 8 }}
            >
              <Skeleton className="size-3.5 rounded" />
              <Skeleton
                className="h-3.5 rounded-md"
                style={{ width: `${52 - (index % 3) * 8}%` }}
              />
            </div>
          ))}
        </div>
      ) : nodes.length === 0 ? (
        <EmptyContent
          action={emptyAction}
          className="flex flex-col items-center justify-center gap-2 py-8 text-muted"
          title={emptyTitle}
        />
      ) : (
        <div className="relative">
          {/* 树刷新遮罩：增删改/排序后 refetch 全程可见（数据保留不闪白） */}
          {isFetching && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-default/30 backdrop-blur-[1px] rounded-3xl">
              <Spinner size="sm" />
            </div>
          )}
          <DeptTree
            canReorder={canReorder}
            nodes={nodes}
            selectedId={selectedId}
            onReorder={onReorder ?? (() => {})}
            onSelect={onSelect}
          />
        </div>
      )}
    </Surface>
  );
}

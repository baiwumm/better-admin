import type { DeptTreeNode } from "@/lib/api-types";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@heroui/react";
import { ChevronRight, GripVertical } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useTranslation } from "@/i18n";

/**
 * 组织树（左栏）：递归渲染 DeptTreeNode，支持展开/收起与同级拖拽排序。
 *
 * - 展开状态用 Set | null 表达（null = 全展开默认态，随数据动态生效）；
 * - 嵌套的每组兄弟节点各包一层 SortableContext，共享根部 DndContext；
 *   拖拽结束由根部统一回调整组新顺序（整组重编号 sort = len-1-idx，
 *   数字越大越靠前），经扁平映射定位 active 所属兄弟组后由页面提交后端；
 * - 停用组织整行置灰；拖拽把手仅 canReorder 时渲染。
 */

export interface DeptTreeProps {
  nodes: DeptTreeNode[];
  selectedId: string | null;
  canReorder: boolean;
  onSelect: (node: DeptTreeNode) => void;
  /** 同级拖拽结束：整组按新顺序提交（含未移动的兄弟节点，保证编号一致） */
  onReorder: (
    items: { id: string; parentId: string | null; sort: number }[],
  ) => void;
}

interface TreeItemProps {
  node: DeptTreeNode;
  depth: number;
  selectedId: string | null;
  expanded: Set<string> | null;
  canReorder: boolean;
  onSelect: (node: DeptTreeNode) => void;
  onToggle: (id: string) => void;
}

function collectIds(nodes: DeptTreeNode[], acc: string[] = []): string[] {
  for (const node of nodes) {
    acc.push(node.id);
    collectIds(node.children, acc);
  }

  return acc;
}

function TreeItem({
  node,
  depth,
  selectedId,
  expanded,
  canReorder,
  onSelect,
  onToggle,
}: TreeItemProps) {
  const { t } = useTranslation();
  const hasChildren = node.children.length > 0;
  // null = 全展开（默认态）
  const isExpanded = expanded === null || expanded.has(node.id);
  const isSelected = node.id === selectedId;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id, disabled: !canReorder });

  return (
    <div
      ref={setNodeRef}
      className={cn("mb-1", isDragging && "z-10 opacity-80")}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div
        className={cn(
          "group flex w-full cursor-pointer items-center gap-1 rounded-2xl py-2 pe-2 text-start transition-colors",
          "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
          isSelected ? "bg-default" : "hover:bg-default/60",
          node.status === "disabled" && "text-muted",
        )}
        role="button"
        style={{ paddingInlineStart: depth * 16 + 8 }}
        tabIndex={0}
        onClick={() => onSelect(node)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(node);
          }
        }}
      >
        {canReorder && (
          <button
            aria-label={t("features.depts.tree.dragHandle")}
            className="cursor-grab touch-none rounded p-0.5 text-muted opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
            type="button"
            // 点击把手（未达拖拽阈值）不触发整行的展开/收起
            onClick={(event) => event.stopPropagation()}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </button>
        )}
        <button
          aria-label={
            isExpanded
              ? t("features.depts.tree.collapse")
              : t("features.depts.tree.expand")
          }
          className={cn(
            "rounded p-0.5 text-muted transition-colors hover:text-default-foreground",
            !hasChildren && "invisible",
          )}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
        >
          {/* 单箭头旋转过渡（展开指向下 / 收起指向右），替代双图标硬切换 */}
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform duration-200 ease-out",
              isExpanded && "rotate-90",
            )}
          />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm">{node.name}</span>
        {node.status === "disabled" && (
          <span className="shrink-0 text-xs text-muted">
            {t("features.depts.status.disabled")}
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <SortableContext
          items={node.children.map((child) => child.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* dept-tree__children：展开入场动画（见 src/styles/dept-tree.css） */}
          <div className="dept-tree__children">
            {node.children.map((child) => (
              <TreeItem
                key={child.id}
                canReorder={canReorder}
                depth={depth + 1}
                expanded={expanded}
                node={child}
                selectedId={selectedId}
                onSelect={onSelect}
                onToggle={onToggle}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
}

export function DeptTree({
  nodes,
  selectedId,
  canReorder,
  onSelect,
  onReorder,
}: DeptTreeProps) {
  const [expanded, setExpanded] = useState<Set<string> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // 扁平映射：id → { parentId, siblings }，供拖拽结束定位 active 所属兄弟组
  const siblingMap = useMemo(() => {
    const map = new Map<
      string,
      { parentId: string | null; siblings: DeptTreeNode[] }
    >();

    const walk = (list: DeptTreeNode[], parentId: string | null) => {
      for (const node of list) {
        map.set(node.id, { parentId, siblings: list });
        walk(node.children, node.id);
      }
    };

    walk(nodes, null);

    return map;
  }, [nodes]);

  const handleToggle = useCallback(
    (id: string) => {
      setExpanded((prev) => {
        if (prev === null) {
          // 从「全展开」切换到显式集合：先收录全部节点 id 再移除目标
          return new Set(collectIds(nodes).filter((nodeId) => nodeId !== id));
        }

        const next = new Set(prev);

        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }

        return next;
      });
    },
    [nodes],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const context = siblingMap.get(String(active.id));

      if (!context) return;

      const ids = context.siblings.map((sibling) => sibling.id);
      const from = ids.indexOf(String(active.id));
      const to = ids.indexOf(String(over.id));

      if (from < 0 || to < 0) return;

      const next = arrayMove(context.siblings, from, to);

      // 数字越大越靠前：新顺序第 idx 个的 sort = len-1-idx，整组重编号
      onReorder(
        next.map((sibling, idx) => ({
          id: sibling.id,
          parentId: context.parentId,
          sort: next.length - 1 - idx,
        })),
      );
    },
    [siblingMap, onReorder],
  );

  return (
    <DndContext
      collisionDetection={closestCenter}
      sensors={sensors}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={nodes.map((node) => node.id)}
        strategy={verticalListSortingStrategy}
      >
        {nodes.map((node) => (
          <TreeItem
            key={node.id}
            canReorder={canReorder}
            depth={0}
            expanded={expanded}
            node={node}
            selectedId={selectedId}
            onSelect={onSelect}
            onToggle={handleToggle}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}

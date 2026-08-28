import type { RowData } from "@tanstack/react-table";
import type { ColumnVisibilityState } from "@tanstack/react-table";
import type { DragEndEvent } from "@dnd-kit/core";
import type { AppTable } from "./table-types";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Checkbox, Popover, cn } from "@heroui/react";
import { GripVertical, RotateCcw, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/i18n";

/**
 * 列设置面板：可见性勾选 + 拖拽排序（dnd-kit headless 逻辑 + HeroUI 渲染）。
 *
 * 参与面板的列 = 可隐藏列（`getCanHide()`）；功能性列（行选择、行操作等
 * `enableHiding: false` 的列）不进面板，拖拽重排时保持默认位置（首/尾固定）。
 *
 * 持久化 storage key 规则：`column-setting:{userId}:{routePath}`
 * （按用户 + 路由路径共享，不含查询参数），存 `{ hidden, order }`；
 * 兼容 v1 旧格式（纯字符串数组，仅隐藏列）。
 */

export function buildColumnSettingKey(userId: string, routePath: string) {
  return `column-setting:${userId}:${routePath}`;
}

/** 持久化结构：隐藏列 id + 可隐藏列的展示顺序 */
interface ColumnSettingStore {
  hidden: string[];
  order: string[];
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

/** 读取持久化列设置（schema 校验 + v1 旧格式兼容） */
function readColumnSetting(storageKey: string): ColumnSettingStore {
  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) return { hidden: [], order: [] };

    const parsed: unknown = JSON.parse(raw);

    // v1 旧格式：字符串数组（仅隐藏列）
    if (isStringArray(parsed)) return { hidden: parsed, order: [] };

    if (
      parsed &&
      typeof parsed === "object" &&
      "hidden" in parsed &&
      "order" in parsed &&
      isStringArray(parsed.hidden) &&
      isStringArray(parsed.order)
    ) {
      return { hidden: parsed.hidden, order: parsed.order };
    }

    return { hidden: [], order: [] };
  } catch {
    return { hidden: [], order: [] };
  }
}

/**
 * 把面板内的可隐藏列顺序合并回全量 leaf 列顺序：
 * 不可隐藏的功能性列保持原位，可隐藏列按面板顺序依次占据其默认槽位。
 */
function mergeColumnOrder(
  allIds: string[],
  hideableOrder: string[],
  isHideable: (id: string) => boolean,
): string[] {
  const queue = [...hideableOrder];

  return allIds.map((id) => (isHideable(id) ? (queue.shift() ?? id) : id));
}

export interface DataTableViewOptionsProps<TData extends RowData> {
  table: AppTable<TData>;
  /** 持久化 key（buildColumnSettingKey 生成）；不传则不持久化 */
  storageKey?: string;
  className?: string;
}

export function DataTableViewOptions<TData extends RowData>({
  table,
  storageKey,
  className,
}: DataTableViewOptionsProps<TData>) {
  const { t } = useTranslation();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const allLeafColumns = table.getAllLeafColumns();
  const allLeafIds = allLeafColumns.map((column) => column.id);
  const hideableColumns = allLeafColumns.filter((column) =>
    column.getCanHide(),
  );
  const hideableIds = hideableColumns.map((column) => column.id);
  const hideableIdSet = new Set(hideableIds);
  const isHideable = (id: string) => hideableIdSet.has(id);

  /** 面板内的列展示顺序（仅可隐藏列；初始化为列定义默认顺序） */
  const [orderIds, setOrderIds] = useState<string[]>(hideableIds);
  const [hasRestored, setHasRestored] = useState(false);

  // 挂载时恢复持久化的列设置（仅一次）：隐藏列 + 顺序
  useEffect(() => {
    if (!storageKey || hideableColumns.length === 0) return;
    const store = readColumnSetting(storageKey);

    if (store.hidden.length > 0) {
      const hiddenSet = new Set(store.hidden);
      const visibility: ColumnVisibilityState = {};

      for (const column of hideableColumns) {
        visibility[column.id] = !hiddenSet.has(column.id);
      }
      table.setColumnVisibility(visibility);
    }

    if (store.order.length > 0) {
      // 过滤掉列定义中已删除的 id；新增列按默认顺序追加到末尾
      const valid = store.order.filter((id) => hideableIdSet.has(id));
      const next = [
        ...valid,
        ...hideableIds.filter((id) => !valid.includes(id)),
      ];

      setOrderIds(next);
      table.setColumnOrder(mergeColumnOrder(allLeafIds, next, isHideable));
    }
    setHasRestored(true);
    // 仅挂载时恢复一次；依赖按 eslint 要求最小化
  }, [storageKey]);

  // 变更后持久化：全默认（无隐藏且顺序未调整）时不落存储
  useEffect(() => {
    if (!storageKey || !hasRestored || hideableColumns.length === 0) return;
    const hidden = hideableColumns
      .filter((column) => !column.getIsVisible())
      .map((column) => column.id);
    const orderChanged = orderIds.join("\u0000") !== hideableIds.join("\u0000");

    try {
      if (hidden.length === 0 && !orderChanged) {
        localStorage.removeItem(storageKey);
      } else {
        const store: ColumnSettingStore = { hidden, order: orderIds };

        localStorage.setItem(storageKey, JSON.stringify(store));
      }
    } catch {
      // 存储不可用时忽略（列设置退化为会话内生效）
    }
  }, [
    hasRestored,
    storageKey,
    orderIds.join("\u0000"),
    JSON.stringify(table.state.columnVisibility),
  ]);

  if (hideableColumns.length === 0) return null;

  const handleVisibleChange = (columnId: string, visible: boolean) => {
    const visibility: ColumnVisibilityState = {};

    for (const column of hideableColumns) {
      visibility[column.id] =
        column.id === columnId ? visible : column.getIsVisible();
    }
    table.setColumnVisibility(visibility);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = orderIds.indexOf(String(active.id));
    const newIndex = orderIds.indexOf(String(over.id));

    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(orderIds, oldIndex, newIndex);

    setOrderIds(next);
    table.setColumnOrder(mergeColumnOrder(allLeafIds, next, isHideable));
  };

  const resetColumns = () => {
    setOrderIds(hideableIds);
    table.setColumnVisibility({});
    table.setColumnOrder([]);
    if (storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // 忽略存储异常
      }
    }
  };

  const columnLabel = (id: string) => {
    const column = table.getColumn(id);

    if (!column) return id;
    const header = column.columnDef.header;

    return typeof header === "string" ? header : id;
  };

  return (
    <Popover>
      <Button className={className} size="sm" variant="outline">
        <Settings2 />
        {t("common.datatable.columnSettings")}
      </Button>
      <Popover.Content className="w-72">
        <Popover.Dialog>
          <div className="flex items-center justify-between">
            <Popover.Heading className="text-sm font-semibold">
              {t("common.datatable.columnSettings")}
            </Popover.Heading>
            <Button
              isIconOnly
              aria-label={t("common.datatable.resetColumns")}
              size="sm"
              variant="ghost"
              onPress={resetColumns}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
          <p className="pb-2 text-xs text-muted">
            {t("common.datatable.columnOrderHint")}
          </p>
          <DndContext
            collisionDetection={closestCenter}
            sensors={sensors}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                {orderIds.map((id) => (
                  <SortableColumnRow
                    key={id}
                    dragLabel={t("common.datatable.columnDrag", {
                      column: columnLabel(id),
                    })}
                    id={id}
                    isVisible={table.getColumn(id)?.getIsVisible() ?? true}
                    label={columnLabel(id)}
                    onVisibleChange={(visible) =>
                      handleVisibleChange(id, visible)
                    }
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

interface SortableColumnRowProps {
  id: string;
  label: string;
  isVisible: boolean;
  onVisibleChange: (visible: boolean) => void;
  /** 无障碍：拖拽手柄描述（含列名） */
  dragLabel: string;
}

/** 面板内的单行：拖拽手柄 + 可见性勾选 + 列名 */
function SortableColumnRow({
  id,
  label,
  isVisible,
  onVisibleChange,
  dragLabel,
}: SortableColumnRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1",
        isDragging && "z-10 bg-default shadow-md",
      )}
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={dragLabel}
        className="cursor-grab touch-none rounded p-0.5 text-muted hover:bg-default hover:text-foreground active:cursor-grabbing"
        type="button"
      >
        <GripVertical className="size-4" />
      </button>
      <Checkbox isSelected={isVisible} onChange={onVisibleChange}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
        </Checkbox.Content>
      </Checkbox>
      <span className="flex-1 truncate text-sm">{label}</span>
    </div>
  );
}

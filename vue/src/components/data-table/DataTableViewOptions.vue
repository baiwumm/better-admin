<script setup lang="ts" generic="TData extends RowData">
import type { ButtonProps } from "@nuxt/ui";
import type {
  HeaderContext,
  RowData,
  VisibilityState,
} from "@tanstack/vue-table";
import {
  moveArrayElement,
  useSortable,
} from "@vueuse/integrations/useSortable";
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import type { AppTableLike } from "./table-types";
import {
  mergeColumnOrder,
  readColumnSetting,
  restoreColumnOrder,
  writeColumnSetting,
} from "./column-setting";

/**
 * 列设置面板（对齐 React 端 data-table-view-options）：可见性勾选 + 拖拽排序。
 * 拖拽沿用组织树已在用的 @vueuse/integrations useSortable（sortablejs），
 * 手柄拖拽 + 纵向限制不出列表容器。
 *
 * 参与面板的列 = 可隐藏列（`getCanHide()`）；功能性列（行选择、行操作等
 * `enableHiding: false` 的列）不进面板，拖拽重排时保持默认位置（首/尾固定）。
 *
 * 状态写在页面级 table 实例（columnVisibility / columnOrder），由 DataTable 的
 * v-model 桥接同步到 UTable 内部实例渲染；持久化规则见 column-setting.ts。
 */
const props = withDefaults(
  defineProps<{
    table: AppTableLike<TData>;
    /** 持久化 key（buildColumnSettingKey 生成）；不传则不持久化 */
    storageKey?: string;
    /** 触发按钮尺寸（跟随所在工具区的按钮尺寸） */
    size?: ButtonProps["size"];
  }>(),
  { storageKey: undefined, size: "md" },
);

const { t } = useI18n();

const allLeafIds = computed(() =>
  props.table.getAllLeafColumns().map((column) => column.id),
);
const hideableColumns = computed(() =>
  props.table.getAllLeafColumns().filter((column) => column.getCanHide()),
);
const hideableIds = computed(() =>
  hideableColumns.value.map((column) => column.id),
);
const isHideable = (id: string) => hideableIds.value.includes(id);

/** 面板内的列展示顺序（仅可隐藏列；初始化为列定义默认顺序） */
const orderIds = ref<string[]>([...hideableIds.value]);
/** 默认顺序基线（挂载时固化为列定义顺序，重置时据此还原面板） */
const defaultOrderIds = [...hideableIds.value];

/** 面板顺序 → 表格全量列顺序（默认顺序时写空数组回到定义顺序） */
function applyOrderToTable(next: string[]) {
  const isDefault = next.join("\u0000") === defaultOrderIds.join("\u0000");

  props.table.setColumnOrder(
    isDefault ? [] : mergeColumnOrder(allLeafIds.value, next, isHideable),
  );
}

// 挂载时恢复持久化的列设置（仅一次）：隐藏列 + 顺序
let hasRestored = false;

if (props.storageKey && hideableColumns.value.length > 0) {
  const store = readColumnSetting(props.storageKey);

  if (store.hidden.length > 0) {
    const hiddenSet = new Set(store.hidden);
    const visibility: VisibilityState = {};

    for (const column of hideableColumns.value) {
      visibility[column.id] = !hiddenSet.has(column.id);
    }
    props.table.setColumnVisibility(visibility);
  }

  if (store.order.length > 0) {
    orderIds.value = restoreColumnOrder(store.order, hideableIds.value);
    applyOrderToTable(orderIds.value);
  }
}
hasRestored = true;

// 变更后持久化：全默认（无隐藏且顺序未调整）时不落存储
watch(
  [
    () => orderIds.value.join("\u0000"),
    () => JSON.stringify(props.table.getState().columnVisibility),
  ],
  () => {
    if (
      !props.storageKey ||
      !hasRestored ||
      hideableColumns.value.length === 0
    ) {
      return;
    }

    const hidden = hideableColumns.value
      .filter((column) => !column.getIsVisible())
      .map((column) => column.id);
    const orderChanged =
      orderIds.value.join("\u0000") !== hideableIds.value.join("\u0000");

    writeColumnSetting(
      props.storageKey,
      { hidden, order: orderIds.value },
      hidden.length === 0 && !orderChanged,
    );
  },
);

/** 当前可见的可隐藏列数（至少保留一列可见） */
const visibleCount = computed(
  () => hideableColumns.value.filter((column) => column.getIsVisible()).length,
);

function isVisible(id: string): boolean {
  return props.table.getColumn(id)?.getIsVisible() ?? true;
}

/** 已是唯一可见列时不允许取消勾选（UI 层同步禁用） */
function canToggle(id: string): boolean {
  return !isVisible(id) || visibleCount.value > 1;
}

function setVisible(columnId: string, visible: boolean) {
  if (!visible && visibleCount.value <= 1) return;

  const visibility: VisibilityState = {};

  for (const column of hideableColumns.value) {
    visibility[column.id] =
      column.id === columnId ? visible : column.getIsVisible();
  }
  props.table.setColumnVisibility(visibility);
}

function resetColumns() {
  orderIds.value = [...defaultOrderIds];
  props.table.setColumnVisibility({});
  props.table.setColumnOrder([]);
}

/**
 * 面板列名：header 为字符串直接用；项目列定义为 `() => t(...)`（不依赖上下文）
 * 的函数形式时取其字符串产出——隐藏列不在 getFlatHeaders() 中拿不到真实
 * HeaderContext，故传最小上下文；产出非字符串（自定义表头 VNode）回退列 id。
 */
function columnLabel(id: string): string {
  const column = props.table.getColumn(id);

  if (!column) return id;

  const header = column.columnDef.header;

  if (typeof header === "string") return header;
  if (typeof header !== "function") return id;

  const rendered: unknown = header({
    table: props.table,
    column,
    header: undefined,
  } as unknown as HeaderContext<TData, unknown>);

  return typeof rendered === "string" ? rendered : id;
}

// ── 拖拽排序：列表随 Popover 打开懒渲染，watchElement 跟随元素挂载 / 卸载初始化 ──
const listEl = ref<HTMLElement | null>(null);

useSortable(listEl, orderIds, {
  watchElement: true,
  handle: ".column-drag-handle",
  animation: 150,
  ghostClass: "opacity-50",
  onUpdate: (event) => {
    const { oldIndex, newIndex } = event;

    if (
      oldIndex === undefined ||
      newIndex === undefined ||
      oldIndex === newIndex
    ) {
      return;
    }

    // moveArrayElement 先撤销 sortablejs 的 DOM 搬动，再在 nextTick 内更新数组
    // 交给 Vue 按新顺序重渲染；表格列顺序在其后的 nextTick 同步
    moveArrayElement(orderIds, oldIndex, newIndex, event);
    void nextTick(() => applyOrderToTable(orderIds.value));
  },
});
</script>

<template>
  <UPopover v-if="hideableColumns.length > 0" :content="{ align: 'end' }">
    <UButton
      :label="t('common.datatable.columnSettings')"
      :size="size"
      color="neutral"
      icon="i-lucide-settings-2"
      variant="outline"
    />

    <template #content>
      <div class="w-60 p-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold">
            {{ t("common.datatable.columnSettings") }}
          </p>
          <UButton
            :aria-label="t('common.datatable.resetColumns')"
            color="neutral"
            icon="i-lucide-rotate-ccw"
            size="sm"
            variant="ghost"
            @click="resetColumns"
          />
        </div>
        <p class="pb-2 text-xs text-muted">
          {{ t("common.datatable.columnOrderHint") }}
        </p>
        <div ref="listEl" class="flex max-h-80 flex-col gap-1 overflow-y-auto">
          <div
            v-for="id in orderIds"
            :key="id"
            class="flex items-center gap-1 rounded-md bg-default"
          >
            <UButton
              :aria-label="
                t('common.datatable.columnDrag', { column: columnLabel(id) })
              "
              class="column-drag-handle cursor-grab touch-none"
              color="neutral"
              icon="i-lucide-grip-vertical"
              size="sm"
              variant="ghost"
            />
            <UCheckbox
              :aria-label="columnLabel(id)"
              :disabled="!canToggle(id)"
              :model-value="isVisible(id)"
              @update:model-value="(value) => setVisible(id, value === true)"
            />
            <span class="flex-1 truncate text-sm">{{ columnLabel(id) }}</span>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>

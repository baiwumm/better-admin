<script setup lang="ts" generic="TData extends RowData">
import type { RowData } from "@tanstack/vue-table";
import { FlexRender } from "@tanstack/vue-table";

import type { AppTable } from "./table-types";

import { useI18n } from "vue-i18n";

/**
 * DataTable（TanStack vue-table 渲染层，范式对齐 React 端 DataTable）：
 * 外层 rounded-md border；表头排序点击；行 hover / 选中态；
 * 加载态（首载骨架行 / 后台刷新进度条互斥）；空态统一 EmptyState。
 * 服务端分页/排序：状态由页面列表 store 驱动（受控），本组件仅取数。
 */
defineProps<{
  table: AppTable<TData>;
  /** 首载（当前 key 无数据）→ 骨架行 */
  loading?: boolean;
  /** 后台刷新 → 当前数据 + 进度条 */
  refreshing?: boolean;
  minWidth?: string;
}>();

const { t } = useI18n();

function toggleSorting(
  column: { getToggleSortingHandler: () => unknown; getCanSort: () => boolean },
  event: MouseEvent,
) {
  const handler = column.getToggleSortingHandler();

  if (typeof handler === "function") (handler as (e: unknown) => void)(event);
}
</script>

<template>
  <div
    class="relative overflow-hidden rounded-md border"
    :class="{ 'opacity-60 transition-opacity': refreshing }"
  >
    <div class="overflow-x-auto">
      <table
        :style="{ minWidth: minWidth ?? '0px' }"
        class="w-full caption-bottom text-sm"
      >
        <thead>
          <tr
            v-for="headerGroup in table.getHeaderGroups()"
            :key="headerGroup.id"
            class="border-b bg-muted/40"
          >
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              :aria-sort="
                header.column.getIsSorted() === 'asc'
                  ? 'ascending'
                  : header.column.getIsSorted() === 'desc'
                    ? 'descending'
                    : undefined
              "
              class="h-10 px-2 text-start align-middle font-medium"
              :class="
                header.column.getCanSort() ? 'cursor-pointer select-none' : ''
              "
              @click="
                header.column.getCanSort() &&
                toggleSorting(header.column as never, $event)
              "
            >
              <FlexRender
                v-if="!header.isPlaceholder"
                :render="header.column.columnDef.header"
                :props="header.getContext()"
              />
              <UIcon
                v-if="header.column.getCanSort()"
                class="ms-1 inline-block size-3.5 align-[-2px] text-muted"
                :name="
                  header.column.getIsSorted() === 'asc'
                    ? 'i-lucide-arrow-up-narrow-wide'
                    : header.column.getIsSorted() === 'desc'
                      ? 'i-lucide-arrow-down-wide-narrow'
                      : 'i-lucide-arrow-up-down'
                "
              />
            </th>
          </tr>
        </thead>

        <tbody>
          <template v-if="loading">
            <tr v-for="row in 5" :key="`skeleton-${row}`">
              <td
                v-for="header in table.getVisibleFlatColumns()"
                :key="header.id"
                class="p-2"
              >
                <USkeleton class="h-5 w-full" />
              </td>
            </tr>
          </template>

          <template v-else-if="table.getRowModel().rows.length">
            <tr
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              class="border-b transition-colors hover:bg-muted/50"
              :data-state="row.getIsSelected() ? 'selected' : undefined"
              :class="row.getIsSelected() ? 'bg-muted' : ''"
            >
              <td
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                class="p-2 align-middle whitespace-nowrap"
              >
                <FlexRender
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
              </td>
            </tr>
          </template>

          <tr v-else>
            <td :colspan="table.getVisibleFlatColumns().length">
              <div
                class="flex h-48 flex-col items-center justify-center gap-2 text-center"
              >
                <UIcon class="size-10 text-dimmed" name="i-lucide-inbox" />
                <p class="text-muted text-sm">
                  {{ t("common.datatable.empty") }}
                </p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="refreshing"
      class="absolute inset-x-0 top-0 h-0.5 overflow-hidden"
    >
      <div class="bg-primary h-full w-1/3 animate-pulse" />
    </div>
  </div>
</template>

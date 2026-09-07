<script setup lang="ts" generic="TData extends RowData">
import type { RowData } from "@tanstack/vue-table";
import type { AppTableLike } from "./table-types";

import { computed } from "vue";
import { useI18n } from "vue-i18n";

/**
 * DataTable（Nuxt UI UTable 渲染层）：薄包装层，从页面传入的 TanStack table
 * 实例提取原始 data / columns 交给 UTable 渲染。排序 / 空态 / 加载态由
 * UTable 内置管理；页面级的行选择（批量操作）仍通过页面的 table 实例处理。
 * 样式对齐 better-nuxt 参考项目（border-separate + 表头圆角描边 + 行分隔）。
 */

const props = defineProps<{
  table: AppTableLike<TData>;
  /** 首载（当前 key 无数据）→ UTable 内置 loading 动画 */
  loading?: boolean;
  /** 后台刷新 → 当前数据 + 顶部进度条 */
  refreshing?: boolean;
  minWidth?: string;
}>();

const { t } = useI18n();

// TanStack v8 实例的 options 保存原始 data / columns
const data = computed(() => (props.table.options?.data ?? []) as TData[]);
const columns = computed(() => (props.table.options?.columns ?? []) as never[]);
</script>

<template>
  <div
    class="relative"
    :class="{ 'opacity-60 transition-opacity': refreshing }"
  >
    <!-- 后台刷新进度条 -->
    <div
      v-if="refreshing"
      class="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden"
    >
      <div class="bg-primary h-full w-1/3 animate-pulse" />
    </div>

    <UTable
      sticky
      :loading="loading || undefined"
      :data="data"
      :columns="columns"
      :style="{ minWidth: minWidth ?? undefined }"
      :ui="{
        base: 'border-separate border-spacing-0',
        thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
        tbody: '[&>tr]:last:[&>td]:border-b-0',
        th: 'py-2 first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r text-start truncate',
        tr: 'group',
        td: 'group-has-[td:not(:empty)]:border-b border-default text-start',
      }"
    >
      <template #empty>
        <div
          class="flex h-48 flex-col items-center justify-center gap-2 text-center"
        >
          <UIcon class="size-10 text-dimmed" name="i-lucide-inbox" />
          <p class="text-muted text-sm">
            {{ t("common.datatable.empty") }}
          </p>
        </div>
      </template>
    </UTable>
  </div>
</template>

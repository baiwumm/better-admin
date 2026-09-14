<script setup lang="ts">
import type { PermissionItem } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/data-table/table-types";

import { computed, h, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useVueTable } from "@tanstack/vue-table";
import { getCoreRowModel } from "@tanstack/vue-table";

import DataTable from "@/components/data-table/DataTable.vue";
import DataTableSearchReset from "@/components/data-table/DataTableSearchReset.vue";
import DataTableToolbar from "@/components/data-table/DataTableToolbar.vue";
import { useColumnSettingKey } from "@/composables/use-column-setting-key";
import { type AppRow } from "@/components/data-table/table-types";
import { usePermissions } from "@/composables/use-permissions";

/**
 * 权限管理页（只读展示，与 React 端 permissions-page 对齐）。
 *
 * 数据来源：GET /api/permissions 由后端唯一下发权限点定义（value/label/bits/icon），
 * 前端不硬编码位掩码；本页仅展示，不提供任何 CRUD 操作。
 * 权限名称由前端按 value 做 i18nKey 映射（后端 label 仅有中文），
 * 显示格式「名称(权限点)」，如「搜索(SEARCH)」。
 * 数据量小（个位数权限点），全量展示、前端过滤，不接服务端分页。
 */

type PermissionRow = PermissionItem & { order: number };

const { t } = useI18n();
const { data, isLoading } = usePermissions();

// 搜索采用提交式语义：输入框输入 → 「搜索」按钮 / Enter 应用，「重置」清空
const searchInput = ref("");
const search = ref("");

function applySearch() {
  search.value = searchInput.value.trim();
}

function resetSearch() {
  searchInput.value = "";
  search.value = "";
}

/** 权限点显示名（不含括号部分）：i18n 映射优先，缺失回退后端 label */
function getPermissionBaseName(item: PermissionItem): string {
  const key = `features.permissions.items.${item.value}`;
  const translated = t(key);

  return translated === key ? item.label : translated;
}

// 按位掩码值升序展示（SEARCH=1 → GRANT=256），排序不进入表格交互
const items = computed<PermissionRow[]>(() =>
  (data.value ?? [])
    .map((item, index) => ({ ...item, order: index }))
    .sort((a, b) => a.bits - b.bits || a.order - b.order),
);

// 前端过滤：匹配显示名（i18n 映射后）、权限点 value、后端原始 label
const filtered = computed(() => {
  const normalized = search.value.trim().toLowerCase();

  if (!normalized) return items.value;

  return items.value.filter((item) =>
    [getPermissionBaseName(item), item.value, item.label].some((text) =>
      text.toLowerCase().includes(normalized),
    ),
  );
});

const columns = computed<AppColumnDef<PermissionRow>[]>(() => [
  {
    id: "label",
    enableSorting: false,
    header: () => t("features.permissions.column.name"),
    cell: ({ row }) =>
      h("span", { class: "text-sm font-medium" }, [
        getPermissionBaseName(row.original),
        h("span", { class: "text-muted ms-1" }, `(${row.original.value})`),
      ]),
  },
  {
    id: "icon",
    enableSorting: false,
    header: () => t("features.permissions.column.icon"),
    cell: ({ row }) =>
      row.original.icon
        ? h("span", { class: "flex items-center" }, [
            h(UIcon, {
              "aria-hidden": true,
              class: "text-muted size-4",
              name: `i-lucide-${row.original.icon}`,
            }),
          ])
        : h("span", { class: "text-muted" }, "—"),
  },
  {
    id: "bits",
    enableSorting: false,
    header: () => t("features.permissions.column.bits"),
    cell: ({ row }) =>
      h("span", { class: "text-muted text-sm" }, String(row.original.bits)),
  },
]);

const columnSettingKey = useColumnSettingKey("/settings/permissions");

const table = useVueTable({
  get data() {
    return filtered.value;
  },
  columns: columns.value,
  getCoreRowModel: getCoreRowModel(),
  getRowId: (row: AppRow<PermissionRow>["original"]) => row.value,
  // 全量展示：关闭自动分页切片（本页不渲染分页条）
  manualPagination: true,
});

import { resolveComponent } from "vue";

// UIcon 组件引用（供 h() 使用）
const UIcon = resolveComponent("UIcon");
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <DataTableToolbar :column-setting-key="columnSettingKey" :table="table">
      <UInput
        v-model="searchInput"
        :aria-label="t('common.datatable.searchLabel')"
        :placeholder="t('features.permissions.searchPlaceholder')"
        class="w-64"
        icon="i-lucide-search"
        @keyup.enter="applySearch"
      />
      <!-- 纯本地过滤：无请求态，搜索/重置恒可点 -->
      <DataTableSearchReset
        :can-reset="true"
        @reset="resetSearch"
        @search="applySearch"
      />
    </DataTableToolbar>

    <DataTable :loading="isLoading" :min-width="'560px'" :table="table" />
  </div>
</template>

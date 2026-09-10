<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useMenuPermissions } from "@/composables/use-permissions";

/**
 * DataTable 工具栏「搜索 / 重置」按钮对（对齐 React 端 data-table-search-reset）。
 *
 * - 位掩码门控内置：搜索按钮消费 SEARCH 位、重置按钮消费 RESET 位，
 *   两个位都缺失时整体不渲染（显隐策略与操作按钮一致）；
 *   「重置」是纯前端清筛选动作，RESET 位按 v1.3 约定仅控制显隐，不挂后端守卫；
 * - canReset / fetching 由页面按各自列表语义传入
 *   （服务端分页页传请求态，纯本地过滤页可省略 fetching）；
 *   搜索按钮不因「条件未变化」禁用——提交/刷新语义由页面 search 事件处理决定
 *   （服务端分页页经 useListQuery 的 submitSearch 实现：同值 → refetch 刷新列表）；
 *   重置无可重置条件或请求中时仅禁用，不隐藏。
 * - 自动读取当前菜单的 userPermissions 进行精确权限判断（与 React 端一致，
 *   避免使用用户全局权限——可能包含其他菜单的权限位）。
 */
withDefaults(
  defineProps<{
    /** 存在任一筛选/搜索条件（可重置；false 时重置按钮禁用） */
    canReset?: boolean;
    /** 列表请求进行中（loading 指示，两按钮同步禁用） */
    fetching?: boolean;
  }>(),
  { canReset: false, fetching: false },
);

const emit = defineEmits<{ search: []; reset: [] }>();

const { t } = useI18n();
const { canSearch, canReset: canResetByPermission } = useMenuPermissions();

const showGroup = computed(() => canSearch.value || canResetByPermission.value);
</script>

<template>
  <div v-if="showGroup" class="flex items-center gap-2">
    <UButton
      v-if="canSearch"
      :label="t('common.datatable.search')"
      :loading="fetching"
      :disabled="fetching"
      icon="i-lucide-search"
      @click="emit('search')"
    />
    <UButton
      v-if="canResetByPermission"
      :label="t('common.datatable.reset')"
      color="neutral"
      variant="outline"
      :disabled="!canReset || fetching"
      icon="i-lucide-rotate-ccw"
      @click="emit('reset')"
    />
  </div>
</template>

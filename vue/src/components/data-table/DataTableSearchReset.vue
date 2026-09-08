<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * 搜索 / 重置按钮组（对齐 React 端）：搜索按钮不因「条件未变化」禁用——
 * 提交/刷新语义由页面 search 事件处理决定（服务端分页页经 useListQuery
 * 的 submitSearch 实现：同值 → refetch 刷新列表）；请求中禁用防重复点击。
 * 重置无可重置条件或请求中时仅禁用，不隐藏。
 */
defineProps<{
  /** 存在任一筛选/搜索条件（可重置；false 时重置按钮禁用） */
  canReset?: boolean;
  /** 列表请求进行中（loading 指示，两按钮同步禁用） */
  fetching?: boolean;
}>();

const emit = defineEmits<{ search: []; reset: [] }>();

const { t } = useI18n();
</script>

<template>
  <div class="flex items-center gap-2">
    <UButton
      :label="t('common.datatable.search')"
      :loading="fetching"
      :disabled="fetching"
      icon="i-lucide-search"
      @click="emit('search')"
    />
    <UButton
      :label="t('common.datatable.reset')"
      color="neutral"
      variant="outline"
      :disabled="!canReset || fetching"
      icon="i-lucide-rotate-ccw"
      @click="emit('reset')"
    />
  </div>
</template>

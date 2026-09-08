<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * 搜索 / 重置按钮组：搜索脏标记高亮；重置常显（对齐 React 端：无可重置
 * 条件或请求中时仅禁用，不隐藏）；请求中指示 loading。
 */
defineProps<{
  /** 搜索输入与已提交关键词不一致（脏） */
  searchDirty?: boolean;
  /** 存在任一筛选/搜索条件（可重置；false 时重置按钮禁用） */
  canReset?: boolean;
  /** 列表请求进行中（loading 指示，重置同步禁用） */
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
      :disabled="!searchDirty"
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

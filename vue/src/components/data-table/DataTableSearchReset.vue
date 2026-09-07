<script setup lang="ts">
import { useI18n } from "vue-i18n";

import Spinner from "@/components/ui/spinner/index.vue";

/** 搜索 / 重置按钮组：搜索脏标记高亮；重置在存在筛选时显示；刷新指示条。 */
defineProps<{
  /** 搜索输入与已提交关键词不一致（脏） */
  searchDirty?: boolean;
  /** 存在任一筛选/搜索条件（可重置） */
  canReset?: boolean;
  /** 列表请求进行中（刷新指示） */
  fetching?: boolean;
}>();

const emit = defineEmits<{ search: []; reset: [] }>();

const { t } = useI18n();
</script>

<template>
  <div class="flex items-center gap-2">
    <Spinner v-if="fetching" color="neutral" size="sm" />
    <UButton
      :class="searchDirty ? 'ring-primary/50 ring-2' : ''"
      :label="t('common.datatable.search')"
      color="neutral"
      size="sm"
      variant="soft"
      @click="emit('search')"
    />
    <UButton
      v-if="canReset"
      :label="t('common.datatable.reset')"
      color="neutral"
      size="sm"
      variant="ghost"
      @click="emit('reset')"
    />
  </div>
</template>

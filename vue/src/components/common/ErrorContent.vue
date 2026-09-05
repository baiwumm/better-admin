<script setup lang="ts">
import { useI18n } from "vue-i18n";

/** 区块级错误提示（列表加载失败等）：Alert 样式 + 可选重试按钮，不跳全屏。 */
withDefaults(
  defineProps<{
    title: string;
    /** 重试按钮文案；缺省不渲染按钮 */
    retryLabel?: string;
  }>(),
  { retryLabel: undefined },
);

const emit = defineEmits<{ retry: [] }>();

const { t } = useI18n();
</script>

<template>
  <UAlert
    class="my-4"
    color="error"
    icon="i-lucide-circle-alert"
    :title="title"
  >
    <template v-if="retryLabel" #actions>
      <UButton
        :label="retryLabel ?? t('common.retry')"
        color="error"
        size="sm"
        variant="soft"
        @click="emit('retry')"
      />
    </template>
  </UAlert>
</template>

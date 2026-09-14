<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * 偏好设置配置项标题：Label + 可选 Tooltip 说明（对齐 React 端 picker-label）。
 * 统一替代「Label + Description 常驻描述」的形态，减少抽屉内的视觉噪音。
 */
defineProps<{
  /** 标题的 i18n key */
  labelKey: string;
  /** 说明文案的 i18n key：提供时在标题旁显示 Info 图标，hover 以 Tooltip 展示 */
  tooltipKey?: string;
}>();

const { t } = useI18n();
</script>

<template>
  <div class="flex items-center gap-1">
    <span class="text-sm font-medium text-default">{{ t(labelKey) }}</span>
    <UTooltip v-if="tooltipKey" :text="t(tooltipKey)">
      <UIcon
        name="i-lucide-info"
        class="size-3.5 text-muted transition-colors hover:text-default"
        :aria-label="`${t(labelKey)}${t('layout.prefs.ariaHint')}`"
      />
    </UTooltip>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 占位页（M0：未迁移模块的统一占位；图标 + 页面标题 + 可选描述）。
 * 文案全部走既有 i18n 键（menu.pageTitle.*），不新增键，保持与 React 语言包零漂移。
 */
const props = withDefaults(
  defineProps<{
    /** lucide 图标名（i-lucide-*） */
    icon?: string;
    /** 页面标题 i18n 键 */
    titleKey: string;
    /** 可选描述（已翻译文案，由调用方取词后传入） */
    description?: string;
  }>(),
  {
    icon: "i-lucide-package-open",
    description: undefined,
  },
);

const { t } = useI18n();
const title = computed(() => t(props.titleKey));
</script>

<template>
  <div
    class="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center"
  >
    <UIcon :name="icon" class="size-12 text-dimmed" />
    <h1 class="text-2xl font-bold tracking-tight">{{ title }}</h1>
    <p v-if="description" class="max-w-md text-sm text-muted">
      {{ description }}
    </p>
  </div>
</template>

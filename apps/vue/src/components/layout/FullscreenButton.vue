<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useFullscreen } from "@vueuse/core";

/**
 * 全屏切换按钮（对齐 React 端 FullscreenButton）：
 * useFullscreen 不传 target 默认作用于 document.documentElement，
 * 挂载时状态同步、fullscreenchange 监听与卸载清理均由 VueUse 托管。
 */
const { t } = useI18n();

const { isFullscreen, toggle } = useFullscreen();

const icon = computed(() =>
  isFullscreen.value ? "i-lucide-minimize" : "i-lucide-maximize",
);
const label = computed(() =>
  isFullscreen.value
    ? t("layout.fullscreen.exit")
    : t("layout.fullscreen.enter"),
);
</script>

<template>
  <UButton
    :aria-label="label"
    :icon="icon"
    color="neutral"
    variant="ghost"
    size="sm"
    @click="toggle"
  />
</template>

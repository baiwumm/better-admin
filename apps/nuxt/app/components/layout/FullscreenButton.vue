<script setup lang="ts">
import { computed } from 'vue'

/**
 * 全屏切换按钮（平移自 vue/src/components/layout/FullscreenButton.vue，
 * 对齐 React 端 FullscreenButton）：useFullscreen 不传 target 默认作用于
 * document.documentElement，挂载时状态同步、fullscreenchange 监听与卸载
 * 清理均由 VueUse 托管（@vueuse/nuxt auto-import）。
 */
const { t } = useI18n()

const { isFullscreen, toggle } = useFullscreen()

const icon = computed(() =>
  isFullscreen.value ? 'i-lucide-minimize' : 'i-lucide-maximize')
const label = computed(() =>
  isFullscreen.value
    ? t('layout.fullscreen.exit')
    : t('layout.fullscreen.enter'))
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

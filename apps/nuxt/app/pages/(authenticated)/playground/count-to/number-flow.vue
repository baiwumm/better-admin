<script setup lang="ts">
// 演示场 › 数字动画 › Number Flow（Phase A 占位；Phase B 按 plan-dashboard-playground.md §6 实现）。
// script setup 块不可省略：纯模板 SFC 无 __name，Nuxt keepalive 分支会按组件名
// 混用 RouteProvider（mechanisms.md §26）。
const { t } = useI18n()
</script>

<template>
  <PlaceholderPage
    icon="i-lucide-arrow-up-1-0"
    title-key="menu.playground.numberFlow"
    :description="t('features.playground.placeholder')"
  />
</template>

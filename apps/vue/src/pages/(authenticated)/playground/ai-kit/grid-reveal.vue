<script setup lang="ts">
import { useI18n } from "vue-i18n";

import PlaceholderPage from "@/components/PlaceholderPage.vue";

// 演示场 › Ai Kit › Grid Reveal（Phase A 占位；Phase B 按 plan-dashboard-playground.md §6 实现）
const { t } = useI18n();
</script>

<template>
  <PlaceholderPage
    icon="i-lucide-grid-2x2"
    title-key="menu.playground.gridReveal"
    :description="t('features.playground.placeholder')"
  />
</template>

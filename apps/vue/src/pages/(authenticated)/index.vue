<script setup lang="ts">
import PlaceholderPage from "@/components/PlaceholderPage.vue";
import { ENV } from "@/lib/env";

// Dashboard 概览：各端均未实现（feature-matrix 口径），保持占位
</script>

<template>
  <PlaceholderPage
    icon="i-lucide-layout-dashboard"
    title-key="menu.pageTitle.console"
    :description="ENV.appDesc"
  />
</template>

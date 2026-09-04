<script setup lang="ts">
import ErrorPageShell from "@/components/ErrorPageShell.vue";

// 未匹配路径兜底：全屏 404（不进认证布局，见 AppShell 布局分支）
</script>

<template>
  <ErrorPageShell
    code="404"
    description-key="errors.notFound.description"
    title-key="errors.notFound.title"
  />
</template>

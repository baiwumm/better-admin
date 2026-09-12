<script setup lang="ts">
// 独立全屏错误页：要求登录（守卫拦截未登录），但全屏渲染不套 AdminLayout
definePageMeta({ layout: 'empty', fullscreenError: true })
</script>

<template>
  <GeneralErrorPage />
</template>

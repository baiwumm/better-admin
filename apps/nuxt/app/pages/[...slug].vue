<script setup lang="ts">
// 未匹配路径兜底：全屏 404（不进认证布局）
definePageMeta({ layout: 'empty', fullscreenError: true })
</script>

<template>
  <NotFoundErrorPage />
</template>

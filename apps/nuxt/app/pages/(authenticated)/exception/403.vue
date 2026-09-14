<script setup lang="ts">
// 403 异常页演示（菜单页，主体区 embedded 形态，区别于错误跳转的全屏 /403）。
// script setup 块不可省略：纯模板 SFC 编译后没有 __name，Nuxt keepalive 分支按
// 组件名复用 RouteProvider，三个异常页会共用同一个而无法被区分。
</script>

<template>
  <!-- AdminLayout 内嵌错误页（全宽白名单）：embedded 形态撑满主体区 -->
  <ForbiddenErrorPage variant="embedded" />
</template>

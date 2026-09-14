<script setup lang="ts">
// 空布局：全屏错误页（/403 /404 /500）与 catch-all 404 专用——
// 页面组件自渲染全屏 Result 页，不套任何外壳。
// （模板根不允许注释节点，说明置于本 script 注释。）
</script>

<template>
  <slot />
</template>

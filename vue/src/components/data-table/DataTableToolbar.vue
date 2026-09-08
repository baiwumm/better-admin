<script setup lang="ts">
/** 表格工具栏容器（左侧筛选区 + 右侧操作区），对齐 React 端 DataTableToolbar 布局。 */
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
    <div class="flex flex-1 flex-wrap items-center gap-2">
      <slot />
    </div>
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

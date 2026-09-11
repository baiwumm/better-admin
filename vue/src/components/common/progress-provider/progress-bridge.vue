<script setup lang="ts">
import { useProgress } from "@bprogress/vue";

import { watchProgress } from "@/lib/progress";

/**
 * 进度条订阅组件（无渲染）。
 *
 * useProgress() 通过 inject 从祖先 ProgressProvider 获取上下文，
 * 因此必须在 Provider 内部的子组件中调用（同级 setup 中调用会报
 * "useProgress must be used within a ProgressProvider"）。
 * 本组件只负责订阅 progress.ts 响应式状态机的展示态边沿、驱动 bprogress
 * start/stop；状态、边沿时序与 start/stop delay 全部收敛在 progress.ts
 * （api-client 与路由守卫直接改状态，无需向模块注入命令式引用）。
 */
const { start, stop } = useProgress();

watchProgress({ start, stop });
</script>

<template>
  <!-- 无渲染订阅组件：默认插槽为空即不产出任何节点。
       不使用「仅有注释」的空模板（eslint-plugin-vue 的 valid-template-root 报错）。 -->
  <slot />
</template>

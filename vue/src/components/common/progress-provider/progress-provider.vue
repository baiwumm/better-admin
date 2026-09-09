<script setup lang="ts">
import { ProgressProvider as BProgressProvider } from "@bprogress/vue";

import ProgressBridge from "./progress-bridge.vue";

/**
 * 全局进度条 Provider。
 *
 * 封装 @bprogress/vue，统一配置进度条样式，避免在业务代码中直接暴露第三方库细节。
 * 注意：Vue 版 ProgressProvider 的 props 仅含 color / height / options 等样式项，
 * 时序参数（startPosition / delay / stopDelay）由内部 ProgressBridge 经
 * bindProgress 下发给 progress.ts 状态机（单一来源，对齐 React 端机制）。
 * delay=200 的意义：短导航 / 快速接口全程不闪进度条。
 */
</script>

<template>
  <BProgressProvider color="var(--ui-primary)" height="2px">
    <ProgressBridge />
    <slot />
  </BProgressProvider>
</template>

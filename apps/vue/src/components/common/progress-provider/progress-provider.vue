<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ProgressProvider as BProgressProvider } from "@bprogress/vue";

import ProgressBridge from "./progress-bridge.vue";
import { progressActive } from "@/lib/progress";

const { t } = useI18n();

/**
 * 全局进度条 Provider。
 *
 * 封装 @bprogress/vue，统一配置进度条样式，避免在业务代码中直接暴露第三方库细节。
 * 注意：Vue 版 ProgressProvider 的 props 仅含 color / height / options 等样式项，
 * 时序参数（startPosition / delay / stopDelay）收敛在 progress.ts 状态机内，
 * 由内部 ProgressBridge 订阅其响应式展示态驱动 bprogress（单一来源，对齐 React 端机制）。
 * delay=200 的意义：短导航 / 快速接口全程不闪进度条。
 *
 * 进度条无障碍播报：@bprogress 自绘条没有 aria 容器，读屏用户无法感知加载状态；
 * 这里挂独立的 role="status" 活区，只在展示态边沿写入文案，空闲时为空内容
 * （首帧无文本 → 不产生噪音，读完即清空也不会重复播报）。
 */
</script>

<template>
  <BProgressProvider color="var(--ui-primary)" height="2px">
    <ProgressBridge />
    <div aria-atomic="true" aria-live="polite" class="sr-only" role="status">
      {{ progressActive ? t("common.loading") : "" }}
    </div>
    <slot />
  </BProgressProvider>
</template>

<script setup lang="ts">
import { useProgress } from "@bprogress/vue";

import { bindProgress } from "@/lib/progress";

/**
 * 进度条桥接组件（无渲染）。
 *
 * useProgress() 通过 inject 从祖先 ProgressProvider 获取上下文，
 * 因此必须在 Provider 内部的子组件中调用（同级 setup 中调用会报
 * "useProgress must be used within a ProgressProvider"）。
 * 本组件负责把 start/stop 与时序配置注入 progress.ts 状态机，
 * 供 api-client（请求进度）与路由守卫（路由进度）等非组件模块使用。
 */
const { start, stop } = useProgress();

// 时序配置说明（Vue 版 useProgress 不暴露这些值，无法从 Provider 读取，
// 故在此显式声明，作为唯一来源）：
// - startPosition=0.3 起始位置；stopDelay=0 立即收尾；
// - startDelayMs=200（请求场景）：短导航/快速接口全程不闪进度条；
// - routeStartDelayMs=0（路由场景）：vue-router 导航不含数据加载（页面数据
//   由挂载后的 vue-query 走 api-client 计数），导航耗时普遍 < 200ms，
//   若共用请求 delay 会被防闪机制吞掉，路由进度条永远不显示，故立即开始。
// bindProgress 只写模块级变量，setup 同步调用即可（对齐 React 端 useEffect 绑定语义）。
bindProgress(
  { start, stop },
  {
    startPosition: 0.3,
    startDelayMs: 200,
    routeStartDelayMs: 0,
    stopDelayMs: 0,
  },
);
</script>

<template>
  <!-- 桥接组件不渲染任何内容 -->
</template>

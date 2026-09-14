/**
 * @nuxt/ui stubs/vue-router 的补丁 shim（纯 Vue 环境专用）。
 *
 * 背景：@nuxt/ui 4.11.0 的 stubs/vue-router.js 相对部分组件（如 CommandPalette
 * 的类型面）缺失 onServerPrefetch / useAsyncData / defineComponent 导出，
 * rolldown 构建期对 re-export 链做严格命名校验时失败。
 * vite.config.ts 已将 stub 文件路径 alias 到本文件；此处转发原始 stub 的
 * 全部导出，并补齐缺失名字的 SPA 等价实现（no-op）。
 */
export * from "@nuxt/ui/runtime/vue/stubs/base.js";
export { useRoute, useRouter } from "vue-router";

import { computed, defineComponent, ref } from "vue";

export { defineComponent };

/** SPA 无服务端渲染：生命周期钩子为 no-op */
export function onServerPrefetch() {
  /* no-op */
}

/** SPA 无 useAsyncData：恒为「已完成的空数据」异步数据占位 */
export function useAsyncData(..._args: unknown[]) {
  return {
    data: ref(null),
    pending: ref(false),
    error: ref(null),
    status: computed(() => "success"),
    refresh: () => Promise.resolve(),
  };
}

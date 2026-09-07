<script setup lang="ts">
import Spinner from "@/components/ui/spinner/index.vue";

/**
 * 局部加载遮罩：绝对定位铺满最近的 relative 父容器并居中 Spinner，
 * 统一各页面手写的 loading 覆盖（UIcon animate-spin）视觉。
 */
withDefaults(
  defineProps<{
    /** 遮罩背景类；默认半透明底色，浅遮罩场景可传 bg-default/30 等 */
    overlay?: string;
  }>(),
  { overlay: "bg-default/60" },
);
</script>

<template>
  <div :class="overlay" class="absolute inset-0 z-10 grid place-items-center">
    <Spinner />
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

import GeneralErrorPage from '@/components/common/error-pages/GeneralErrorPage.vue'
import NotFoundErrorPage from '@/components/common/error-pages/NotFoundErrorPage.vue'

/**
 * 全局错误页（Nuxt error.vue 机制）：处理未捕获运行时错误 / 服务端错误
 * （createError / showError）。404 渲染 Not Found 插画，其余渲染 500 通用错误；
 * 组件自身为全屏 Result 版式（对齐 React / Vue 端错误页）。
 * 路由级 404（未匹配路径）由 app/pages/[...slug].vue 承担，不经过本组件。
 */
const props = defineProps<{
  error: NuxtError
}>()

const isNotFound = computed(() => props.error.statusCode === 404)
</script>

<template>
  <NotFoundErrorPage v-if="isNotFound" />
  <GeneralErrorPage v-else />
</template>

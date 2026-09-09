<script setup lang="ts">
import { useI18n } from "vue-i18n";

import IllustrationNotFound from "./IllustrationNotFound.vue";
import ResultPage from "./ResultPage.vue";

/**
 * 404 页面不存在页（对齐 React 端 not-found-error.tsx）：
 * /404 路由与 /exception/404 菜单页共用；亦作未匹配路径的 catch-all 兜底。
 */
withDefaults(
  defineProps<{
    /** 渲染形态，透传 ResultPage（菜单页用 embedded，错误跳转页默认全屏） */
    variant?: "fullscreen" | "embedded";
  }>(),
  { variant: "fullscreen" },
);

const { t } = useI18n();
</script>

<template>
  <ResultPage
    :sub-title="t('errors.notFound.description')"
    :title="t('errors.notFound.title')"
    :variant="variant"
  >
    <template #image>
      <IllustrationNotFound />
    </template>
  </ResultPage>
</template>

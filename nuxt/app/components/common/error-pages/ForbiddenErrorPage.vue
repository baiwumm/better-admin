<script setup lang="ts">
import IllustrationForbidden from './IllustrationForbidden.vue'
import ResultPage from './ResultPage.vue'

/**
 * 403 无权限页（对齐 React 端 forbidden-error.tsx）：
 * /403 路由与 /exception/403 菜单页共用。
 */
withDefaults(
  defineProps<{
    /** 渲染形态，透传 ResultPage（菜单页用 embedded，错误跳转页默认全屏） */
    variant?: 'fullscreen' | 'embedded'
  }>(),
  { variant: 'fullscreen' }
)

const { t } = useI18n()
</script>

<template>
  <ResultPage
    :sub-title="t('errors.forbidden.description')"
    :title="t('errors.forbidden.title')"
    :variant="variant"
  >
    <template #image>
      <IllustrationForbidden />
    </template>
  </ResultPage>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

/**
 * 全屏错误页外壳（对齐 React 端 ErrorPageShell 结构）：
 * 超大状态码 + 标题 + 描述 + Go Back / Back to Home 双按钮。
 */
const props = defineProps<{
  code: string;
  /** 错误标题 i18n 键（errors.forbidden / notFound / serverError.*） */
  titleKey: string;
  /** 错误描述 i18n 键 */
  descriptionKey: string;
}>();

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <div
    class="flex h-svh flex-col items-center justify-center gap-2 px-4 text-center"
  >
    <p class="text-[7rem] font-bold leading-none">{{ props.code }}</p>
    <h1 class="text-xl font-medium">{{ t(props.titleKey) }}</h1>
    <p class="text-muted max-w-md text-sm">{{ t(props.descriptionKey) }}</p>
    <div class="mt-6 flex gap-4">
      <UButton
        :label="t('common.goBack')"
        color="neutral"
        variant="outline"
        @click="router.back()"
      />
      <UButton :label="t('common.backHome')" to="/" />
    </div>
  </div>
</template>

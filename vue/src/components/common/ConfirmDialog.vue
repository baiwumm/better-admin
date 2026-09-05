<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 确认弹窗（对齐 React 端 ConfirmDialog 语义）：
 * - destructive：危险操作红色样式；
 * - confirmKeyword：输入指定关键词后才允许确认（删除用户名 / 批量 DELETE）；
 * - 关闭时机由父组件控制：确认仅 emit confirm；成功后父组件置 open=false，
 *   失败保持打开（页面层负责失败 toast）——对齐 React「抛错保持打开」约定。
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    /** 支持插值后的完整文案 */
    description: string | null;
    confirmText: string;
    destructive?: boolean;
    /** 需要输入该关键词才能确认；缺省无关键词门槛 */
    confirmKeyword?: string;
    keywordLabel?: string;
  }>(),
  {
    destructive: false,
    confirmKeyword: undefined,
    keywordLabel: undefined,
  },
);

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [];
}>();

const { t } = useI18n();

const keywordInput = ref("");

watch(
  () => props.open,
  (open) => {
    if (open) keywordInput.value = "";
  },
);

const keywordOk = computed(
  () => !props.confirmKeyword || keywordInput.value === props.confirmKeyword,
);

function close() {
  emit("update:open", false);
}
</script>

<template>
  <UModal
    :open="open"
    :dismissible="false"
    :ui="{ content: 'max-w-md' }"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #content>
      <div class="flex flex-col gap-4 p-6">
        <div class="flex flex-col gap-1 text-start">
          <h2 class="text-lg font-semibold">{{ title }}</h2>
          <p class="text-muted text-sm whitespace-pre-line">
            {{ description }}
          </p>
        </div>

        <UFormField v-if="confirmKeyword" :label="keywordLabel">
          <UInput
            v-model="keywordInput"
            :placeholder="confirmKeyword"
            class="w-full"
            autocomplete="off"
          />
        </UFormField>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            @click="close"
          />
          <UButton
            :color="destructive ? 'error' : 'primary'"
            :disabled="!keywordOk"
            :label="confirmText"
            @click="emit('confirm')"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

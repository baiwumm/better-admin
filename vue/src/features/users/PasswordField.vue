<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 表单内密码输入框（可见性切换）：带 label / 错误 / 描述完整字段结构，
 * 供新建/编辑与重置密码弹窗复用（与 React 端 PasswordField 同构）。
 */
withDefaults(
  defineProps<{
    label: string;
    modelValue: string;
    placeholder?: string;
    /** 错误态文案，无错误时不渲染 */
    error?: string;
    /** 无错误时的辅助说明 */
    description?: string;
    autoComplete?: string;
  }>(),
  {
    autoComplete: "new-password",
    placeholder: undefined,
    error: undefined,
    description: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  blur: [];
}>();

const { t } = useI18n();
const isVisible = ref(false);

const inputType = computed(() => (isVisible.value ? "text" : "password"));
const visibilityIcon = computed(() =>
  isVisible.value ? "i-lucide-eye-off" : "i-lucide-eye",
);
const visibilityLabel = computed(() =>
  isVisible.value ? t("common.password.hide") : t("common.password.show"),
);
</script>

<template>
  <UFormField
    :label="label"
    :error="error || undefined"
    :description="error ? undefined : description"
  >
    <UInput
      :autocomplete="autoComplete"
      :placeholder="placeholder"
      :type="inputType"
      :model-value="modelValue"
      class="w-full"
      variant="soft"
      @update:model-value="(value: string) => emit('update:modelValue', value)"
      @blur="emit('blur')"
    >
      <template #trailing>
        <UButton
          :aria-label="visibilityLabel"
          :icon="visibilityIcon"
          color="neutral"
          size="xs"
          variant="ghost"
          @click="isVisible = !isVisible"
        />
      </template>
    </UInput>
  </UFormField>
</template>

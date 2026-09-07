<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 表单内密码输入框（可见性切换）：带 label / 描述完整字段结构，
 * 供新建/编辑与重置密码弹窗复用（与 React 端 PasswordField 同构）。
 * name 传入后错误由 UForm 按字段自动注入；description 走 help 槽
 * （与 error 互斥渲染：报错时自动隐藏辅助说明）。
 */
withDefaults(
  defineProps<{
    label: string;
    modelValue: string;
    /** UForm 校验字段名（schema 字段路径） */
    name?: string;
    placeholder?: string;
    /** 无错误时的辅助说明 */
    description?: string;
    autoComplete?: string;
  }>(),
  {
    name: undefined,
    autoComplete: "new-password",
    placeholder: undefined,
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
  <UFormField :help="description" :label="label" :name="name">
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

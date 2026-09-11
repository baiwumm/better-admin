<script lang="ts">
/**
 * 个人标签输入（我的账户基本信息卡，对齐 React 端 tag-input）：基于 Nuxt UI 内置
 * UInputTags（Reka UI TagsInput）实现——回车添加、Backspace 删除、标签内联删除。
 * 约束与后端规约一致：最多 10 个、单项 trim 后 1-20 字符、重复标签忽略；
 * 超上限 / 重复由组件 invalid 事件给出内联错误提示（单项长度由原生 maxlength 硬限制）。
 *
 * 说明：React 端因 HeroUI 无对应组件而自建 TagInput（§7.2 第 3/4 条）；Vue 端
 * Nuxt UI 内置 UInputTags，按 §21 组件优先级直接使用内置组件（不再自建）。
 */

export const TAG_MAX_COUNT = 10;
export const TAG_MAX_LENGTH = 20;
</script>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

const props = withDefaults(
  defineProps<{
    /** 标签列表（受控，全量数组） */
    modelValue: string[];
    /** 字段标签文案 */
    label: string;
    placeholder?: string;
    disabled?: boolean;
  }>(),
  { placeholder: undefined, disabled: false },
);

const emit = defineEmits<{ "update:modelValue": [tags: string[]] }>();

const { t } = useI18n();
const error = ref<string | null>(null);

/** 单项去首尾空格（纯空格输入 trim 为空串，由 onUpdate 过滤） */
function trimTag(value: string) {
  return value.trim();
}

/** 标签变化：过滤空串后回写（UForm 经 v-model 同步 state.tags），并清除上次错误 */
function onUpdate(tags: string[]) {
  emit(
    "update:modelValue",
    tags.filter((tag) => tag !== ""),
  );
  error.value = null;
}

/** 添加被拒绝（重复 / 超过数量上限）：区分原因给出内联提示 */
function onInvalid(tag: string) {
  error.value = props.modelValue.includes(tag)
    ? t("features.account.tags.duplicated")
    : t("features.account.tags.tooMany", { max: TAG_MAX_COUNT });
}
</script>

<template>
  <UFormField :error="error ?? false" :label="label">
    <UInputTags
      :convert-value="trimTag"
      :disabled="disabled"
      :max="TAG_MAX_COUNT"
      :max-length="TAG_MAX_LENGTH"
      :model-value="modelValue"
      :placeholder="placeholder"
      class="w-full"
      @invalid="onInvalid"
      @update:model-value="onUpdate"
    />
  </UFormField>
</template>

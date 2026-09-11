<script lang="ts">
/**
 * 个人标签输入（我的账户基本信息卡，对齐 React 端 tag-input）：输入框回车或点添加按钮
 * 提交一个标签，Badge 展示可删除。约束与后端规约一致：最多 10 个、单项 trim 后 1-20 字符、
 * 重复标签忽略；超限在输入框下方给出内联错误提示。
 *
 * Nuxt UI 无 TagInput 组件，此为基于 UFormField / UInput / UBadge 拼装的项目级自定义组件
 * （AGENTS §21 组件优先级第二级）。
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
const draft = ref("");
const error = ref<string | null>(null);

/** 提交草稿：校验 → 去重 → 追加；非法时给出内联提示 */
function commitDraft() {
  const tag = draft.value.trim();

  if (!tag) return;
  if (tag.length > TAG_MAX_LENGTH) {
    error.value = t("features.account.tags.tooLong", { max: TAG_MAX_LENGTH });

    return;
  }
  if (props.modelValue.includes(tag)) {
    error.value = t("features.account.tags.duplicated");

    return;
  }
  if (props.modelValue.length >= TAG_MAX_COUNT) {
    error.value = t("features.account.tags.tooMany", { max: TAG_MAX_COUNT });

    return;
  }
  emit("update:modelValue", [...props.modelValue, tag]);
  draft.value = "";
  error.value = null;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    // 阻止表单默认提交（回车仅用于确认标签）
    event.preventDefault();
    commitDraft();
  } else if (
    event.key === "Backspace" &&
    draft.value === "" &&
    props.modelValue.length > 0
  ) {
    emit("update:modelValue", props.modelValue.slice(0, -1));
  }
}

function removeTag(tag: string) {
  emit(
    "update:modelValue",
    props.modelValue.filter((item) => item !== tag),
  );
}
</script>

<template>
  <UFormField :error="error ?? false" :label="label">
    <UInput
      v-model="draft"
      :disabled="disabled"
      :placeholder="placeholder"
      class="w-full"
      @keydown="onKeydown"
      @update:model-value="error = null"
    >
      <template #trailing>
        <UButton
          :aria-label="t('features.account.tags.add')"
          :disabled="disabled"
          color="neutral"
          icon="i-lucide-plus"
          size="xs"
          variant="ghost"
          @click="commitDraft"
        />
      </template>
    </UInput>
    <div
      v-if="!error && modelValue.length > 0"
      class="flex flex-wrap items-center gap-1 pt-2"
    >
      <UBadge
        v-for="tag in modelValue"
        :key="tag"
        class="gap-0.5 pe-0.5"
        color="neutral"
        variant="soft"
      >
        {{ tag }}
        <UButton
          :aria-label="t('features.account.tags.remove', { tag })"
          :disabled="disabled"
          class="size-4 rounded-full p-0"
          color="neutral"
          icon="i-lucide-x"
          size="xs"
          variant="ghost"
          @click="removeTag(tag)"
        />
      </UBadge>
    </div>
  </UFormField>
</template>

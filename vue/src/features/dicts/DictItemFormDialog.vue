<script setup lang="ts">
import type { DictItem } from "@/lib/api-types";

import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import {
  createDictItem,
  getDictErrorMessage,
  updateDictItem,
} from "./dict-api";

/**
 * 字典项新增/编辑弹窗（校验规则与 React 端 zod schema 对应）：
 * - value/label 必填（同类型下 value/label 唯一由后端 409 拦截）；
 * - i18nKey 可选：点分格式（menu.xxx.yyy），传 "" 表示清空；
 * - sort 0-999 整数；enabled 开关。
 */
const props = defineProps<{
  open: boolean;
  mode: "create" | "edit";
  item: DictItem | null;
  /** 所属字典类型 code（create 挂载目标） */
  typeCode: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  /** 保存成功（页面统一刷新右栏列表并回填业务缓存） */
  saved: [];
}>();

const FORM_ID = "dict-item-form";
const I18N_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;

const { t } = useI18n();
const toast = useToast();

const form = reactive({
  value: "",
  label: "",
  i18nKey: "",
  sort: 0,
  enabled: true,
});
const errors = reactive({ value: "", label: "", i18nKey: "" });
const submitting = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;

    const item = props.mode === "edit" ? props.item : null;

    form.value = item?.value ?? "";
    form.label = item?.label ?? "";
    form.i18nKey = item?.i18nKey ?? "";
    form.sort = item?.sort ?? 0;
    form.enabled = item?.enabled ?? true;

    errors.value = "";
    errors.label = "";
    errors.i18nKey = "";
  },
  { immediate: true },
);

const isEdit = computed(() => props.mode === "edit");

function close() {
  emit("update:open", false);
}

function validate(): boolean {
  errors.value =
    form.value.trim().length >= 1 && form.value.trim().length <= 50
      ? ""
      : t("features.dicts.item.form.valueInvalid");
  errors.label =
    form.label.trim().length >= 1 && form.label.trim().length <= 50
      ? ""
      : t("features.dicts.item.form.labelInvalid");
  errors.i18nKey =
    form.i18nKey.trim() === "" || I18N_KEY_PATTERN.test(form.i18nKey.trim())
      ? ""
      : t("features.dicts.item.form.i18nKeyFormat");

  return !Object.values(errors).some(Boolean);
}

async function onSubmit() {
  if (!validate()) return;

  submitting.value = true;

  const input = {
    value: form.value.trim(),
    label: form.label.trim(),
    i18nKey: form.i18nKey.trim(),
    sort: form.sort,
    enabled: form.enabled,
  };

  try {
    if (isEdit.value && props.item) {
      await updateDictItem(props.item.id, input);
    } else {
      await createDictItem(props.typeCode, input);
    }

    toast.add({
      color: "success",
      title: t(
        isEdit.value
          ? "features.dicts.message.itemUpdated"
          : "features.dicts.message.itemCreated",
      ),
    });
    emit("saved");
    close();
  } catch (error) {
    toast.add({
      color: "error",
      title: getDictErrorMessage(error),
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UModal
    :open="open"
    :dismissible="false"
    :title="
      t(
        isEdit
          ? 'features.dicts.item.form.title.edit'
          : 'features.dicts.item.form.title.create',
      )
    "
    :ui="{ content: 'sm:max-w-md', footer: 'justify-end' }"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        :id="FORM_ID"
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField
            :label="t('features.dicts.item.form.value')"
            :error="errors.value || undefined"
            required
          >
            <UInput
              v-model="form.value"
              :maxlength="50"
              :placeholder="t('features.dicts.item.form.valuePlaceholder')"
              class="w-full font-mono"
              variant="soft"
            />
          </UFormField>

          <UFormField
            :label="t('features.dicts.item.form.label')"
            :error="errors.label || undefined"
            required
          >
            <UInput
              v-model="form.label"
              :maxlength="50"
              :placeholder="t('features.dicts.item.form.labelPlaceholder')"
              class="w-full"
              variant="soft"
            />
          </UFormField>
        </div>

        <UFormField
          :label="t('features.dicts.item.form.i18nKey')"
          :error="errors.i18nKey || undefined"
          :description="t('features.dicts.item.form.i18nKeyHint')"
        >
          <UInput
            v-model="form.i18nKey"
            class="w-full"
            placeholder="dict.xxx.yyy"
            variant="soft"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField :label="t('common.column.sort')">
            <UInput
              v-model.number="form.sort"
              class="w-full"
              max="999"
              min="0"
              type="number"
              variant="soft"
            />
          </UFormField>

          <div
            class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
          >
            <span class="text-sm font-medium">
              {{ t("features.dicts.item.form.enabled") }}
            </span>
            <USwitch v-model="form.enabled" />
          </div>
        </div>
      </UForm>
    </template>

    <template #footer="{ close: onClose }">
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="onClose"
      />
      <UButton
        :form="FORM_ID"
        :label="
          submitting
            ? t('features.dicts.item.form.saving')
            : t('common.confirm')
        "
        :loading="submitting"
        type="submit"
      />
    </template>
  </UModal>
</template>

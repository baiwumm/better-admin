<script setup lang="ts">
import type { DictType } from "@/lib/api-types";

import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import {
  createDictType,
  getDictErrorMessage,
  updateDictType,
} from "./dict-api";

/**
 * 字典类型新增/编辑弹窗（校验规则与 React 端 zod schema 对应）：
 * - code 仅创建时可填且创建后不可变更（程序标识，风格同角色 code）；
 * - code/name 唯一性由后端 409 拦截（DICT_TYPE_CODE_EXISTS）；
 * - description 清空传 ""（后端部分更新 + ?? 兜底语义，null 被拒绝）。
 */
const props = defineProps<{
  open: boolean;
  mode: "create" | "edit";
  type: DictType | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  /** 保存成功（携带保存后的类型，页面据此切选中） */
  saved: [type: DictType, mode: "create" | "edit"];
}>();

const FORM_ID = "dict-type-form";
const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

const { t } = useI18n();
const toast = useToast();

const form = reactive({ code: "", name: "", description: "" });
const errors = reactive({ code: "", name: "" });
const submitting = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;

    form.code = props.type?.code ?? "";
    form.name = props.type?.name ?? "";
    form.description = props.type?.description ?? "";
    errors.code = "";
    errors.name = "";
  },
  { immediate: true },
);

const isEdit = computed(() => props.mode === "edit");

function close() {
  emit("update:open", false);
}

function validate(): boolean {
  errors.code =
    !isEdit.value &&
    form.code.trim().length >= 1 &&
    form.code.trim().length <= 50 &&
    CODE_PATTERN.test(form.code.trim())
      ? ""
      : t("features.dicts.type.form.codeInvalid");
  errors.name =
    form.name.trim().length >= 1 && form.name.trim().length <= 50
      ? ""
      : t("features.dicts.type.form.nameInvalid");

  return !Object.values(errors).some(Boolean);
}

async function onSubmit() {
  if (!validate()) return;

  submitting.value = true;

  try {
    const saved = isEdit.value
      ? await updateDictType(props.type!.code, {
          name: form.name,
          description: form.description,
        })
      : await createDictType({
          code: form.code,
          name: form.name,
          description: form.description,
        });

    toast.add({
      color: "success",
      duration: 5000,
      title: t(
        isEdit.value
          ? "features.dicts.message.typeUpdated"
          : "features.dicts.message.typeCreated",
      ),
    });
    emit("saved", saved, props.mode);
    close();
  } catch (error) {
    toast.add({
      color: "error",
      duration: 5000,
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
    :ui="{ content: 'sm:max-w-md' }"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #content>
      <form
        :id="FORM_ID"
        class="flex flex-col gap-4 p-6"
        @submit.prevent="onSubmit"
      >
        <h2 class="text-lg font-semibold">
          {{
            t(
              isEdit
                ? "features.dicts.type.form.title.edit"
                : "features.dicts.type.form.title.create",
            )
          }}
        </h2>

        <UFormField
          :label="t('features.dicts.type.form.code')"
          :error="errors.code || undefined"
          :disabled="isEdit"
          required
        >
          <UInput
            v-model="form.code"
            :maxlength="50"
            :placeholder="t('features.dicts.type.form.codePlaceholder')"
            class="w-full font-mono"
            variant="soft"
          />
        </UFormField>

        <UFormField
          :label="t('features.dicts.type.form.name')"
          :error="errors.name || undefined"
          required
        >
          <UInput
            v-model="form.name"
            :maxlength="50"
            :placeholder="t('features.dicts.type.form.namePlaceholder')"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <UFormField :label="t('features.dicts.type.form.description')">
          <UTextarea
            v-model="form.description"
            :rows="3"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            type="button"
            @click="close"
          />
          <UButton
            :form="FORM_ID"
            :label="
              submitting
                ? t('features.dicts.type.form.saving')
                : t('common.confirm')
            "
            :loading="submitting"
            type="submit"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { Role } from "@/lib/api-types";

import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import { createRole, getRoleErrorMessage, updateRole } from "./role-api";

import { SUPER_ADMIN_ROLE_CODE } from "@/lib/constants";

/**
 * 角色新增/编辑弹窗（对齐 React 端 role-form-dialog，校验规则与 zod schema
 * 一一对应；Vue 端用手动校验）。
 *
 * - code 仅创建时可填且创建后不可变更（角色 code 为程序标识，后端锁定）；
 * - name/code 唯一性由后端 409（ROLE_NAME_EXISTS / ROLE_CODE_EXISTS）拦截；
 * - super_admin 编辑态仅 description 可改（授权/删除另有 403 兜底）。
 */
const props = defineProps<{
  open: boolean;
  mode: "create" | "edit";
  /** edit：被编辑的角色；create：null */
  role: Role | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  /** 保存成功（页面统一做列表失效与提示） */
  saved: [];
}>();

const FORM_ID = "role-form";

/** 角色标识：字母开头，允许数字/中划线/下划线（与菜单/字典 code 风格一致） */
const CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

const { t } = useI18n();
const toast = useToast();

const form = reactive({
  code: "",
  name: "",
  description: "",
  sort: 0,
  enabled: true,
});
const errors = reactive({ code: "", name: "", description: "" });
const submitting = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;

    const role = props.role;

    form.code = role?.code ?? "";
    form.name = role?.name ?? "";
    form.description = role?.description ?? "";
    form.sort = role?.sort ?? 0;
    form.enabled = role?.enabled ?? true;

    errors.code = "";
    errors.name = "";
    errors.description = "";
  },
  { immediate: true },
);

const isEdit = computed(() => props.mode === "edit");
const isSuperAdmin = computed(
  () => isEdit.value && props.role?.code === SUPER_ADMIN_ROLE_CODE,
);

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
      : t("features.roles.form.codeInvalid");
  errors.name =
    form.name.trim().length >= 1 && form.name.trim().length <= 50
      ? ""
      : t("features.roles.form.nameInvalid");
  errors.description =
    form.description.trim().length <= 200
      ? ""
      : t("features.roles.form.descriptionInvalid");

  return !Object.values(errors).some(Boolean);
}

async function onSubmit() {
  if (!validate()) return;

  submitting.value = true;

  try {
    const input = {
      name: form.name,
      description: form.description || undefined,
      sort: form.sort,
      enabled: form.enabled,
    };

    if (isEdit.value && props.role) {
      await updateRole(props.role.id, input);
    } else {
      await createRole({ code: form.code, ...input });
    }

    toast.add({
      color: "success",
      duration: 5000,
      title: t(
        isEdit.value
          ? "features.roles.message.updateSuccess"
          : "features.roles.message.createSuccess",
      ),
    });
    emit("saved");
    close();
  } catch (error) {
    toast.add({
      color: "error",
      duration: 5000,
      title: getRoleErrorMessage(error),
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
                ? "features.roles.form.title.edit"
                : "features.roles.form.title.create",
            )
          }}
        </h2>

        <UFormField
          :label="t('features.roles.form.code')"
          :error="errors.code || undefined"
          :description="isEdit ? t('features.roles.form.codeHint') : undefined"
          :disabled="isEdit"
          required
        >
          <UInput
            v-model="form.code"
            :maxlength="50"
            :placeholder="t('features.roles.form.codePlaceholder')"
            class="w-full font-mono"
            variant="soft"
          />
        </UFormField>

        <UFormField
          :label="t('features.roles.form.name')"
          :error="errors.name || undefined"
          :disabled="isSuperAdmin"
          required
        >
          <UInput
            v-model="form.name"
            :maxlength="50"
            :placeholder="t('features.roles.form.namePlaceholder')"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <UFormField
          :label="t('features.roles.form.description')"
          :error="errors.description || undefined"
        >
          <UTextarea
            v-model="form.description"
            :maxlength="200"
            :placeholder="t('features.roles.form.descriptionPlaceholder')"
            :rows="3"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField :label="t('common.column.sort')">
            <UInput
              v-model.number="form.sort"
              :disabled="isSuperAdmin"
              class="w-full"
              type="number"
              variant="soft"
            />
          </UFormField>

          <div
            class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
          >
            <span class="text-sm font-medium">
              {{ t("features.roles.form.enabled") }}
            </span>
            <USwitch v-model="form.enabled" :disabled="isSuperAdmin" />
          </div>
        </div>

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
              submitting ? t('features.roles.form.saving') : t('common.confirm')
            "
            :loading="submitting"
            type="submit"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>

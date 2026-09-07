<script setup lang="ts">
import type { User } from "@/lib/api-types";

import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import { getUserErrorMessage, resetUserPassword } from "./user-api";
import PasswordField from "./PasswordField.vue";

/**
 * 重置密码弹窗：POST /users/:id/reset-password（RESET_PASSWORD 位）。
 *
 * 后端行为：bcrypt 重新散列 + tokenVersion+1 + 物理清空该用户全部
 * refreshTokens——成功后该用户所有已登录设备即刻下线，需重新登录。
 */
const props = defineProps<{
  open: boolean;
  user: User | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  /** 重置成功（页面统一做列表失效） */
  saved: [];
}>();

const { t } = useI18n();
const toast = useToast();

const form = reactive({ newPassword: "", confirmPassword: "" });
const errors = reactive({ newPassword: "", confirmPassword: "" });
const submitting = ref(false);

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.newPassword = "";
      form.confirmPassword = "";
      errors.newPassword = "";
      errors.confirmPassword = "";
    }
  },
);

const displayName = computed(
  () => props.user && (props.user.displayName || props.user.username),
);

function close() {
  emit("update:open", false);
}

async function onSubmit() {
  errors.newPassword =
    form.newPassword.length >= 6
      ? ""
      : t("features.users.form.passwordInvalid");
  errors.confirmPassword =
    form.newPassword === form.confirmPassword
      ? ""
      : t("features.users.form.confirmPasswordMismatch");

  if (errors.newPassword || errors.confirmPassword || !props.user) return;

  submitting.value = true;

  try {
    await resetUserPassword(props.user.id, form.newPassword);

    toast.add({
      color: "success",
      title: t("features.users.resetPassword.success"),
    });
    emit("saved");
    close();
  } catch (error) {
    toast.add({
      color: "error",
      title: getUserErrorMessage(error),
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
    :title="t('features.users.resetPassword.title')"
    :ui="{ content: 'sm:max-w-md', footer: 'justify-end' }"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <p class="text-muted text-sm">
          {{
            t("features.users.resetPassword.desc", {
              name: displayName ?? "",
            })
          }}
        </p>

        <PasswordField
          v-model="form.newPassword"
          :error="errors.newPassword || undefined"
          :label="t('features.users.resetPassword.newPassword')"
          :placeholder="t('features.users.form.passwordPlaceholder')"
        />

        <PasswordField
          v-model="form.confirmPassword"
          :error="errors.confirmPassword || undefined"
          :label="t('features.users.resetPassword.confirmPassword')"
          :placeholder="t('features.users.resetPassword.confirmPassword')"
        />
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
        :label="
          submitting
            ? t('features.users.resetPassword.saving')
            : t('features.users.resetPassword.submit')
        "
        :loading="submitting"
        type="submit"
      />
    </template>
  </UModal>
</template>

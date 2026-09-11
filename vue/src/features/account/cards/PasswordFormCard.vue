<script setup lang="ts">
import type { FormSubmitEvent } from "@nuxt/ui";

import * as z from "zod";
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import { getAccountErrorMessage, updateAccountPassword } from "../account-api";
import PasswordStrength from "../PasswordStrength.vue";

import PasswordField from "@/components/common/PasswordField.vue";
import { getPasswordError } from "@/lib/password-validation";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 密码卡（对齐 React 端 password-form-card）：新密码按密码策略（契约 v1.8.0）预检，
 * 含「不能包含本人用户名」；「不能与当前密码相同」前端无法比对，由后端 400
 * PASSWORD_SAME_AS_OLD 兜底提示。成功后端全端强制下线（tokenVersion+1），
 * 前端清会话跳登录页。
 */
const FORM_ID = "account-password-form";

const { t } = useI18n();
const toast = useToast();
const auth = useAuthStore();

const schema = z
  .object({
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.currentPassword.length < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["currentPassword"],
        message: t("features.account.currentPasswordRequired"),
      });
    }

    const passwordError = getPasswordError(
      data.newPassword,
      auth.user?.username,
    );

    if (passwordError) {
      ctx.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: t(`features.account.password.new.${passwordError}`),
      });
    }

    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: t("features.account.password.confirmPasswordMismatch"),
      });
    }
  });

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
});
const submitting = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true;

  try {
    await updateAccountPassword({
      currentPassword: event.data.currentPassword,
      newPassword: event.data.newPassword,
    });

    // 本会话已被服务端撤销（tokenVersion+1）：清本地会话 → 登录页
    toast.add({
      color: "success",
      title: t("features.account.password.updateSuccess"),
    });
    auth.clearSession();
    window.location.assign("/sign-in");
  } catch (error) {
    toast.add({ color: "error", title: getAccountErrorMessage(error) });
    submitting.value = false;
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-bold">{{ t("features.account.password.title") }}</h3>
      <p class="text-muted text-xs">
        {{ t("features.account.password.description") }}
      </p>
    </template>

    <UForm
      :id="FORM_ID"
      :schema="schema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="onSubmit"
    >
      <PasswordField
        v-model="state.currentPassword"
        :label="t('features.account.currentPassword')"
        :placeholder="t('features.account.currentPasswordPlaceholder')"
        auto-complete="current-password"
        name="currentPassword"
      />

      <div class="flex flex-col gap-1">
        <PasswordField
          v-model="state.newPassword"
          :description="t('features.account.password.newPasswordHint')"
          :label="t('features.account.password.newPassword')"
          :placeholder="t('features.account.password.newPasswordPlaceholder')"
          :ui="{ help: 'text-dimmed text-xs' }"
          auto-complete="new-password"
          name="newPassword"
        />
        <!-- 5 档强度指示（未输入不渲染，见 PasswordStrength） -->
        <PasswordStrength :password="state.newPassword" />
      </div>

      <PasswordField
        v-model="state.confirmPassword"
        :label="t('features.account.password.confirmPassword')"
        :placeholder="t('features.account.password.confirmPasswordPlaceholder')"
        auto-complete="new-password"
        name="confirmPassword"
      />
    </UForm>

    <template #footer>
      <div class="flex justify-end">
        <UButton
          :form="FORM_ID"
          :label="
            submitting
              ? t('features.account.password.updating')
              : t('features.account.password.update')
          "
          :loading="submitting"
          size="sm"
          type="submit"
        />
      </div>
    </template>
  </UCard>
</template>

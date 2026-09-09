<script setup lang="ts">
import type { User } from "@/lib/api-types";
import type { FormSubmitEvent } from "@nuxt/ui";

import * as z from "zod";
import { computed, h, reactive, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import { getUserErrorMessage, resetUserPassword } from "./user-api";
import PasswordField from "./PasswordField.vue";

import Spinner from "@/components/ui/spinner/index.vue";
import { PASSWORD_MAX_LENGTH } from "@/lib/constants";

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

const FORM_ID = "user-reset-password-form";

const { t } = useI18n();
const toast = useToast();

// 一致性跨字段校验：不匹配时错误挂 confirmPassword 字段；
// 6-72 与后端契约 v1.7.3 对齐（72 为 bcrypt 输入上限）
const schema = z
  .object({
    newPassword: z
      .string()
      .min(6, { error: () => t("features.users.form.passwordInvalid") })
      .max(PASSWORD_MAX_LENGTH, {
        error: () => t("features.users.form.passwordInvalid"),
      }),
    confirmPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: t("features.users.form.confirmPasswordMismatch"),
      });
    }
  });

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({ newPassword: "", confirmPassword: "" });
const formRef = useTemplateRef("formRef");
const submitting = ref(false);

watch(
  () => props.open,
  (open) => {
    if (open) {
      state.newPassword = "";
      state.confirmPassword = "";
      formRef.value?.clear();
    }
  },
);

const displayName = computed(
  () => props.user && (props.user.displayName || props.user.username),
);

function close() {
  emit("update:open", false);
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!props.user) return;

  submitting.value = true;

  // toast.promise 形态（对齐 React 端）：重置全程 loading toast，
  // 完成后原位替换为成功/失败；duration 0 保证请求返回前不消失
  //（update 会重置计时回落全局时长）；icon 用 Spinner 组件（toast
  // 内容支持 VNode），自带旋转动画
  const savingToast = toast.add({
    title: t("features.users.resetPassword.saving"),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  try {
    await resetUserPassword(props.user.id, event.data.newPassword);

    toast.update(savingToast.id, {
      title: t("features.users.resetPassword.success"),
      icon: "i-lucide-check",
      color: "success",
    });
    emit("saved");
    close();
  } catch (error) {
    toast.update(savingToast.id, {
      title: getUserErrorMessage(error),
      icon: "i-lucide-x",
      color: "error",
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
      <UForm
        :id="FORM_ID"
        ref="formRef"
        :schema="schema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <p class="text-muted text-sm">
          {{
            t("features.users.resetPassword.desc", {
              name: displayName ?? "",
            })
          }}
        </p>

        <PasswordField
          v-model="state.newPassword"
          :label="t('features.users.resetPassword.newPassword')"
          :placeholder="t('features.users.form.passwordPlaceholder')"
          name="newPassword"
        />

        <PasswordField
          v-model="state.confirmPassword"
          :label="t('features.users.resetPassword.confirmPassword')"
          :placeholder="t('features.users.resetPassword.confirmPassword')"
          name="confirmPassword"
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
        :form="FORM_ID"
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

<script setup lang="ts">
import type { AccountProfile } from "@/lib/api-types";
import type { FormSubmitEvent } from "@nuxt/ui";

import * as z from "zod";
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import { getAccountErrorMessage, updateAccountEmail } from "../account-api";

import PasswordField from "@/components/common/PasswordField.vue";

/** 邮箱卡（对齐 React 端 email-form-card）：新邮箱 + 当前密码确认（唯一性由后端校验，冲突 409） */
const props = defineProps<{ profile: AccountProfile }>();

const emit = defineEmits<{ saved: [updated: AccountProfile] }>();

const FORM_ID = "account-email-form";

const { t } = useI18n();
const toast = useToast();

const schema = z
  .object({
    email: z.string(),
    currentPassword: z.string(),
  })
  .superRefine((data, ctx) => {
    if (!z.email().safeParse(data.email.trim()).success) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: t("features.account.email.emailInvalid"),
      });
    }

    if (data.currentPassword.length < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["currentPassword"],
        message: t("features.account.currentPasswordRequired"),
      });
    }
  });

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  email: props.profile.email,
  currentPassword: "",
});
const submitting = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true;

  try {
    const updated = await updateAccountEmail({
      email: event.data.email.trim(),
      currentPassword: event.data.currentPassword,
    });

    toast.add({
      color: "success",
      title: t("features.account.email.updateSuccess"),
    });
    state.currentPassword = "";
    emit("saved", updated);
  } catch (error) {
    toast.add({ color: "error", title: getAccountErrorMessage(error) });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="font-bold">{{ t("features.account.email.title") }}</h3>
      <p class="text-muted text-xs">
        {{ t("features.account.email.description") }}
      </p>
    </template>

    <UForm
      :id="FORM_ID"
      :schema="schema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="onSubmit"
    >
      <UFormField :label="t('features.account.email.newEmail')" name="email">
        <UInput
          v-model="state.email"
          :maxlength="254"
          :placeholder="t('features.account.email.emailPlaceholder')"
          autocomplete="email"
          class="w-full"
          type="email"
        />
      </UFormField>

      <PasswordField
        v-model="state.currentPassword"
        :label="t('features.account.currentPassword')"
        :placeholder="t('features.account.currentPasswordPlaceholder')"
        auto-complete="current-password"
        name="currentPassword"
      />
    </UForm>

    <template #footer>
      <div class="flex justify-end">
        <UButton
          :form="FORM_ID"
          :label="
            submitting
              ? t('features.account.email.updating')
              : t('features.account.email.update')
          "
          :loading="submitting"
          size="sm"
          type="submit"
        />
      </div>
    </template>
  </UCard>
</template>

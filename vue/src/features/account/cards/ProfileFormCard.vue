<script setup lang="ts">
import type { AccountProfile } from "@/lib/api-types";
import type { FormSubmitEvent } from "@nuxt/ui";

import * as z from "zod";
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import { getAccountErrorMessage, updateAccountProfile } from "../account-api";
import TagInput from "../TagInput.vue";

/** 基本信息卡（对齐 React 端 profile-form-card）：username 只读，displayName / phone / tags 可编辑 */
const props = defineProps<{ profile: AccountProfile }>();

const emit = defineEmits<{ saved: [updated: AccountProfile] }>();

const FORM_ID = "account-profile-form";

const { t } = useI18n();
const toast = useToast();

// 长度上限与后端 DTO 对齐（契约 v1.8.1）；手机号收窄为 11 位大陆手机号标准格式
const DISPLAY_NAME_MAX_LENGTH = 50;
const PHONE_MAX_LENGTH = 11;
// 选填：为空合法；填写时必须是 11 位大陆手机号（1 开头，第二位 3-9）
const PHONE_PATTERN = /^1[3-9]\d{9}$/;

// 错误文案在校验时经 t() 取词（随语言切换）；规则与 React 端 zod schema 一致
const schema = z
  .object({
    displayName: z.string(),
    phone: z.string(),
    tags: z.array(z.string()),
  })
  .superRefine((data, ctx) => {
    const displayName = data.displayName.trim();

    if (
      displayName.length < 1 ||
      displayName.length > DISPLAY_NAME_MAX_LENGTH
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["displayName"],
        message: t("features.account.profile.displayNameInvalid"),
      });
    }

    const phone = data.phone.trim();

    if (phone !== "" && !PHONE_PATTERN.test(phone)) {
      ctx.addIssue({
        code: "custom",
        path: ["phone"],
        message: t("features.account.profile.phoneInvalid"),
      });
    }
  });

type Schema = z.output<typeof schema>;

// 卡片由页面按 profile.updatedAt 作 key 重建，state 只需在 setup 初始化一次
const state = reactive<Schema>({
  displayName: props.profile.displayName,
  phone: props.profile.phone ?? "",
  tags: [...props.profile.tags],
});
const submitting = ref(false);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true;

  try {
    const updated = await updateAccountProfile({
      displayName: event.data.displayName.trim(),
      phone: event.data.phone.trim() ? event.data.phone.trim() : null,
      tags: event.data.tags,
    });

    toast.add({
      color: "success",
      title: t("features.account.profile.saveSuccess"),
    });
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
      <h3 class="font-bold">{{ t("features.account.profile.title") }}</h3>
      <p class="text-muted text-xs">
        {{ t("features.account.profile.description") }}
      </p>
    </template>

    <UForm
      :id="FORM_ID"
      :schema="schema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="onSubmit"
    >
      <UFormField
        :help="t('features.account.profile.usernameHint')"
        :label="t('features.account.profile.username')"
      >
        <UInput :model-value="profile.username" class="w-full" disabled />
      </UFormField>

      <UFormField
        :label="t('features.account.profile.displayName')"
        name="displayName"
      >
        <!-- trailing 实时字数（与用户表单姓名一致，上限与后端 @Length(1, 50) 对齐） -->
        <UInput
          v-model="state.displayName"
          :maxlength="DISPLAY_NAME_MAX_LENGTH"
          :placeholder="t('features.account.profile.displayNamePlaceholder')"
          :ui="{ base: 'pe-13' }"
          class="w-full"
        >
          <template #trailing>
            <span class="text-dimmed text-xs tabular-nums">
              {{ state.displayName.length }}/{{ DISPLAY_NAME_MAX_LENGTH }}
            </span>
          </template>
        </UInput>
      </UFormField>

      <UFormField :label="t('features.account.profile.phone')" name="phone">
        <UInput
          v-model="state.phone"
          :maxlength="PHONE_MAX_LENGTH"
          :placeholder="t('features.account.profile.phonePlaceholder')"
          class="w-full"
          inputmode="tel"
          type="tel"
        />
      </UFormField>

      <TagInput
        v-model="state.tags"
        :disabled="submitting"
        :label="t('features.account.tags.label')"
        :placeholder="t('features.account.tags.placeholder')"
      />
    </UForm>

    <template #footer>
      <div class="flex justify-end">
        <UButton
          :form="FORM_ID"
          :label="
            submitting
              ? t('features.account.profile.saving')
              : t('features.account.profile.save')
          "
          :loading="submitting"
          size="sm"
          type="submit"
        />
      </div>
    </template>
  </UCard>
</template>

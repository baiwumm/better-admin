<script setup lang="ts">
import type { AccountProfile } from "@/lib/api-types";
import type { FormSubmitEvent } from "@nuxt/ui";

import * as z from "zod";
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import { getAccountErrorMessage, updateAccountProfile } from "../account-api";

import { openExternalLink } from "@/lib/profile-links";

/**
 * 个人链接卡（对齐 React 端 profile-links-card）：固定协议/平台前缀的输入框，
 * 存裸值（域名 / 用户名），展示 URL 由前端拼接。
 */
const props = defineProps<{ profile: AccountProfile }>();

const emit = defineEmits<{ saved: [updated: AccountProfile] }>();

const FORM_ID = "account-links-form";

const { t } = useI18n();
const toast = useToast();

/** 与后端同规约：先剥协议/平台前缀再校验，空串归一为 null（清空） */
const WEBSITE_PATTERN =
  /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,63}(?::\d{1,5})?(?:\/\S*)?$/;
const GITHUB_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const X_PATTERN = /^[a-zA-Z0-9_]{4,15}$/;

const stripWebsite = (v: string) => v.replace(/^https?:\/\//i, "");
const stripGithub = (v: string) =>
  v.replace(/^(?:https?:\/\/)?(?:www\.)?github\.com\//i, "");
const stripX = (v: string) =>
  v.replace(/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\//i, "");

type LinkField = "website" | "githubUsername" | "xUsername";

const linkFields: {
  name: LinkField;
  labelKey: string;
  prefix: string;
  placeholder: string;
  errorKey: string;
  maxLength: number;
  pattern: RegExp;
  strip: (v: string) => string;
}[] = [
  {
    name: "website",
    labelKey: "features.account.links.website",
    prefix: "https://",
    placeholder: "baidu.com",
    errorKey: "features.account.links.websiteInvalid",
    maxLength: 255,
    pattern: WEBSITE_PATTERN,
    strip: stripWebsite,
  },
  {
    name: "githubUsername",
    labelKey: "features.account.links.github",
    prefix: "https://github.com/",
    placeholder: "baiwumm",
    errorKey: "features.account.links.githubInvalid",
    maxLength: 60,
    pattern: GITHUB_PATTERN,
    strip: stripGithub,
  },
  {
    name: "xUsername",
    labelKey: "features.account.links.x",
    prefix: "https://x.com/",
    placeholder: "baiwumm",
    errorKey: "features.account.links.xInvalid",
    maxLength: 40,
    pattern: X_PATTERN,
    strip: stripX,
  },
];

// 校验：剥前缀后匹配各自 pattern（空串合法 = 清空）；输出：裸值或 null
const schema = z
  .object({
    website: z.string(),
    githubUsername: z.string(),
    xUsername: z.string(),
  })
  .superRefine((data, ctx) => {
    for (const field of linkFields) {
      const bare = field.strip(data[field.name].trim());

      if (bare !== "" && !field.pattern.test(bare)) {
        ctx.addIssue({
          code: "custom",
          path: [field.name],
          message: t(field.errorKey),
        });
      }
    }
  })
  .transform((data) => {
    const toBare = (field: (typeof linkFields)[number]) => {
      const bare = field.strip(data[field.name].trim());

      return bare === "" ? null : bare;
    };

    return {
      website: toBare(linkFields[0]!),
      githubUsername: toBare(linkFields[1]!),
      xUsername: toBare(linkFields[2]!),
    };
  });

type Schema = z.output<typeof schema>;
type FormState = z.input<typeof schema>;

const state = reactive<FormState>({
  website: props.profile.website ?? "",
  githubUsername: props.profile.githubUsername ?? "",
  xUsername: props.profile.xUsername ?? "",
});
const submitting = ref(false);

/** 按提交同款规则剥前缀后拼出预览 URL（输入为空返回 null） */
function buildPreviewUrl(field: (typeof linkFields)[number]): string | null {
  const bare = field.strip(state[field.name].trim());

  return bare === "" ? null : `${field.prefix}${bare}`;
}

function openPreview(field: (typeof linkFields)[number]) {
  const url = buildPreviewUrl(field);

  if (url) openExternalLink(url);
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true;

  try {
    const updated = await updateAccountProfile(event.data);

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
      <h3 class="font-bold">{{ t("features.account.links.title") }}</h3>
      <p class="text-muted text-xs">
        {{ t("features.account.links.description") }}
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
        v-for="field in linkFields"
        :key="field.name"
        :label="t(field.labelKey)"
        :name="field.name"
      >
        <UFieldGroup class="w-full">
          <UBadge
            :label="field.prefix"
            class="shrink-0 font-normal"
            color="neutral"
            variant="outline"
          />
          <UInput
            v-model="state[field.name]"
            :maxlength="field.maxLength"
            :placeholder="field.placeholder"
            class="flex-1"
          />
          <UButton
            :aria-label="t('features.account.links.open')"
            :disabled="buildPreviewUrl(field) === null"
            color="neutral"
            icon="i-lucide-external-link"
            variant="outline"
            @click="openPreview(field)"
          />
        </UFieldGroup>
      </UFormField>
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

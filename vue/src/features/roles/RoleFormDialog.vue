<script setup lang="ts">
import type { Role } from "@/lib/api-types";
import type { FormSubmitEvent } from "@nuxt/ui";

import * as z from "zod";
import { computed, h, reactive, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import { createRole, getRoleErrorMessage, updateRole } from "./role-api";

import Spinner from "@/components/ui/spinner/index.vue";
import { SUPER_ADMIN_ROLE_CODE, DICT_TYPE_CODE_PATTERN } from "@/lib/constants";

/**
 * 角色新增/编辑弹窗（对齐 React 端 role-form-dialog）：
 * UForm + zod schema 校验（官方范式，@submit 仅在校验通过后触发，
 * event.data 为校验转换后的值）。
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
const CODE_MAX_LENGTH = 50;
const NAME_MAX_LENGTH = 20;
const DESCRIPTION_MAX_LENGTH = 200;

const { t } = useI18n();
const toast = useToast();

const isEdit = computed(() => props.mode === "edit");
const isSuperAdmin = computed(
  () => isEdit.value && props.role?.code === SUPER_ADMIN_ROLE_CODE,
);

// 校验消息用函数延迟求值：语言切换后错误文案跟随当前 locale
const schema = z
  .object({
    code: z.string().trim(),
    name: z
      .string()
      .trim()
      .min(1, { error: () => t("features.roles.form.nameInvalid") })
      .max(50, { error: () => t("features.roles.form.nameInvalid") }),
    description: z
      .string()
      .trim()
      .max(200, {
        error: () => t("features.roles.form.descriptionInvalid"),
      }),
    sort: z.number(),
    enabled: z.boolean(),
  })
  // code 仅创建时校验（编辑态锁定不可改，superRefine 运行时读取 isEdit）
  .superRefine((data, ctx) => {
    if (!isEdit.value && !DICT_TYPE_CODE_PATTERN.test(data.code)) {
      ctx.addIssue({
        code: "custom",
        path: ["code"],
        message: t("features.roles.form.codeInvalid"),
      });
    }
  });

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  code: "",
  name: "",
  description: "",
  sort: 0,
  enabled: true,
});
const formRef = useTemplateRef("formRef");
const submitting = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;

    const role = props.role;

    state.code = role?.code ?? "";
    state.name = role?.name ?? "";
    state.description = role?.description ?? "";
    state.sort = role?.sort ?? 0;
    state.enabled = role?.enabled ?? true;
    formRef.value?.clear();
  },
  { immediate: true },
);

function close() {
  emit("update:open", false);
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  submitting.value = true;

  // toast.promise 形态（对齐 React 端）：保存全程 loading toast，
  // 完成后原位替换为成功/失败；duration 0 保证请求返回前不消失
  //（update 会重置计时回落全局时长）；icon 用 Spinner 组件（toast
  // 内容支持 VNode），自带旋转动画
  const savingToast = toast.add({
    title: t("features.roles.form.saving"),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  try {
    const input = {
      name: event.data.name,
      description: event.data.description || undefined,
      sort: event.data.sort,
      enabled: event.data.enabled,
    };

    if (isEdit.value && props.role) {
      await updateRole(props.role.id, input);
    } else {
      await createRole({ code: event.data.code, ...input });
    }

    toast.update(savingToast.id, {
      title: t(
        isEdit.value
          ? "features.roles.message.updateSuccess"
          : "features.roles.message.createSuccess",
      ),
      icon: "i-lucide-check",
      color: "success",
    });
    emit("saved");
    close();
  } catch (error) {
    toast.update(savingToast.id, {
      title: getRoleErrorMessage(error),
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
    :title="
      t(
        isEdit
          ? 'features.roles.form.title.edit'
          : 'features.roles.form.title.create',
      )
    "
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
        <UFormField
          :label="t('features.roles.form.code')"
          :description="isEdit ? t('features.roles.form.codeHint') : undefined"
          :disabled="isEdit"
          name="code"
          required
        >
          <UInput
            v-model="state.code"
            :maxlength="CODE_MAX_LENGTH"
            :placeholder="t('features.roles.form.codePlaceholder')"
            class="w-full"
            :ui="{ base: 'pe-13' }"
          >
            <template #trailing>
              <span class="text-dimmed text-xs tabular-nums">
                {{ state.code.length }}/{{ CODE_MAX_LENGTH }}
              </span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="t('features.roles.form.name')"
          :disabled="isSuperAdmin"
          name="name"
          required
        >
          <UInput
            v-model="state.name"
            :maxlength="NAME_MAX_LENGTH"
            :placeholder="t('features.roles.form.namePlaceholder')"
            class="w-full"
            :ui="{ base: 'pe-13' }"
          >
            <template #trailing>
              <span class="text-dimmed text-xs tabular-nums">
                {{ state.name.length }}/{{ NAME_MAX_LENGTH }}
              </span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :label="t('features.roles.form.description')"
          name="description"
        >
          <div class="flex flex-col gap-1">
            <UTextarea
              v-model="state.description"
              :maxlength="DESCRIPTION_MAX_LENGTH"
              :placeholder="t('features.roles.form.descriptionPlaceholder')"
              :rows="4"
              class="w-full"
            />
            <span class="self-end text-xs text-muted">
              {{ state.description.length }}/{{ DESCRIPTION_MAX_LENGTH }}
            </span>
          </div>
        </UFormField>

        <UFormField :label="t('common.column.sort')">
          <UInputNumber v-model="state.sort" :min="0" class="w-full" />
        </UFormField>

        <div
          class="border-default flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
        >
          <span class="text-sm font-medium">
            {{ t("features.roles.form.enabled") }}
          </span>
          <USwitch
            v-model="state.enabled"
            :disabled="isSuperAdmin"
            unchecked-icon="i-lucide-x"
            checked-icon="i-lucide-check"
          />
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
          submitting ? t('features.roles.form.saving') : t('common.confirm')
        "
        :loading="submitting"
        type="submit"
      />
    </template>
  </UModal>
</template>

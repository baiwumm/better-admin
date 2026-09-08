<script setup lang="ts">
import type { DictType } from "@/lib/api-types";
import type { FormSubmitEvent } from "@nuxt/ui";

import * as z from "zod";
import { computed, h, reactive, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import Spinner from "@/components/ui/spinner/index.vue";

import {
  createDictType,
  getDictErrorMessage,
  updateDictType,
} from "./dict-api";
import { DICT_TYPE_CODE_PATTERN } from "@/lib/constants";

/**
 * 字典类型新增/编辑弹窗：UForm + zod schema 校验（官方范式，@submit 仅在
 * 校验通过后触发，event.data 为校验转换后的值）。
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
const CODE_MAX_LENGTH = 50;
const NAME_MAX_LENGTH = 20;
const DESCRIPTION_MAX_LENGTH = 200;

const { t } = useI18n();
const toast = useToast();

const isEdit = computed(() => props.mode === "edit");

// 校验消息用函数延迟求值：语言切换后错误文案跟随当前 locale
const schema = z
  .object({
    code: z.string().trim(),
    name: z
      .string()
      .trim()
      .min(1, { error: () => t("features.dicts.form.nameInvalid") })
      .max(NAME_MAX_LENGTH, {
        error: () => t("features.dicts.form.nameInvalid"),
      }),
    description: z.string().trim().max(DESCRIPTION_MAX_LENGTH),
  })
  // code 仅创建时校验（编辑态锁定不可改，superRefine 运行时读取 isEdit）
  .superRefine((data, ctx) => {
    if (!isEdit.value && !DICT_TYPE_CODE_PATTERN.test(data.code)) {
      ctx.addIssue({
        code: "custom",
        path: ["code"],
        message: t("features.dicts.form.codeFormat"),
      });
    }
  });

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({ code: "", name: "", description: "" });
const formRef = useTemplateRef("formRef");
const submitting = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;

    state.code = props.type?.code ?? "";
    state.name = props.type?.name ?? "";
    state.description = props.type?.description ?? "";
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
    title: t("features.dicts.form.saving"),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  try {
    const saved = isEdit.value
      ? await updateDictType(props.type!.code, {
          name: event.data.name,
          description: event.data.description,
        })
      : await createDictType({
          code: event.data.code,
          name: event.data.name,
          description: event.data.description,
        });

    toast.update(savingToast.id, {
      title: t(
        isEdit.value
          ? "features.dicts.message.typeUpdated"
          : "features.dicts.message.typeCreated",
      ),
      icon: "i-lucide-check",
      color: "success",
    });
    emit("saved", saved, props.mode);
    close();
  } catch (error) {
    toast.update(savingToast.id, {
      title: getDictErrorMessage(error),
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
          ? 'features.dicts.form.title.editType'
          : 'features.dicts.form.title.createType',
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
          :label="t('features.dicts.form.code')"
          :disabled="isEdit"
          name="code"
          required
          :help="t('features.dicts.form.codeHint')"
          :ui="{ help: 'text-xs' }"
        >
          <UInput
            v-model="state.code"
            :maxlength="CODE_MAX_LENGTH"
            placeholder="user_status"
            :ui="{ base: 'pe-13' }"
            class="w-full"
          >
            <template #trailing>
              <span class="text-dimmed text-xs tabular-nums">
                {{ state.code.length }}/{{ CODE_MAX_LENGTH }}
              </span>
            </template>
          </UInput>
        </UFormField>

        <UFormField :label="t('features.dicts.form.name')" name="name" required>
          <UInput
            v-model="state.name"
            :maxlength="NAME_MAX_LENGTH"
            :placeholder="t('features.dicts.form.namePlaceholder')"
            :ui="{ base: 'pe-13' }"
            class="w-full"
          >
            <template #trailing>
              <span class="text-dimmed text-xs tabular-nums">
                {{ state.name.length }}/{{ NAME_MAX_LENGTH }}
              </span>
            </template>
          </UInput>
        </UFormField>

        <UFormField :label="t('features.dicts.form.description')">
          <div class="flex flex-col gap-1">
            <UTextarea
              v-model="state.description"
              :maxlength="DESCRIPTION_MAX_LENGTH"
              :placeholder="t('features.dicts.form.descriptionPlaceholder')"
              :rows="4"
              class="w-full"
            />
            <span class="self-end text-xs text-muted">
              {{ state.description.length }}/{{ DESCRIPTION_MAX_LENGTH }}
            </span>
          </div>
        </UFormField>
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
          submitting ? t('features.dicts.form.saving') : t('common.confirm')
        "
        :loading="submitting"
        type="submit"
      />
    </template>
  </UModal>
</template>

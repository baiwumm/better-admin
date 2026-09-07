<script setup lang="ts">
import type { DictItem } from "@/lib/api-types";
import type { FormSubmitEvent } from "@nuxt/ui";

import * as z from "zod";
import { computed, h, reactive, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import Spinner from "@/components/ui/spinner/index.vue";

import {
  createDictItem,
  getDictErrorMessage,
  updateDictItem,
} from "./dict-api";

/**
 * 字典项新增/编辑弹窗：UForm + zod schema 校验（官方范式，@submit 仅在
 * 校验通过后触发，event.data 为校验转换后的值）。
 * - value/label 必填（同类型下 value/label 唯一由后端 409 拦截）；
 * - i18nKey 可选：点分格式（menu.xxx.yyy），传 "" 表示清空；
 * - sort 0-999 整数；enabled 开关。
 */
const props = defineProps<{
  open: boolean;
  mode: "create" | "edit";
  item: DictItem | null;
  /** 所属字典类型 code（create 挂载目标） */
  typeCode: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  /** 保存成功（页面统一刷新右栏列表并回填业务缓存） */
  saved: [];
}>();

const FORM_ID = "dict-item-form";
const I18N_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;

const { t } = useI18n();
const toast = useToast();

// 校验消息用函数延迟求值：语言切换后错误文案跟随当前 locale
const schema = z.object({
  value: z
    .string()
    .trim()
    .min(1, { error: () => t("features.dicts.item.form.valueInvalid") })
    .max(50, { error: () => t("features.dicts.item.form.valueInvalid") }),
  label: z
    .string()
    .trim()
    .min(1, { error: () => t("features.dicts.item.form.labelInvalid") })
    .max(50, { error: () => t("features.dicts.item.form.labelInvalid") }),
  i18nKey: z
    .string()
    .trim()
    .refine((value) => value === "" || I18N_KEY_PATTERN.test(value), {
      error: () => t("features.dicts.item.form.i18nKeyFormat"),
    }),
  sort: z.number(),
  enabled: z.boolean(),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  value: "",
  label: "",
  i18nKey: "",
  sort: 0,
  enabled: true,
});
const formRef = useTemplateRef("formRef");
const submitting = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;

    const item = props.mode === "edit" ? props.item : null;

    state.value = item?.value ?? "";
    state.label = item?.label ?? "";
    state.i18nKey = item?.i18nKey ?? "";
    state.sort = item?.sort ?? 0;
    state.enabled = item?.enabled ?? true;
    formRef.value?.clear();
  },
  { immediate: true },
);

const isEdit = computed(() => props.mode === "edit");

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
    title: t("features.dicts.item.form.saving"),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  const input = {
    value: event.data.value,
    label: event.data.label,
    i18nKey: event.data.i18nKey,
    sort: event.data.sort,
    enabled: event.data.enabled,
  };

  try {
    if (isEdit.value && props.item) {
      await updateDictItem(props.item.id, input);
    } else {
      await createDictItem(props.typeCode, input);
    }

    toast.update(savingToast.id, {
      title: t(
        isEdit.value
          ? "features.dicts.message.itemUpdated"
          : "features.dicts.message.itemCreated",
      ),
      icon: "i-lucide-check",
      color: "success",
    });
    emit("saved");
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
          ? 'features.dicts.item.form.title.edit'
          : 'features.dicts.item.form.title.create',
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
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField
            :label="t('features.dicts.item.form.value')"
            name="value"
            required
          >
            <UInput
              v-model="state.value"
              :maxlength="50"
              :placeholder="t('features.dicts.item.form.valuePlaceholder')"
              class="w-full font-mono"
              variant="soft"
            />
          </UFormField>

          <UFormField
            :label="t('features.dicts.item.form.label')"
            name="label"
            required
          >
            <UInput
              v-model="state.label"
              :maxlength="50"
              :placeholder="t('features.dicts.item.form.labelPlaceholder')"
              class="w-full"
              variant="soft"
            />
          </UFormField>
        </div>

        <UFormField
          :label="t('features.dicts.item.form.i18nKey')"
          :help="t('features.dicts.item.form.i18nKeyHint')"
          name="i18nKey"
        >
          <UInput
            v-model="state.i18nKey"
            class="w-full"
            placeholder="dict.xxx.yyy"
            variant="soft"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField :label="t('common.column.sort')">
            <UInput
              v-model.number="state.sort"
              class="w-full"
              max="999"
              min="0"
              type="number"
              variant="soft"
            />
          </UFormField>

          <div
            class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
          >
            <span class="text-sm font-medium">
              {{ t("features.dicts.item.form.enabled") }}
            </span>
            <USwitch v-model="state.enabled" />
          </div>
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
          submitting
            ? t('features.dicts.item.form.saving')
            : t('common.confirm')
        "
        :loading="submitting"
        type="submit"
      />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { MenuNode, PermissionItem } from "@/lib/api-types";
import type { FormSubmitEvent } from "@nuxt/ui";

import * as z from "zod";
import { computed, h, reactive, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import {
  addChildMenu,
  createMenu,
  getMenuErrorMessage,
  updateMenu,
  type MenuSaveInput,
} from "./menu-api";

import Spinner from "@/components/ui/spinner/index.vue";
import { I18N_KEY_PATTERN } from "@/lib/constants";
import MenuTreeSelect from "./MenuTreeSelect.vue";

/**
 * 菜单新增/编辑/新增子菜单表单弹窗。
 *
 * Props:
 * - open: 弹窗显隐
 * - mode: create | addChild | edit
 * - node: 编辑/新增子菜单时的目标节点
 * - tree: 全量菜单树（父级选择用）
 * - permissionItems: 权限点列表（权限位多选用）
 *
 * Events:
 * - update:open: 关闭弹窗
 * - saved: 保存成功后触发（刷新列表）
 */
const props = defineProps<{
  open: boolean;
  mode: "create" | "addChild" | "edit";
  node: MenuNode | null;
  tree: MenuNode[];
  permissionItems: PermissionItem[];
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  saved: [];
}>();

const { t } = useI18n();
const toast = useToast();

const FORM_ID = "menu-form";
const EMPTY_ICON = "circle";

// 校验消息用函数延迟求值：语言切换后错误文案跟随当前 locale
const schema = z.object({
  parentId: z.string(),
  label: z
    .string()
    .trim()
    .min(1, { error: () => t("features.menus.form.labelInvalid") })
    .max(50, { error: () => t("features.menus.form.labelInvalid") }),
  i18nKey: z
    .string()
    .trim()
    .min(1, { error: () => t("features.menus.form.i18nKeyRequired") })
    .refine((value) => I18N_KEY_PATTERN.test(value), {
      error: () => t("features.menus.form.i18nKeyFormat"),
    }),
  icon: z
    .string()
    .trim()
    .min(1, { error: () => t("features.menus.form.iconRequired") }),
  to: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || value.startsWith("/") || value.startsWith("https://"),
      { error: () => t("features.menus.form.routeFormat") },
    ),
  sort: z.number(),
  keepAlive: z.boolean(),
  hideInMenu: z.boolean(),
  enabled: z.boolean(),
  defaultOpen: z.boolean(),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  parentId: "",
  label: "",
  i18nKey: "",
  icon: "",
  to: "",
  sort: 0,
  keepAlive: false,
  hideInMenu: false,
  enabled: true,
  defaultOpen: false,
});
const permBits = ref(0n);
const formRef = useTemplateRef("formRef");
const submitting = ref(false);

const isFormEdit = computed(() => props.mode === "edit");

// 打开弹窗时初始化表单数据
watch(
  () => props.open,
  (open) => {
    if (!open) return;

    const { mode, node } = props;
    const addChild = mode === "addChild";

    state.parentId = addChild ? (node?.id ?? "") : (node?.parentId ?? "");
    state.label = addChild ? "" : (node?.label ?? "");
    state.i18nKey = addChild ? "" : (node?.i18nKey ?? "");
    state.icon = addChild ? "" : (node?.icon ?? "");
    state.to = addChild ? "" : (node?.to ?? "");
    state.sort = addChild ? 0 : (node?.sort ?? 0);
    state.keepAlive = addChild ? false : (node?.keepAlive ?? false);
    state.hideInMenu = addChild ? false : (node?.hideInMenu ?? false);
    state.enabled = addChild ? true : (node?.enabled ?? true);
    state.defaultOpen = addChild ? false : (node?.defaultOpen ?? false);

    try {
      permBits.value = BigInt(node?.permissions ?? "0");
    } catch {
      permBits.value = 0n;
    }

    formRef.value?.clear();
  },
);

// 权限位多选：由 permBits 推导选中项
const permissionSelectItems = computed(() =>
  props.permissionItems.map((item) => ({
    label: t(`features.permissions.items.${item.value}`),
    value: item.value,
    icon: `i-lucide-${item.icon}`,
  })),
);

const selectedPermissionValues = computed(() =>
  props.permissionItems
    .filter((item) => {
      const bits = BigInt(item.bits);

      return bits !== 0n && (permBits.value & bits) === bits;
    })
    .map((item) => item.value),
);

function onPermissionsChange(values: unknown) {
  const selected = new Set(
    (Array.isArray(values) ? values : [values]).map(String),
  );
  let next = 0n;

  for (const item of props.permissionItems) {
    if (selected.has(item.value)) next |= BigInt(item.bits);
  }
  permBits.value = next;
}

function closeForm() {
  emit("update:open", false);
}

async function submitForm(event: FormSubmitEvent<Schema>) {
  submitting.value = true;

  const savingToast = toast.add({
    title: t("features.menus.form.saving"),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  const payload: MenuSaveInput = {
    label: event.data.label,
    i18nKey: event.data.i18nKey || null,
    icon: event.data.icon || EMPTY_ICON,
    to: event.data.to || null,
    parentId: event.data.parentId || null,
    sort: event.data.sort,
    keepAlive: event.data.keepAlive,
    hideInMenu: event.data.hideInMenu,
    enabled: event.data.enabled,
    defaultOpen: event.data.defaultOpen,
    permissions: permBits.value.toString(),
  };

  try {
    if (isFormEdit.value && props.node) {
      await updateMenu(props.node.id, payload);
    } else if (props.mode === "addChild" && props.node) {
      await addChildMenu(props.node.id, payload);
    } else {
      await createMenu(payload);
    }

    toast.update(savingToast.id, {
      title: t(
        isFormEdit.value
          ? "features.menus.message.updateSuccess"
          : "features.menus.message.createSuccess",
      ),
      icon: "i-lucide-check",
      color: "success",
    });
    emit("saved");
    closeForm();
  } catch (error) {
    toast.update(savingToast.id, {
      title: getMenuErrorMessage(error),
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
        mode === 'edit'
          ? 'features.menus.form.title.edit'
          : mode === 'addChild'
            ? 'features.menus.form.title.addChild'
            : 'features.menus.form.title.create',
      )
    "
    :ui="{ content: 'sm:max-w-xl', footer: 'justify-end' }"
    @update:open="(value: boolean) => !value && closeForm()"
  >
    <template #body>
      <UForm
        :id="FORM_ID"
        ref="formRef"
        :schema="schema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="submitForm"
      >
        <UFormField
          :label="t('features.menus.form.parent')"
          :description="t('features.menus.form.parentHint')"
        >
          <MenuTreeSelect
            v-model="state.parentId"
            :is-disabled="mode === 'addChild'"
            :self-id="isFormEdit ? node?.id : null"
            :tree="tree"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField
            :label="t('features.menus.form.label')"
            name="label"
            required
          >
            <UInput
              v-model="state.label"
              :maxlength="50"
              :placeholder="t('features.menus.form.labelPlaceholder')"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="t('features.menus.form.i18nKey')"
            name="i18nKey"
            required
          >
            <UInput
              v-model="state.i18nKey"
              class="w-full"
              placeholder="menu.xxx.yyy"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField
            :label="t('features.menus.form.icon')"
            name="icon"
            required
          >
            <UInput
              v-model="state.icon"
              aria-label="Icon"
              class="w-full"
              placeholder="house"
            />
          </UFormField>

          <UFormField
            :help="t('features.menus.form.routeHint')"
            :label="t('features.menus.form.route')"
            name="to"
            :ui="{ help: 'text-dimmed text-xs' }"
          >
            <UInput
              v-model="state.to"
              :placeholder="t('features.menus.form.routePlaceholder')"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField :label="t('features.menus.form.permissions')">
          <USelectMenu
            :items="permissionSelectItems"
            :model-value="selectedPermissionValues"
            :placeholder="t('features.menus.form.permissionsPlaceholder')"
            class="w-full"
            multiple
            value-key="value"
            @update:model-value="onPermissionsChange"
          />
        </UFormField>

        <UFormField :label="t('common.column.sort')">
          <UInputNumber v-model="state.sort" :min="0" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div
            v-for="switchRow in [
              { key: 'keepAlive', label: t('features.menus.form.keepAlive') },
              {
                key: 'hideInMenu',
                label: t('features.menus.form.hideInMenu'),
              },
              { key: 'enabled', label: t('features.menus.form.enabled') },
              {
                key: 'defaultOpen',
                label: t('features.menus.form.defaultOpen'),
              },
            ]"
            :key="switchRow.key"
            class="border-default flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
          >
            <span class="text-sm">{{ switchRow.label }}</span>
            <USwitch
              v-model="state[switchRow.key as 'keepAlive']"
              unchecked-icon="i-lucide-x"
              checked-icon="i-lucide-check"
            />
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
          submitting ? t('features.menus.form.saving') : t('common.confirm')
        "
        :loading="submitting"
        type="submit"
      />
    </template>
  </UModal>
</template>

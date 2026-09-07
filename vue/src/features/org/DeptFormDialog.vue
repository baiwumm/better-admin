<script setup lang="ts">
import type { Dept, DeptTreeNode, DeptStatus } from "@/lib/api-types";

import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import { createDept, getDeptErrorMessage, updateDept } from "./dept-api";
import DeptLeaderSelect from "./DeptLeaderSelect.vue";
import DeptTreeSelect from "./DeptTreeSelect.vue";

/**
 * 组织新增/编辑弹窗（对应 React 端 dept-form-dialog.tsx，手动校验范式同 M1）。
 *
 * - parentId 用平铺缩进的树选择器（DeptTreeSelect，M1 用户表单共用组件）；
 *   不选 = 顶级组织（提交映射 null）；编辑时禁选自身与后代（防环），
 *   停用组织不可作父级；「新增子组织」入口进入时上级锁定不可修改；
 * - leaderId 拉取 /users（pageSize 50 滚动加载）选择；无用户读取权限时
 *   降级为禁用并提示（不阻塞其余字段编辑）；
 * - 名称/编码冲突由后端 409 拦截，错误文案经 getDeptErrorMessage i18n 映射。
 */
const props = defineProps<{
  open: boolean;
  mode: "create" | "edit";
  /** edit：被编辑的组织（树节点，含全部表单回显字段）；create：null */
  dept: DeptTreeNode | null;
  /** create：预设的父级组织（在选中节点下新增）；edit：忽略 */
  parentNode: DeptTreeNode | null;
  /** 全量组织树（父级选择器数据源） */
  tree: DeptTreeNode[];
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  /** 保存成功（页面统一做缓存失效与选中联动） */
  saved: [dept: Dept, mode: "create" | "edit"];
}>();

const { t } = useI18n();
const toast = useToast();

const FORM_ID = "dept-form";

const form = reactive({
  name: "",
  code: "",
  parentId: "",
  leaderId: "",
  sort: 0,
  status: "enabled" as DeptStatus,
});
const errors = reactive({ name: "", code: "" });
const submitting = ref(false);

const isEdit = computed(() => props.mode === "edit");
// 「新增子组织」入口（create 且带预设父级）：上级组织锁定不可修改
const isCreateChild = computed(
  () => props.mode === "create" && Boolean(props.parentNode),
);

watch(
  () => props.open,
  (open) => {
    if (!open) return;

    form.name = props.dept?.name ?? "";
    form.code = props.dept?.code ?? "";
    form.parentId = props.dept
      ? (props.dept.parentId ?? "")
      : (props.parentNode?.id ?? "");
    form.leaderId = props.dept?.leaderId ?? "";
    form.sort = props.dept?.sort ?? 0;
    form.status = props.dept?.status ?? "enabled";
    errors.name = "";
    errors.code = "";
  },
  { immediate: true },
);

function close() {
  emit("update:open", false);
}

function validate(): boolean {
  errors.name =
    form.name.trim().length >= 1 && form.name.trim().length <= 100
      ? ""
      : t("features.depts.form.nameInvalid");
  errors.code =
    form.code.trim().length <= 50 ? "" : t("features.depts.form.codeInvalid");

  return !Object.values(errors).some(Boolean);
}

async function onSubmit() {
  if (!validate()) return;

  submitting.value = true;

  try {
    const input = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      parentId: form.parentId || null,
      leaderId: form.leaderId || null,
      sort: form.sort,
      status: form.status,
    };

    const saved = isEdit.value
      ? await updateDept(props.dept!.id, input)
      : await createDept(input);

    emit("saved", saved, props.mode);
    close();

    toast.add({
      color: "success",
      duration: 3000,
      title: t(
        isEdit.value
          ? "features.depts.message.updated"
          : "features.depts.message.created",
      ),
    });
  } catch (error) {
    toast.add({
      color: "error",
      duration: 5000,
      title: getDeptErrorMessage(error),
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<script lang="ts">
export default { name: "DeptFormDialog" };
</script>

<template>
  <UModal
    :open="open"
    :dismissible="false"
    :title="
      t(
        isEdit
          ? 'features.depts.form.title.edit'
          : 'features.depts.form.title.create',
      )
    "
    :ui="{ content: 'sm:max-w-md', footer: 'justify-end' }"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #body>
      <UForm
        :id="FORM_ID"
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="t('features.depts.form.parent')"
          :help="t('features.depts.form.parentHint')"
          :ui="{ help: 'text-dimmed text-xs' }"
          :disabled="isCreateChild"
        >
          <DeptTreeSelect
            v-model="form.parentId"
            :is-disabled="isCreateChild"
            :self-id="isEdit ? (dept?.id ?? null) : null"
            :placeholder="t('features.depts.form.parentPlaceholder')"
            :tree="tree"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :error="errors.name || undefined"
          :label="t('features.depts.form.name')"
          required
        >
          <UInput
            v-model="form.name"
            :maxlength="100"
            :placeholder="t('features.depts.form.namePlaceholder')"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :error="errors.code || undefined"
          :help="errors.code ? undefined : t('features.depts.form.codeHint')"
          :label="t('features.depts.form.code')"
          :ui="{ help: 'text-dimmed text-xs' }"
        >
          <UInput
            v-model="form.code"
            :maxlength="50"
            placeholder="DEPT-001"
            class="w-full"
          />
        </UFormField>

        <DeptLeaderSelect
          v-model="form.leaderId"
          :current-leader="
            isEdit && dept?.leaderId
              ? {
                  id: dept.leaderId,
                  displayName: dept.leaderName ?? dept.leaderId,
                }
              : null
          "
        />

        <UFormField :label="t('common.column.sort')">
          <UInputNumber v-model="form.sort" :min="0" class="w-full" />
        </UFormField>

        <div
          class="border-default flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
        >
          <span class="text-sm">
            {{ t("features.depts.form.status") }}
          </span>
          <USwitch
            :aria-label="t('features.depts.form.status')"
            :model-value="form.status === 'enabled'"
            @update:model-value="
              (value: boolean) => (form.status = value ? 'enabled' : 'disabled')
            "
          />
        </div>
      </UForm>
    </template>

    <template #footer="{ close: onClose }">
      <UButton
        color="neutral"
        :label="t('common.cancel')"
        variant="outline"
        @click="onClose"
      />
      <UButton
        :form="FORM_ID"
        :label="
          submitting ? t('features.depts.form.saving') : t('common.confirm')
        "
        :loading="submitting"
        type="submit"
      />
    </template>
  </UModal>
</template>

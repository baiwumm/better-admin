<script setup lang="ts">
import type { Dept, DeptTreeNode } from "@/lib/api-types";
import type { FormSubmitEvent } from "@nuxt/ui";
import Spinner from "@/components/ui/spinner/index.vue";
import * as z from "zod";
import { computed, reactive, ref, useTemplateRef, watch, h } from "vue";
import { useI18n } from "vue-i18n";
import { useToast } from "@nuxt/ui/composables";

import { createDept, getDeptErrorMessage, updateDept } from "./dept-api";
import DeptLeaderSelect from "./DeptLeaderSelect.vue";
import DeptTreeSelect from "./DeptTreeSelect.vue";

/**
 * 组织新增/编辑弹窗（对应 React 端 dept-form-dialog.tsx）：
 * UForm + zod schema 校验（官方范式，@submit 仅在校验通过后触发，
 * event.data 为校验转换后的值）。
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

/** 字数统计上限（与后端 @Length 校验及 React 端对齐：名称 100 / 编码 50） */
const NAME_MAX_LENGTH = 100;
const CODE_MAX_LENGTH = 50;

// 校验消息用函数延迟求值：语言切换后错误文案跟随当前 locale
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: () => t("features.depts.form.nameInvalid") })
    .max(100, { error: () => t("features.depts.form.nameInvalid") }),
  code: z
    .string()
    .trim()
    .max(50, { error: () => t("features.depts.form.codeInvalid") }),
  parentId: z.string(),
  leaderId: z.string(),
  sort: z.number(),
  status: z.enum(["enabled", "disabled"]),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  name: "",
  code: "",
  parentId: "",
  leaderId: "",
  sort: 0,
  status: "enabled",
});
const formRef = useTemplateRef("formRef");
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

    state.name = props.dept?.name ?? "";
    state.code = props.dept?.code ?? "";
    state.parentId = props.dept
      ? (props.dept.parentId ?? "")
      : (props.parentNode?.id ?? "");
    state.leaderId = props.dept?.leaderId ?? "";
    state.sort = props.dept?.sort ?? 0;
    state.status = props.dept?.status ?? "enabled";
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
    title: t("features.depts.form.saving"),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  try {
    // event.data 已过 schema 校验转换（name/code 已 trim）
    const input = {
      name: event.data.name,
      code: event.data.code || null,
      parentId: event.data.parentId || null,
      leaderId: event.data.leaderId || null,
      sort: event.data.sort,
      status: event.data.status,
    };

    const saved = isEdit.value
      ? await updateDept(props.dept!.id, input)
      : await createDept(input);

    toast.update(savingToast.id, {
      title: t(
        isEdit.value
          ? "features.depts.message.updated"
          : "features.depts.message.created",
      ),
      icon: "i-lucide-check",
      color: "success",
    });

    emit("saved", saved, props.mode);
    close();
  } catch (error) {
    toast.update(savingToast.id, {
      title: getDeptErrorMessage(error),
      icon: "i-lucide-x",
      color: "error",
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
        ref="formRef"
        :schema="schema"
        :state="state"
        class="flex flex-col gap-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('features.depts.form.parent')"
          :help="t('features.depts.form.parentHint')"
          :ui="{ help: 'text-dimmed text-xs' }"
          :disabled="isCreateChild"
        >
          <DeptTreeSelect
            v-model="state.parentId"
            :is-disabled="isCreateChild"
            :self-id="isEdit ? (dept?.id ?? null) : null"
            :placeholder="t('features.depts.form.parentPlaceholder')"
            :tree="tree"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('features.depts.form.name')" name="name" required>
          <UInput
            v-model="state.name"
            :maxlength="NAME_MAX_LENGTH"
            :placeholder="t('features.depts.form.namePlaceholder')"
            class="w-full"
            :ui="{ base: 'pe-16' }"
          >
            <!-- trailing 实时字数（对齐 React 端 InputGroup.Suffix） -->
            <template #trailing>
              <span class="text-dimmed text-xs tabular-nums">
                {{ state.name.length }}/{{ NAME_MAX_LENGTH }}
              </span>
            </template>
          </UInput>
        </UFormField>

        <UFormField
          :help="t('features.depts.form.codeHint')"
          :label="t('features.depts.form.code')"
          :ui="{ help: 'text-dimmed text-xs' }"
          name="code"
        >
          <UInput
            v-model="state.code"
            :maxlength="CODE_MAX_LENGTH"
            placeholder="DEPT-001"
            class="w-full"
            :ui="{ base: 'pe-13' }"
          >
            <!-- trailing 实时字数（对齐 React 端 InputGroup.Suffix） -->
            <template #trailing>
              <span class="text-dimmed text-xs tabular-nums">
                {{ state.code.length }}/{{ CODE_MAX_LENGTH }}
              </span>
            </template>
          </UInput>
        </UFormField>

        <DeptLeaderSelect
          v-model="state.leaderId"
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
          <UInputNumber v-model="state.sort" :min="0" class="w-full" />
        </UFormField>

        <div
          class="border-default flex items-center justify-between gap-3 rounded-xl border px-3 py-2"
        >
          <span class="text-sm">
            {{ t("features.depts.form.status") }}
          </span>
          <USwitch
            :aria-label="t('features.depts.form.status')"
            :model-value="state.status === 'enabled'"
            @update:model-value="
              (value: boolean) =>
                (state.status = value ? 'enabled' : 'disabled')
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

<script setup lang="ts">
import type { Role, User } from "@/lib/api-types";
import type { FormSubmitEvent } from "@nuxt/ui";

import * as z from "zod";
import { computed, h, reactive, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery } from "@tanstack/vue-query";
import { useToast } from "@nuxt/ui/composables";

import Spinner from "@/components/ui/spinner/index.vue";

import {
  ROLE_OPTIONS_QUERY_KEY,
  createUser,
  fetchRoleOptions,
  getUserErrorMessage,
  updateUser,
} from "./user-api";
import PasswordField from "./PasswordField.vue";

import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "@/features/org/dept-api";
import { fetchPosts } from "@/features/org/post-api";
import DeptTreeSelect from "@/features/org/DeptTreeSelect.vue";
import { SUPER_ADMIN_ROLE_CODE } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 用户新增/编辑弹窗（对齐 React 端 user-form-dialog）：
 * UForm + zod schema 校验（官方范式，@submit 仅在校验通过后触发，
 * event.data 为校验转换后的值）。
 *
 * - username 仅创建时可填且创建后不可变更（后端契约锁定）；
 * - 编辑态不含密码字段：改密走「重置密码」弹窗；
 * - username/email 唯一性由后端 409 拦截（文案映射见 getUserErrorMessage）；
 * - roleIds / postIds 为全量替换语义：编辑时始终下发完整数组（含空数组 = 清空）；
 * - 组织中心关联（契约 v1.6.0）：表单提交即全量下发（含空值 = 清空），所见即所得；
 * - super_admin 绑定保护：非超管操作者不可见/不可选 super_admin 角色。
 */
const props = defineProps<{
  open: boolean;
  mode: "create" | "edit";
  /** edit：被编辑的用户；create：null */
  user: User | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  /** 保存成功（页面统一做列表失效） */
  saved: [];
}>();

const FORM_ID = "user-form";

const { t } = useI18n();
const toast = useToast();
const auth = useAuthStore();

const isEdit = computed(() => props.mode === "edit");
const currentUserIsSuperAdmin = computed(
  () => auth.user?.roles.includes("super_admin") ?? false,
);

// v1.4.6 保护：编辑受保护用户时锁定状态开关（后端拒绝停用请求，前端禁用入口）
const isStatusLocked = computed(() => {
  if (!isEdit.value || !props.user) return false;
  const user = props.user;

  return (
    user.id === auth.user?.id ||
    user.username === "admin" ||
    (user.roles.some((r) => r.code === SUPER_ADMIN_ROLE_CODE) &&
      !currentUserIsSuperAdmin.value)
  );
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENTRY_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// 校验规则与 React 端 buildUserFormSchema 一一对应；消息用函数延迟求值：
// 语言切换后错误文案跟随当前 locale
const schema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, { error: () => t("features.users.form.usernameInvalid") })
      .max(50, { error: () => t("features.users.form.usernameInvalid") }),
    displayName: z
      .string()
      .trim()
      .min(1, { error: () => t("features.users.form.displayNameInvalid") })
      .max(50, { error: () => t("features.users.form.displayNameInvalid") }),
    email: z
      .string()
      .max(100, { error: () => t("features.users.form.emailInvalid") })
      .refine((value) => EMAIL_RE.test(value), {
        error: () => t("features.users.form.emailInvalid"),
      }),
    password: z.string(),
    confirmPassword: z.string(),
    status: z.enum(["active", "disabled"]),
    roleIds: z.array(z.string()).max(5, {
      error: () => t("features.users.form.rolesMax"),
    }),
    postIds: z.array(z.string()).max(20, {
      error: () => t("features.users.form.postsMax"),
    }),
    deptId: z.string(),
    employeeNo: z.string(),
    entryDate: z.string(),
    employmentStatus: z.enum(["employed", "resigned"]),
    gender: z.enum(["", "male", "female"]),
    mainPostId: z.string(),
  })
  .superRefine((data, ctx) => {
    // 密码仅创建时校验（编辑态无密码字段：改密走「重置密码」弹窗）
    if (!isEdit.value) {
      if (data.password.length < 6) {
        ctx.addIssue({
          code: "custom",
          path: ["password"],
          message: t("features.users.form.passwordInvalid"),
        });
      }

      if (data.password !== data.confirmPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: t("features.users.form.confirmPasswordMismatch"),
        });
      }
    }

    // 入职日期：空合法，非空须 YYYY-MM-DD
    if (data.entryDate !== "" && !ENTRY_DATE_RE.test(data.entryDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["entryDate"],
        message: t("features.users.form.entryDateInvalid"),
      });
    }
  });

type Schema = z.output<typeof schema>;

// 打开时按模式回填（编辑回显 User.roles/posts 摘要；主岗取 posts 中 isMain 一条；
// 在职状态存量 NULL 视为 employed）
const state = reactive<Schema>({
  username: "",
  displayName: "",
  email: "",
  password: "",
  confirmPassword: "",
  status: "active",
  roleIds: [],
  deptId: "",
  employeeNo: "",
  entryDate: "",
  employmentStatus: "employed",
  gender: "",
  postIds: [],
  mainPostId: "",
});
const formRef = useTemplateRef("formRef");

watch(
  () => props.open,
  (open) => {
    if (!open) return;

    const user = props.user;

    state.username = user?.username ?? "";
    state.displayName = user?.displayName ?? "";
    state.email = user?.email ?? "";
    state.password = "";
    state.confirmPassword = "";
    state.status = user?.status ?? "active";
    state.roleIds = user?.roles.map((role) => role.id) ?? [];
    state.deptId = user?.deptId ?? "";
    state.employeeNo = user?.employeeNo ?? "";
    state.entryDate = user?.entryDate ?? "";
    state.employmentStatus = user?.employmentStatus ?? "employed";
    state.gender = user?.gender ?? "";
    state.postIds = user?.posts.map((post) => post.id) ?? [];
    state.mainPostId = user?.posts.find((post) => post.isMain)?.id ?? "";
    formRef.value?.clear();
  },
  { immediate: true },
);

// 角色下拉选项：仅启用角色；pageSize 上限 50，超出由 fetchRoleOptions 续拉
const { data: fetchedRoleOptions } = useQuery({
  queryKey: ROLE_OPTIONS_QUERY_KEY,
  queryFn: fetchRoleOptions,
  staleTime: 60_000,
});

// super_admin 绑定保护（前端止损）：非超管操作者不可选 super_admin 角色
const roleItems = computed(() =>
  (fetchedRoleOptions.value ?? [])
    .filter(
      (role: Role) =>
        currentUserIsSuperAdmin.value || role.code !== SUPER_ADMIN_ROLE_CODE,
    )
    .map((role: Role) => ({ label: role.name, value: role.id })),
);

// 组织中心数据源：组织树（与组织/岗位页共享缓存）+ 岗位选项（首页 50 条）
const { data: deptTree } = useQuery({
  queryKey: DEPTS_TREE_QUERY_KEY,
  queryFn: fetchDeptTree,
  staleTime: 60_000,
});
const { data: postOptionsRes } = useQuery({
  queryKey: ["org", "posts", "options"],
  queryFn: () => fetchPosts({ page: 1, pageSize: 50 }),
  staleTime: 60_000,
});
const postOptions = computed(() => postOptionsRes.value?.data ?? []);
const postItems = computed(() =>
  postOptions.value.map((post) => ({
    label: post.name,
    hint: post.deptPath,
    value: post.id,
    disabled: post.status !== "enabled",
  })),
);

// 主岗选项 = 已选岗位（主岗必须在 postIds 中）；取消勾选已设主岗的岗位时联动清空
const mainPostItems = computed(() => [
  { label: t("features.users.form.mainPostEmpty"), value: "" },
  ...postOptions.value
    .filter((post) => state.postIds.includes(post.id))
    .map((post) => ({ label: post.name, value: post.id })),
]);

watch(
  () => state.postIds,
  (postIds) => {
    if (state.mainPostId && !postIds.includes(state.mainPostId)) {
      state.mainPostId = "";
    }
  },
);

const submitting = ref(false);

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
    title: t("features.users.form.saving"),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  try {
    if (isEdit.value && props.user) {
      await updateUser(props.user.id, {
        email: event.data.email,
        displayName: event.data.displayName,
        status: event.data.status,
        roleIds: event.data.roleIds,
        // 组织中心关联（契约 v1.6.0）：表单全量下发（含空值 = 清空），所见即所得
        deptId: event.data.deptId || null,
        employeeNo: event.data.employeeNo || null,
        entryDate: event.data.entryDate || null,
        employmentStatus: event.data.employmentStatus,
        gender: event.data.gender || null,
        postIds: event.data.postIds,
        mainPostId: event.data.mainPostId || null,
      });
    } else {
      await createUser({
        username: event.data.username,
        email: event.data.email,
        displayName: event.data.displayName,
        password: event.data.password,
        status: event.data.status,
        roleIds: event.data.roleIds,
        deptId: event.data.deptId || null,
        employeeNo: event.data.employeeNo || null,
        entryDate: event.data.entryDate || null,
        employmentStatus: event.data.employmentStatus,
        gender: event.data.gender || null,
        postIds: event.data.postIds,
        mainPostId: event.data.mainPostId || null,
      });
    }

    toast.update(savingToast.id, {
      title: t(
        isEdit.value
          ? "features.users.message.updateSuccess"
          : "features.users.message.createSuccess",
      ),
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
    :title="
      t(
        isEdit
          ? 'features.users.form.title.edit'
          : 'features.users.form.title.create',
      )
    "
    :ui="{ content: 'sm:max-w-lg', footer: 'justify-end' }"
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
          :label="t('features.users.form.username')"
          :description="
            isEdit ? t('features.users.form.usernameHint') : undefined
          "
          name="username"
          required
        >
          <UInput
            v-model="state.username"
            :disabled="isEdit"
            :maxlength="50"
            :placeholder="t('features.users.form.usernamePlaceholder')"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <UFormField
          :label="t('features.users.form.displayName')"
          name="displayName"
          required
        >
          <UInput
            v-model="state.displayName"
            :maxlength="50"
            :placeholder="t('features.users.form.displayNamePlaceholder')"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <UFormField
          :label="t('features.users.form.email')"
          name="email"
          required
        >
          <UInput
            v-model="state.email"
            :maxlength="100"
            :placeholder="t('features.users.form.emailPlaceholder')"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <template v-if="!isEdit">
          <PasswordField
            v-model="state.password"
            :description="t('features.users.form.passwordHint')"
            :label="t('features.users.form.password')"
            :placeholder="t('features.users.form.passwordPlaceholder')"
            name="password"
          />

          <PasswordField
            v-model="state.confirmPassword"
            :label="t('features.users.form.confirmPassword')"
            :placeholder="t('features.users.form.confirmPassword')"
            name="confirmPassword"
          />
        </template>

        <div
          class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
        >
          <span class="text-sm font-medium">
            {{ t("features.users.form.status") }}
          </span>
          <USwitch
            :disabled="isStatusLocked"
            :model-value="state.status === 'active'"
            @update:model-value="
              (value: boolean) => (state.status = value ? 'active' : 'disabled')
            "
          />
        </div>

        <UFormField :label="t('features.users.form.roles')" name="roleIds">
          <USelectMenu
            v-model="state.roleIds"
            :items="roleItems"
            :placeholder="
              roleItems.length === 0
                ? t('features.users.form.rolesEmpty')
                : t('features.users.form.rolesPlaceholder')
            "
            class="w-full"
            multiple
            value-key="value"
          />
        </UFormField>

        <UFormField
          :label="t('features.users.form.dept')"
          :description="t('features.users.form.deptHint')"
        >
          <DeptTreeSelect v-model="state.deptId" :tree="deptTree ?? []" />
        </UFormField>

        <UFormField
          :label="t('features.users.form.posts')"
          :description="t('features.users.form.postsHint')"
          name="postIds"
        >
          <USelectMenu
            v-model="state.postIds"
            :items="postItems"
            :placeholder="
              postItems.length === 0
                ? t('features.users.form.postsEmpty')
                : t('features.users.form.postsPlaceholder')
            "
            class="w-full"
            multiple
            value-key="value"
          />
        </UFormField>

        <UFormField
          :label="t('features.users.form.mainPost')"
          :description="t('features.users.form.mainPostHint')"
        >
          <USelect
            v-model="state.mainPostId"
            :disabled="mainPostItems.length <= 1"
            :items="mainPostItems"
            class="w-full"
            value-key="value"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField :label="t('features.users.form.employeeNo')">
            <UInput
              v-model="state.employeeNo"
              :maxlength="50"
              :placeholder="t('features.users.form.employeeNoPlaceholder')"
              class="w-full"
              variant="soft"
            />
          </UFormField>

          <UFormField
            :label="t('features.users.form.entryDate')"
            name="entryDate"
          >
            <UInput v-model="state.entryDate" class="w-full" type="date" />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField :label="t('features.users.form.employmentStatus')">
            <USelect
              v-model="state.employmentStatus"
              :items="[
                {
                  label: t('features.users.employment.employed'),
                  value: 'employed',
                },
                {
                  label: t('features.users.employment.resigned'),
                  value: 'resigned',
                },
              ]"
              class="w-full"
              value-key="value"
            />
          </UFormField>

          <UFormField :label="t('features.users.form.gender')">
            <USelect
              v-model="state.gender"
              :items="[
                { label: t('features.users.gender.unset'), value: '' },
                { label: t('features.users.gender.male'), value: 'male' },
                { label: t('features.users.gender.female'), value: 'female' },
              ]"
              class="w-full"
              value-key="value"
            />
          </UFormField>
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
          submitting ? t('features.users.form.saving') : t('common.confirm')
        "
        :loading="submitting"
        type="submit"
      />
    </template>
  </UModal>
</template>

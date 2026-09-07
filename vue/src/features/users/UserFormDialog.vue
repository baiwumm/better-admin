<script setup lang="ts">
import type { Role, User } from "@/lib/api-types";

import { computed, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery } from "@tanstack/vue-query";
import { useToast } from "@nuxt/ui/composables";

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
 * 用户新增/编辑弹窗（对齐 React 端 user-form-dialog，校验规则与 zod schema
 * 一一对应；Vue 端用手动校验，vee-validate 引入待表单复杂度评审后统一）。
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

const form = reactive({
  username: "",
  displayName: "",
  email: "",
  password: "",
  confirmPassword: "",
  status: "active" as "active" | "disabled",
  roleIds: [] as string[],
  deptId: "",
  employeeNo: "",
  entryDate: "",
  employmentStatus: "employed" as "employed" | "resigned",
  gender: "" as "" | "male" | "female",
  postIds: [] as string[],
  mainPostId: "",
});

const errors = reactive({
  username: "",
  displayName: "",
  email: "",
  password: "",
  confirmPassword: "",
  roleIds: "",
  postIds: "",
  entryDate: "",
});

// 打开时按模式回填（编辑回显 User.roles/posts 摘要；主岗取 posts 中 isMain 一条；
// 在职状态存量 NULL 视为 employed）
watch(
  () => props.open,
  (open) => {
    if (!open) return;

    const user = props.user;

    form.username = user?.username ?? "";
    form.displayName = user?.displayName ?? "";
    form.email = user?.email ?? "";
    form.password = "";
    form.confirmPassword = "";
    form.status = user?.status ?? "active";
    form.roleIds = user?.roles.map((role) => role.id) ?? [];
    form.deptId = user?.deptId ?? "";
    form.employeeNo = user?.employeeNo ?? "";
    form.entryDate = user?.entryDate ?? "";
    form.employmentStatus = user?.employmentStatus ?? "employed";
    form.gender = user?.gender ?? "";
    form.postIds = user?.posts.map((post) => post.id) ?? [];
    form.mainPostId = user?.posts.find((post) => post.isMain)?.id ?? "";

    for (const key of Object.keys(errors)) {
      errors[key as keyof typeof errors] = "";
    }
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
    .filter((post) => form.postIds.includes(post.id))
    .map((post) => ({ label: post.name, value: post.id })),
]);

watch(
  () => form.postIds,
  (postIds) => {
    if (form.mainPostId && !postIds.includes(form.mainPostId)) {
      form.mainPostId = "";
    }
  },
);

const submitting = ref(false);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENTRY_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 校验规则与 React 端 buildUserFormSchema 一一对应（编辑态跳过密码校验）。 */
function validate(): boolean {
  errors.username =
    form.username.trim() && form.username.trim().length <= 50
      ? ""
      : t("features.users.form.usernameInvalid");
  errors.displayName =
    form.displayName.trim() && form.displayName.trim().length <= 50
      ? ""
      : t("features.users.form.displayNameInvalid");
  errors.email =
    form.email.length <= 100 && EMAIL_RE.test(form.email)
      ? ""
      : t("features.users.form.emailInvalid");
  errors.roleIds =
    form.roleIds.length <= 5 ? "" : t("features.users.form.rolesMax");
  errors.postIds =
    form.postIds.length <= 20 ? "" : t("features.users.form.postsMax");
  errors.entryDate =
    form.entryDate === "" || ENTRY_DATE_RE.test(form.entryDate)
      ? ""
      : t("features.users.form.entryDateInvalid");

  if (!isEdit.value) {
    errors.password =
      form.password.length >= 6 ? "" : t("features.users.form.passwordInvalid");
    errors.confirmPassword =
      form.password === form.confirmPassword
        ? ""
        : t("features.users.form.confirmPasswordMismatch");
  }

  return !Object.values(errors).some(Boolean);
}

function close() {
  emit("update:open", false);
}

async function onSubmit() {
  if (!validate()) return;

  submitting.value = true;

  try {
    if (isEdit.value && props.user) {
      await updateUser(props.user.id, {
        email: form.email,
        displayName: form.displayName,
        status: form.status,
        roleIds: form.roleIds,
        // 组织中心关联（契约 v1.6.0）：表单全量下发（含空值 = 清空），所见即所得
        deptId: form.deptId || null,
        employeeNo: form.employeeNo || null,
        entryDate: form.entryDate || null,
        employmentStatus: form.employmentStatus,
        gender: form.gender || null,
        postIds: form.postIds,
        mainPostId: form.mainPostId || null,
      });
    } else {
      await createUser({
        username: form.username.trim(),
        email: form.email,
        displayName: form.displayName.trim(),
        password: form.password,
        status: form.status,
        roleIds: form.roleIds,
        deptId: form.deptId || null,
        employeeNo: form.employeeNo || null,
        entryDate: form.entryDate || null,
        employmentStatus: form.employmentStatus,
        gender: form.gender || null,
        postIds: form.postIds,
        mainPostId: form.mainPostId || null,
      });
    }

    toast.add({
      color: "success",
      title: t(
        isEdit.value
          ? "features.users.message.updateSuccess"
          : "features.users.message.createSuccess",
      ),
    });
    emit("saved");
    close();
  } catch (error) {
    toast.add({
      color: "error",
      title: getUserErrorMessage(error),
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
        class="flex flex-col gap-4"
        @submit.prevent="onSubmit"
      >
        <UFormField
          :label="t('features.users.form.username')"
          :error="errors.username || undefined"
          :description="
            isEdit ? t('features.users.form.usernameHint') : undefined
          "
          required
        >
          <UInput
            v-model="form.username"
            :disabled="isEdit"
            :maxlength="50"
            :placeholder="t('features.users.form.usernamePlaceholder')"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <UFormField
          :label="t('features.users.form.displayName')"
          :error="errors.displayName || undefined"
          required
        >
          <UInput
            v-model="form.displayName"
            :maxlength="50"
            :placeholder="t('features.users.form.displayNamePlaceholder')"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <UFormField
          :label="t('features.users.form.email')"
          :error="errors.email || undefined"
          required
        >
          <UInput
            v-model="form.email"
            :maxlength="100"
            :placeholder="t('features.users.form.emailPlaceholder')"
            class="w-full"
            variant="soft"
          />
        </UFormField>

        <template v-if="!isEdit">
          <PasswordField
            v-model="form.password"
            :error="errors.password || undefined"
            :label="t('features.users.form.password')"
            :placeholder="t('features.users.form.passwordPlaceholder')"
            :description="t('features.users.form.passwordHint')"
          />

          <PasswordField
            v-model="form.confirmPassword"
            :error="errors.confirmPassword || undefined"
            :label="t('features.users.form.confirmPassword')"
            :placeholder="t('features.users.form.confirmPassword')"
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
            :model-value="form.status === 'active'"
            @update:model-value="
              (value: boolean) => (form.status = value ? 'active' : 'disabled')
            "
          />
        </div>

        <UFormField
          :label="t('features.users.form.roles')"
          :error="errors.roleIds || undefined"
        >
          <USelectMenu
            v-model="form.roleIds"
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
          <DeptTreeSelect v-model="form.deptId" :tree="deptTree ?? []" />
        </UFormField>

        <UFormField
          :label="t('features.users.form.posts')"
          :error="errors.postIds || undefined"
          :description="t('features.users.form.postsHint')"
        >
          <USelectMenu
            v-model="form.postIds"
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
            v-model="form.mainPostId"
            :disabled="mainPostItems.length <= 1"
            :items="mainPostItems"
            class="w-full"
            value-key="value"
          />
        </UFormField>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField :label="t('features.users.form.employeeNo')">
            <UInput
              v-model="form.employeeNo"
              :maxlength="50"
              :placeholder="t('features.users.form.employeeNoPlaceholder')"
              class="w-full"
              variant="soft"
            />
          </UFormField>

          <UFormField
            :label="t('features.users.form.entryDate')"
            :error="errors.entryDate || undefined"
          >
            <UInput v-model="form.entryDate" class="w-full" type="date" />
          </UFormField>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField :label="t('features.users.form.employmentStatus')">
            <USelect
              v-model="form.employmentStatus"
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
              v-model="form.gender"
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

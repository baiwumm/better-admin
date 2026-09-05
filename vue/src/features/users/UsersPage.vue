<script setup lang="ts">
import type { User, UserStatus } from "@/lib/api-types";
import type {
  AppColumnDef,
  AppTable,
} from "@/components/data-table/table-types";

import { h, computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useQueryClient } from "@tanstack/vue-query";
import { useTable } from "@tanstack/vue-table";
import { useToast } from "@nuxt/ui/composables";
import UBadge from "@nuxt/ui/runtime/components/Badge.vue";
import UCheckbox from "@nuxt/ui/runtime/components/Checkbox.vue";

import {
  USERS_QUERY_KEY,
  batchDeleteUsers,
  deleteUser,
  getUserErrorMessage,
  updateUserStatus,
} from "./user-api";
import UserFormDialog from "./UserFormDialog.vue";
import UserResetPasswordDialog from "./UserResetPasswordDialog.vue";
import UsersLinksCell from "./UsersLinksCell.vue";
import UsersRolesCell from "./UsersRolesCell.vue";
import UsersRowActions from "./UsersRowActions.vue";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import ErrorContent from "@/components/common/ErrorContent.vue";
import UserInfo from "@/components/common/UserInfo.vue";
import DataTable from "@/components/data-table/DataTable.vue";
import DataTableBulkActions from "@/components/data-table/DataTableBulkActions.vue";
import DataTablePagination from "@/components/data-table/DataTablePagination.vue";
import DataTableSearchReset from "@/components/data-table/DataTableSearchReset.vue";
import DataTableToolbar from "@/components/data-table/DataTableToolbar.vue";
import { appTableFeatures } from "@/components/data-table/table-types";
import { useMenuPermissions } from "@/composables/use-permissions";
import { useListQuery } from "@/composables/use-list-query";
import { createListStore } from "@/lib/list-store";
import { formatDateTime } from "@/lib/format-date";
import { SUPER_ADMIN_ROLE_CODE } from "@/lib/constants";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 用户管理页（对齐 React 端 users-page）：服务端分页列表
 * （page/pageSize/search/status/sort/order）+ CRUD + 状态切换 + 重置密码 + 批量操作。
 *
 * - 列表状态入模块级 list store（导航返回保留），由 useListQuery 装配请求；
 * - username 创建后锁定；编辑不含密码，改密走重置密码弹窗；
 * - 写操作保护（v1.4.6）：本人/内置 admin/绑定 super_admin 的用户不可被
 *   删除/停用/重置密码（操作者为 super_admin 时豁免第三条），后端为契约级
 *   强制校验，前端隐藏入口止损；受保护用户亦不可勾选；
 * - 批量状态切换无后端批量端点：Promise.allSettled 逐行调用，部分成功语义。
 */

/** 列表 store（模块级单例：导航返回复用同一份分页/筛选状态） */
const usersListStore = createListStore<{ status: string | null }>({
  status: null,
});

const { t, locale } = useI18n();
const toast = useToast();
const queryClient = useQueryClient();
const auth = useAuthStore();

const currentUserId = computed(() => auth.user?.id);
const currentUserIsSuperAdmin = computed(
  () => auth.user?.roles.includes("super_admin") ?? false,
);

/** 目标用户是否受写操作保护（删除/停用/重置密码入口隐藏条件，v1.4.6） */
function isProtectedUser(user: User) {
  return (
    user.id === currentUserId.value ||
    user.username === "admin" ||
    (user.roles.some((r) => r.code === SUPER_ADMIN_ROLE_CODE) &&
      !currentUserIsSuperAdmin.value)
  );
}

const { canAdd, canEdit, canDelete, canBatchDelete, canResetPassword } =
  useMenuPermissions();

// ---------------- 列表（服务端分页 + 筛选 + 排序） ----------------
const store = usersListStore;

const { data, pagination, isLoading, isFetching, isError, refetch } =
  useListQuery<User, { status: string | null }>({
    store,
    queryKeyPrefix: USERS_QUERY_KEY,
    path: "/users",
    buildFilters: (f) => (f.status ? { status: f.status } : {}),
  });

// 搜索（提交式后端过滤，后端匹配 username/email/displayName 三字段）
const searchInput = ref(store.search);

function applySearch() {
  store.setSearch(searchInput.value.trim());
}

const searchDirty = computed(() => searchInput.value.trim() !== store.search);

function resetFilters() {
  searchInput.value = "";
  store.reset();
}

const filterOptions = computed(() => [
  { label: t("features.users.filter.active"), value: "active" },
  { label: t("features.users.filter.disabled"), value: "disabled" },
]);

// ---------------- 弹窗状态 ----------------
const formOpen = ref(false);
const formMode = ref<"create" | "edit">("create");
const formUser = ref<User | null>(null);

const resetPwdOpen = ref(false);
const resetTarget = ref<User | null>(null);

const deleteOpen = ref(false);
const deleteTarget = ref<User | null>(null);

const batchDeleteOpen = ref(false);
const batchDeleteIds = ref<string[]>([]);

const statusOpen = ref(false);
const statusTarget = ref<{ users: User[]; next: UserStatus } | null>(null);

function openForm(mode: "create" | "edit", user: User | null) {
  formMode.value = mode;
  formUser.value = user;
  formOpen.value = true;
}

/** 列表失效：USERS_QUERY_KEY 前缀覆盖全部分页/筛选组合 */
function invalidateList() {
  void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
}

// ---------------- 表格（TanStack vue-table，服务端分页/排序受控） ----------------
const columns = computed<AppColumnDef<User>[]>(() => [
  {
    id: "select",
    enableSorting: false,
    enableHiding: false,
    header: ({ table: headerTable }) =>
      h(UCheckbox, {
        modelValue: headerTable.getIsAllPageRowsSelected(),
        "onUpdate:modelValue": (value: unknown) =>
          headerTable.toggleAllPageRowsSelected(Boolean(value)),
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        disabled: !row.getCanSelect(),
        "onUpdate:modelValue": (value: unknown) =>
          row.toggleSelected(Boolean(value)),
      }),
  },
  {
    id: "user",
    enableSorting: false,
    header: () => t("features.users.column.user"),
    cell: ({ row }) => h(UserInfo, { user: row.original }),
  },
  {
    accessorKey: "username",
    header: () => t("features.users.column.username"),
    cell: ({ row }) =>
      h("span", { class: "text-sm font-medium" }, row.original.username),
  },
  {
    accessorKey: "status",
    enableSorting: true,
    header: () => t("features.users.column.status"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "flex justify-center" },
        h(UBadge, {
          color: row.original.status === "active" ? "success" : "error",
          label: t(
            row.original.status === "active"
              ? "features.users.filter.active"
              : "features.users.filter.disabled",
          ),
          variant: "soft",
        }),
      ),
  },
  {
    id: "gender",
    enableSorting: false,
    header: () => t("features.users.column.gender"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-sm" },
        row.original.gender
          ? t(
              row.original.gender === "male"
                ? "features.users.gender.male"
                : "features.users.gender.female",
            )
          : "—",
      ),
  },
  {
    id: "deptName",
    enableSorting: false,
    header: () => t("features.users.column.dept"),
    cell: ({ row }) =>
      h("span", { class: "text-sm" }, row.original.deptName ?? "—"),
  },
  {
    id: "roles",
    enableSorting: false,
    header: () => t("features.users.column.roles"),
    cell: ({ row }) => h(UsersRolesCell, { roles: row.original.roles }),
  },
  {
    id: "links",
    enableSorting: false,
    header: () => t("features.users.column.links"),
    cell: ({ row }) => h(UsersLinksCell, { user: row.original }),
  },
  {
    // 后端排序白名单不含 lastLoginAt，禁用排序避免静默回退 createdAt
    accessorKey: "lastLoginAt",
    enableSorting: false,
    header: () => t("features.users.column.lastLoginAt"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-muted text-sm" },
        row.original.lastLoginAt
          ? formatDateTime(row.original.lastLoginAt, locale.value)
          : "—",
      ),
  },
  {
    accessorKey: "createdAt",
    header: () => t("common.column.createdAt"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-muted text-sm" },
        formatDateTime(row.original.createdAt, locale.value),
      ),
  },
  {
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    header: () => t("common.actions"),
    cell: ({ row }) => {
      const user = row.original;
      // 写操作保护（v1.4.6）：受保护用户隐藏删除与重置密码；启用不受保护约束
      const isProtected = isProtectedUser(user);
      const canToggle = canEdit && !(isProtected && user.status === "active");
      const nextStatus: UserStatus =
        user.status === "active" ? "disabled" : "active";

      if (!canEdit && !canDelete && !canResetPassword) {
        return null;
      }

      return h(UsersRowActions, {
        user,
        canEdit: canEdit,
        canDelete: canDelete,
        canResetPassword: canResetPassword,
        isProtected,
        nextStatus,
        canToggle,
        onAction: (key) => {
          if (key === "edit") openForm("edit", user);
          if (key === "reset-password") {
            resetTarget.value = user;
            resetPwdOpen.value = true;
          }
          if (key === "toggle" && canToggle) {
            statusTarget.value = { users: [user], next: nextStatus };
            statusOpen.value = true;
          }
          if (key === "delete" && canDelete && !isProtected) {
            deleteTarget.value = user;
            deleteOpen.value = true;
          }
        },
      });
    },
  },
]);

const table: AppTable<User> = useTable({
  get data() {
    return data.value;
  },
  columns: columns.value,
  features: appTableFeatures,
  getRowId: (row: User) => row.id,
  // 写操作保护：受保护用户不可被勾选（从源头排除批量删除/停用命中，v1.4.6）
  enableRowSelection: (row: { original: User }) =>
    !isProtectedUser(row.original),
  // 服务端分页 + 服务端排序：状态由列表 store 驱动（受控），仅取数
  manualPagination: true,
  manualSorting: true,
  pageCount: Math.max(1, Math.ceil(pagination.value.total / store.pageSize)),
  state: {
    get pagination() {
      return { pageIndex: store.page - 1, pageSize: store.pageSize };
    },
    get sorting() {
      return store.sorting;
    },
  },
  onPaginationChange: (updater) => {
    const next =
      typeof updater === "function"
        ? updater({ pageIndex: store.page - 1, pageSize: store.pageSize })
        : updater;

    if (next.pageSize !== store.pageSize) {
      store.setPageSize(next.pageSize);
    } else {
      store.setPage(next.pageIndex + 1);
    }
  },
  onSortingChange: (updater) => {
    const next =
      typeof updater === "function" ? updater(store.sorting) : updater;

    store.setSorting(next);
  },
});

/** 状态切换（单个/批量共用）：Promise.allSettled 逐行调用，
 * 部分成功不回滚；结束统一失效列表反映真实状态并清空勾选。 */
async function confirmStatusChange() {
  const target = statusTarget.value;

  if (!target) return;

  const results = await Promise.allSettled(
    target.users.map((user) => updateUserStatus(user.id, target.next)),
  );

  invalidateList();
  table.resetRowSelection();

  const failed = results.filter((result) => result.status === "rejected");

  if (failed.length === 0) {
    toast.add({
      color: "success",
      duration: 5000,
      title:
        target.users.length === 1
          ? t("features.users.message.statusChangeSuccess")
          : t("features.users.message.batchStatusSuccess", {
              count: target.users.length,
            }),
    });

    return;
  }

  toast.add({
    color: "warning",
    duration: 5000,
    title: t("features.users.message.batchStatusPartial", {
      ok: target.users.length - failed.length,
      fail: failed.length,
    }),
  });

  // 首个失败原因透出（多为 USER_NOT_FOUND：该用户已被他人删除）
  const firstError = failed[0];

  if (firstError.status === "rejected") {
    toast.add({
      color: "error",
      duration: 5000,
      title: getUserErrorMessage(firstError.reason),
    });
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return;

  try {
    await deleteUser(deleteTarget.value.id);
  } catch (error) {
    toast.add({
      color: "error",
      duration: 5000,
      title: getUserErrorMessage(error),
    });

    return; // 失败保持弹窗打开（ConfirmDialog 约定）
  }

  invalidateList();
  // 与 logs 页口径一致：删除后清理勾选残留
  table.resetRowSelection();
  deleteOpen.value = false;
  toast.add({
    color: "success",
    duration: 5000,
    title: t("features.users.message.deleteSuccess"),
  });
}

async function confirmBatchDelete() {
  try {
    await batchDeleteUsers(batchDeleteIds.value);
  } catch (error) {
    toast.add({
      color: "error",
      duration: 5000,
      title: getUserErrorMessage(error),
    });

    return;
  }

  invalidateList();
  table.resetRowSelection();
  batchDeleteOpen.value = false;
  toast.add({
    color: "success",
    duration: 5000,
    title: t("features.users.message.deleteSuccess"),
  });
}

const selectedUsers = computed(() =>
  table.getSelectedRowModel().rows.map((row) => row.original),
);
</script>

<template>
  <div class="flex w-full flex-col pb-8">
    <DataTableToolbar>
      <UInput
        v-model="searchInput"
        :aria-label="t('features.users.searchPlaceholder')"
        :placeholder="t('features.users.searchPlaceholder')"
        class="w-64"
        icon="i-lucide-search"
        size="sm"
        @keyup.enter="applySearch"
      />
      <USelect
        :aria-label="t('features.users.column.status')"
        :items="filterOptions"
        :model-value="store.filters.status ?? undefined"
        :placeholder="t('features.users.filter.all')"
        class="w-36"
        size="sm"
        value-key="value"
        @update:model-value="
          (value: unknown) => store.setFilters({ status: value as string })
        "
      />
      <DataTableSearchReset
        :can-reset="
          searchDirty || store.search !== '' || store.filters.status !== null
        "
        :fetching="isFetching"
        :search-dirty="searchDirty"
        @reset="resetFilters"
        @search="applySearch"
      />
      <template #actions>
        <UButton
          v-if="canAdd"
          :label="t('features.users.action.add')"
          icon="i-lucide-plus"
          size="sm"
          variant="outline"
          @click="openForm('create', null)"
        />
      </template>
    </DataTableToolbar>

    <ErrorContent
      v-if="isError"
      :retry-label="t('common.retry')"
      :title="t('common.loadError')"
      @retry="refetch()"
    />
    <DataTable
      v-else
      :loading="isLoading"
      :min-width="'860px'"
      :refreshing="isFetching && !isLoading"
      :table="table"
    />

    <DataTablePagination
      :page-index="store.page - 1"
      :page-size="store.pageSize"
      :table="table"
      :total="pagination.total"
    />

    <DataTableBulkActions :table="table">
      <template v-if="canEdit">
        <UButton
          :label="t('features.users.bulk.enable')"
          icon="i-lucide-power"
          size="sm"
          variant="ghost"
          @click="
            statusTarget = { users: selectedUsers, next: 'active' };
            statusOpen = true;
          "
        />
        <UButton
          :label="t('features.users.bulk.disable')"
          icon="i-lucide-power-off"
          size="sm"
          variant="ghost"
          @click="
            statusTarget = { users: selectedUsers, next: 'disabled' };
            statusOpen = true;
          "
        />
      </template>
      <UButton
        v-if="canBatchDelete"
        :label="t('features.users.bulk.delete')"
        icon="i-lucide-trash-2"
        color="error"
        size="sm"
        variant="soft"
        @click="
          batchDeleteIds = selectedUsers.map((user) => user.id);
          batchDeleteOpen = true;
        "
      />
    </DataTableBulkActions>

    <UserFormDialog
      v-model:open="formOpen"
      :mode="formMode"
      :user="formUser"
      @saved="invalidateList"
    />

    <UserResetPasswordDialog
      v-model:open="resetPwdOpen"
      :user="resetPwdOpen ? resetTarget : null"
      @saved="invalidateList"
    />

    <ConfirmDialog
      v-model:open="deleteOpen"
      :confirm-keyword="deleteTarget?.username"
      :confirm-text="t('common.delete')"
      :description="
        t('features.users.message.deleteDesc', {
          name: deleteTarget?.username ?? '',
        })
      "
      :keyword-label="t('features.users.message.deleteKeyword')"
      :title="t('features.users.message.deleteTitle')"
      destructive
      @confirm="confirmDelete"
    />

    <ConfirmDialog
      v-model:open="batchDeleteOpen"
      :confirm-keyword="'DELETE'"
      :confirm-text="t('common.delete')"
      :description="
        t('features.users.message.batchDeleteDesc', {
          count: batchDeleteIds.length,
        })
      "
      :keyword-label="t('features.users.message.batchDeleteKeyword')"
      :title="t('features.users.message.batchDeleteTitle')"
      destructive
      @confirm="confirmBatchDelete"
    />

    <ConfirmDialog
      v-model:open="statusOpen"
      :confirm-text="
        statusTarget?.next === 'disabled'
          ? t('features.users.action.disable')
          : t('features.users.action.enable')
      "
      :description="
        statusTarget
          ? statusTarget.users.length === 1
            ? statusTarget.next === 'disabled'
              ? t('features.users.message.disableDesc', {
                  name: statusTarget.users[0]?.username ?? '',
                })
              : t('features.users.message.enableDesc', {
                  name: statusTarget.users[0]?.username ?? '',
                })
            : statusTarget.next === 'disabled'
              ? t('features.users.message.batchDisableDesc', {
                  count: statusTarget.users.length,
                })
              : t('features.users.message.batchEnableDesc', {
                  count: statusTarget.users.length,
                })
          : null
      "
      :destructive="statusTarget?.next === 'disabled'"
      :title="
        t(
          statusTarget?.next === 'disabled'
            ? 'features.users.message.disableTitle'
            : 'features.users.message.enableTitle',
        )
      "
      @confirm="confirmStatusChange"
    />
  </div>
</template>

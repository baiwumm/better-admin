<script setup lang="ts">
import type { Role } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/data-table/table-types";

import { computed, h, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useQueryClient } from "@tanstack/vue-query";
import { useVueTable } from "@tanstack/vue-table";
import { getCoreRowModel, getSortedRowModel } from "@tanstack/vue-table";
import { useToast } from "@nuxt/ui/composables";

import {
  deleteRole,
  getRoleErrorMessage,
  ROLES_QUERY_KEY,
  updateRole,
} from "./role-api";
import RoleFormDialog from "./RoleFormDialog.vue";
import RoleGrantDrawer from "./RoleGrantDrawer.vue";
import RolesRowActions from "./RolesRowActions.vue";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import ErrorContent from "@/components/common/ErrorContent.vue";
import DataTable from "@/components/data-table/DataTable.vue";
import DataTablePagination from "@/components/data-table/DataTablePagination.vue";
import DataTableSearchReset from "@/components/data-table/DataTableSearchReset.vue";
import DataTableToolbar from "@/components/data-table/DataTableToolbar.vue";
import { type AppTable } from "@/components/data-table/table-types";
import Spinner from "@/components/ui/spinner/index.vue";
import { MENUS_QUERY_KEY } from "@/composables/use-menus";
import { useMenuPermissions } from "@/composables/use-permissions";
import { useListQuery } from "@/composables/use-list-query";
import { createListStore } from "@/lib/list-store";
import { formatDateTime } from "@/lib/format-date";
import { SUPER_ADMIN_ROLE_CODE } from "@/lib/constants";

/**
 * 角色管理页（对齐 React 端 roles-page）：服务端分页列表
 * （page/pageSize/search/enabled）+ CRUD + 菜单授权。
 *
 * - 状态切换走 PUT /roles/:id 的 enabled 字段（EDIT 位）；
 * - 删除为强确认（输入角色 code），已关联用户由后端 409 ROLE_IN_USE 拦截；
 * - 菜单授权为右侧 Drawer（GRANT 位控制入口），保存后失效导航菜单缓存：
 *   若改的是当前用户自己的角色，侧边栏与按钮权限立即生效；
 * - super_admin 行：授权/删除/状态切换不可用（全量权限载体，后端 403 兜底）；
 *   编辑保留——name/description 无权限语义。
 */

/** 列表 store（模块级单例：导航返回复用同一份分页/筛选状态） */
const rolesListStore = createListStore<{ enabled: string | null }>({
  enabled: null,
});

const { t, locale } = useI18n();
const toast = useToast();
const queryClient = useQueryClient();
const store = rolesListStore;

const { canAdd, canEdit, canDelete, canGrant } = useMenuPermissions();

const { data, pagination, isLoading, isFetching, isError, refetch } =
  useListQuery<Role, { enabled: string | null }>({
    store,
    queryKeyPrefix: ROLES_QUERY_KEY,
    path: "/roles",
    buildFilters: (f) => (f.enabled ? { enabled: f.enabled } : {}),
  });

// 搜索（提交式后端过滤）
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
  { label: t("features.roles.filter.enabled"), value: "true" },
  { label: t("features.roles.filter.disabled"), value: "false" },
]);

// ---------------- 弹窗状态 ----------------
const formOpen = ref(false);
const formMode = ref<"create" | "edit">("create");
const formRole = ref<Role | null>(null);

const grantOpen = ref(false);
const grantRole = ref<Role | null>(null);

const deleteOpen = ref(false);
const deleteTarget = ref<Role | null>(null);
const deleteSubmitting = ref(false);

function openForm(mode: "create" | "edit", role: Role | null) {
  formMode.value = mode;
  formRole.value = role;
  formOpen.value = true;
}

function invalidateList() {
  void queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
}

/** 授权保存后：失效导航菜单缓存（当前用户自己的角色授权立即生效） */
function handleGrantSaved() {
  void queryClient.invalidateQueries({ queryKey: MENUS_QUERY_KEY });
}

/** 状态切换（PUT enabled 字段；toast.promise 三段反馈：启用中/停用中 → 成功/失败） */
async function toggleStatus(role: Role) {
  const enabling = !role.enabled;

  const loadingToast = toast.add({
    title: t(
      enabling
        ? "features.roles.message.enabling"
        : "features.roles.message.disabling",
    ),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  try {
    await updateRole(role.id, { name: role.name, enabled: enabling });
    invalidateList();
    toast.update(loadingToast.id, {
      title: t("features.roles.message.statusSuccess"),
      icon: "i-lucide-check",
      color: "success",
    });
  } catch (error) {
    toast.update(loadingToast.id, {
      title: getRoleErrorMessage(error),
      icon: "i-lucide-x",
      color: "error",
    });
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return;

  deleteSubmitting.value = true;

  try {
    await deleteRole(deleteTarget.value.id);
  } catch (error) {
    toast.add({
      color: "error",
      title: getRoleErrorMessage(error),
    });

    return; // 失败保持弹窗打开
  } finally {
    deleteSubmitting.value = false;
  }

  invalidateList();
  deleteOpen.value = false;
  toast.add({
    color: "success",
    title: t("features.roles.message.deleteSuccess"),
  });
}

// ---------------- 表格 ----------------
const columns = computed<AppColumnDef<Role>[]>(() => [
  {
    id: "name",
    enableSorting: false,
    header: () => t("features.roles.column.name"),
    cell: ({ row }) =>
      h(
        "div",
        { class: "flex items-center gap-2" },
        h("span", { class: "text-sm font-medium" }, row.original.name),
      ),
  },
  {
    id: "code",
    enableSorting: false,
    header: () => t("features.roles.column.code"),
    cell: ({ row }) =>
      h("span", { class: "font-mono text-sm" }, row.original.code),
  },
  {
    id: "description",
    enableSorting: false,
    header: () => t("features.roles.column.description"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-muted max-w-64 truncate text-sm" },
        row.original.description || "—",
      ),
  },
  {
    id: "sort",
    enableSorting: false,
    header: () => t("common.column.sort"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "flex justify-center" },
        h(UBadge, {
          color: "neutral",
          label: String(row.original.sort),
          variant: "soft",
        }),
      ),
  },
  {
    id: "enabled",
    enableSorting: false,
    header: () => t("features.roles.column.enabled"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "flex justify-center" },
        h(UBadge, {
          color: row.original.enabled ? "success" : "error",
          label: t(
            row.original.enabled
              ? "features.roles.filter.enabled"
              : "features.roles.filter.disabled",
          ),
          variant: "soft",
        }),
      ),
  },
  {
    id: "createdAt",
    enableSorting: false,
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
      // 系统内置角色保护：super_admin 的授权/删除/状态切换均不可用
      const isSuperAdmin = row.original.code === SUPER_ADMIN_ROLE_CODE;
      const canGrantRow = canGrant.value && !isSuperAdmin;
      const canToggle = canEdit.value && !isSuperAdmin;
      const canDeleteRow = canDelete.value && !isSuperAdmin;

      if (!canGrantRow && !canEdit.value && !canDeleteRow) return null;

      return h(RolesRowActions, {
        role: row.original,
        canEdit: canEdit.value,
        canGrantRow,
        canToggle,
        canDeleteRow,
        onAction: (key) => {
          if (key === "grant") {
            grantRole.value = row.original;
            grantOpen.value = true;
          }
          if (key === "edit") openForm("edit", row.original);
          if (key === "toggle" && canToggle) void toggleStatus(row.original);
          if (key === "delete") {
            deleteTarget.value = row.original;
            deleteOpen.value = true;
          }
        },
      });
    },
  },
]);

const table: AppTable<Role> = useVueTable({
  get data() {
    return data.value;
  },
  get columns() {
    return columns.value;
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getRowId: (row: Role) => row.id,
  // 服务端分页：分页状态由列表 store 驱动（受控），仅取数
  manualPagination: true,
  // pageCount 必须用 getter 实时求值：setup 时 total 为 0 会写死为 1，
  // setPageIndex 被 clamp 导致永远翻不了页（对齐 React 每次渲染重建 options）
  get pageCount() {
    return Math.max(1, Math.ceil(pagination.value.total / store.pageSize));
  },
  state: {
    get pagination() {
      return { pageIndex: store.page - 1, pageSize: store.pageSize };
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
});

import { resolveComponent } from "vue";

// UBadge 组件引用（供 h() 使用）
const UBadge = resolveComponent("UBadge");
</script>

<template>
  <div class="flex w-full flex-col">
    <DataTableToolbar>
      <UInput
        v-model="searchInput"
        :aria-label="t('features.roles.searchPlaceholder')"
        :placeholder="t('features.roles.searchPlaceholder')"
        class="w-64"
        icon="i-lucide-search"
        size="sm"
        @keyup.enter="applySearch"
      />
      <USelect
        :aria-label="t('features.roles.column.enabled')"
        :items="filterOptions"
        :model-value="store.filters.enabled ?? undefined"
        :placeholder="t('features.roles.filter.all')"
        class="w-36"
        size="sm"
        value-key="value"
        @update:model-value="
          (value: unknown) => store.setFilters({ enabled: value as string })
        "
      />
      <DataTableSearchReset
        :can-reset="
          searchDirty || store.search !== '' || store.filters.enabled !== null
        "
        :fetching="isFetching"
        :search-dirty="searchDirty"
        @reset="resetFilters"
        @search="applySearch"
      />
      <template #actions>
        <UButton
          v-if="canAdd"
          :label="t('features.roles.action.add')"
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
      :refreshing="isFetching && !isLoading"
      :table="table"
    />

    <DataTablePagination
      :page-index="store.page - 1"
      :page-size="store.pageSize"
      :table="table"
      :total="pagination.total"
    />

    <RoleFormDialog
      v-model:open="formOpen"
      :mode="formMode"
      :role="formRole"
      @saved="invalidateList"
    />

    <RoleGrantDrawer
      v-model:open="grantOpen"
      :role="
        grantOpen && grantRole
          ? { id: grantRole.id, name: grantRole.name, code: grantRole.code }
          : null
      "
      @saved="handleGrantSaved"
    />

    <ConfirmDialog
      v-model:open="deleteOpen"
      :confirm-keyword="deleteTarget?.code"
      :confirm-text="t('common.delete')"
      :description="
        t('features.roles.message.deleteDesc', {
          name: deleteTarget?.name ?? '',
        })
      "
      :keyword-label="t('features.roles.message.deleteKeyword')"
      :loading="deleteSubmitting"
      :title="t('features.roles.message.deleteTitle')"
      destructive
      @confirm="confirmDelete"
    />
  </div>
</template>

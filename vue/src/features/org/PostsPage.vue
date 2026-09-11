<script setup lang="ts">
import type { DeptTreeNode, Post } from "@/lib/api-types";
import type {
  AppColumnDef,
  AppTable,
} from "@/components/data-table/table-types";

import { computed, h, ref, resolveComponent } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { keepPreviousData } from "@tanstack/vue-query";
import { useVueTable } from "@tanstack/vue-table";
import { getCoreRowModel, getSortedRowModel } from "@tanstack/vue-table";
import { useToast } from "@nuxt/ui/composables";

import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "./dept-api";
import { POSTS_QUERY_KEY, deletePost, getPostErrorMessage } from "./post-api";
import DeptTreeSelect from "./DeptTreeSelect.vue";
import PostFormDialog from "./PostFormDialog.vue";
import PostMembersDrawer from "./PostMembersDrawer.vue";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import ErrorContent from "@/components/common/ErrorContent.vue";
import DataTable from "@/components/data-table/DataTable.vue";
import DataTablePagination from "@/components/data-table/DataTablePagination.vue";
import DataTableSearchReset from "@/components/data-table/DataTableSearchReset.vue";
import DataTableToolbar from "@/components/data-table/DataTableToolbar.vue";
import { useColumnSettingKey } from "@/composables/use-column-setting-key";
import { useMenuPermissions } from "@/composables/use-permissions";
import { useListQuery } from "@/composables/use-list-query";
import { createListStore } from "@/lib/list-store";

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");

/**
 * 岗位管理页（契约 v1.6.0 阶段 2，对应 React 端 posts-page.tsx）：
 * 筛选区 + 服务端分页表格。
 *
 * - 筛选：所属组织（DeptTreeSelect，含下级组织的岗位）+ 关键词 + 类别 + 状态；
 * - 列表状态入 feature store（keepAlive 友好），由 useListQuery 装配；
 * - 组织树复用 GET /org/depts/tree 查询缓存（与组织管理页同 key）；
 * - 「在职人数」列点击打开成员穿透抽屉；删除由后端在职校验 409 拦截。
 */

/** 列表 store（模块级单例：导航返回复用同一份分页/筛选状态） */
const postsListStore = createListStore<{
  deptId: string | null;
  category: string | null;
  status: string | null;
}>({
  deptId: null,
  category: null,
  status: null,
});

const { t } = useI18n();
const toast = useToast();
const queryClient = useQueryClient();
const { canAdd, canEdit, canDelete } = useMenuPermissions();

const store = postsListStore;

// 组织树（所属组织筛选与表单共用；与组织管理页共享缓存）
const treeQuery = useQuery({
  queryKey: DEPTS_TREE_QUERY_KEY,
  queryFn: fetchDeptTree,
  placeholderData: keepPreviousData,
  staleTime: 0,
});
const tree = computed<DeptTreeNode[]>(() => treeQuery.data.value ?? []);

// ---------------- 列表（服务端分页 + 筛选 + 排序） ----------------
const {
  data,
  pagination,
  isLoading,
  isFetching,
  isError,
  refetch,
  submitSearch,
} = useListQuery<
  Post,
  {
    deptId: string | null;
    category: string | null;
    status: string | null;
  }
>({
  store,
  queryKeyPrefix: POSTS_QUERY_KEY,
  path: "/org/posts",
  // 后端搜索参数名为 keyword（/org/* 统一命名）
  searchParam: "keyword",
  buildFilters: (f) => ({
    ...(f.deptId ? { deptId: f.deptId } : {}),
    ...(f.category ? { category: f.category } : {}),
    ...(f.status ? { status: f.status } : {}),
  }),
});

// 搜索（提交式后端过滤：岗位名称）；条件未变化时 submitSearch 走 refetch，
// 搜索按钮即「刷新列表」入口
const searchInput = ref(store.search);

function applySearch() {
  submitSearch(searchInput.value.trim());
}

const searchDirty = computed(() => searchInput.value.trim() !== store.search);

function resetFilters() {
  searchInput.value = "";
  store.reset();
}

const categoryOptions = computed<{ label: string; value: string }[]>(() =>
  (["management", "professional", "production"] as const).map((value) => ({
    label: t(`features.posts.category.${value}`),
    value,
  })),
);
const statusOptions = computed<{ label: string; value: string }[]>(() => [
  { label: t("features.posts.status.enabled"), value: "enabled" },
  { label: t("features.posts.status.disabled"), value: "disabled" },
]);

const canReset = computed(
  () =>
    searchDirty.value ||
    store.search !== "" ||
    Boolean(store.filters.deptId) ||
    Boolean(store.filters.category) ||
    Boolean(store.filters.status),
);

// ---------------- 弹窗状态 ----------------
const formOpen = ref(false);
const formMode = ref<"create" | "edit">("create");
const formPost = ref<Post | null>(null);

const membersOpen = ref(false);
const membersTarget = ref<Post | null>(null);

const deleteOpen = ref(false);
const deleteTarget = ref<Post | null>(null);
const deleteSubmitting = ref(false);

function openForm(mode: "create" | "edit", post: Post | null) {
  formMode.value = mode;
  formPost.value = post;
  formOpen.value = true;
}

function openMembers(post: Post) {
  membersTarget.value = post;
  membersOpen.value = true;
}

/** 列表失效：岗位变化影响组织树在职/岗位计数，一并失效 */
function invalidateList() {
  void queryClient.invalidateQueries({ queryKey: POSTS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: DEPTS_TREE_QUERY_KEY });
}

async function confirmDelete() {
  if (!deleteTarget.value) return;

  deleteSubmitting.value = true;

  try {
    await deletePost(deleteTarget.value.id);
  } catch (error) {
    toast.add({
      color: "error",
      title: getPostErrorMessage(error),
    });

    return; // 失败保持弹窗打开（ConfirmDialog 约定）
  } finally {
    deleteSubmitting.value = false;
  }

  invalidateList();
  deleteOpen.value = false;
  toast.add({
    color: "success",
    title: t("features.posts.message.deleted"),
  });
}

// ---------------- 表格（TanStack vue-table，服务端分页/排序受控） ----------------
const columns = computed<AppColumnDef<Post>[]>(() => [
  {
    accessorKey: "name",
    enableSorting: true,
    header: () => t("features.posts.column.name"),
    cell: ({ row }) =>
      h("span", { class: "text-sm font-medium" }, row.original.name),
  },
  {
    id: "deptPath",
    enableSorting: false,
    header: () => t("features.posts.column.dept"),
    cell: ({ row }) =>
      h("span", { class: "text-sm" }, row.original.deptPath || "—"),
  },
  {
    id: "category",
    enableSorting: false,
    header: () => t("features.posts.column.category"),
    cell: ({ row }) =>
      h(UBadge, {
        color: "neutral",
        label: t(`features.posts.category.${row.original.category}`),
        variant: "soft",
      }),
  },
  {
    id: "rank",
    enableSorting: false,
    header: () => t("features.posts.column.rank"),
    cell: ({ row }) =>
      h("span", { class: "font-mono text-sm" }, row.original.rank || "—"),
  },
  {
    id: "userCount",
    enableSorting: false,
    header: () => t("features.posts.column.userCount"),
    cell: ({ row }) =>
      h(
        "button",
        {
          class:
            "rounded-md px-2 py-1 text-sm underline-offset-4 transition-colors hover:bg-elevated/60 hover:underline",
          type: "button",
          onClick: () => openMembers(row.original),
        },
        String(row.original.userCount),
      ),
  },
  {
    id: "status",
    enableSorting: false,
    header: () => t("features.posts.column.status"),
    cell: ({ row }) =>
      h(UBadge, {
        color: row.original.status === "enabled" ? "success" : "error",
        label: t(
          row.original.status === "enabled"
            ? "features.posts.status.enabled"
            : "features.posts.status.disabled",
        ),
        variant: "soft",
      }),
  },
  {
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    header: () => t("common.actions"),
    cell: ({ row }) => {
      if (!canEdit.value && !canDelete.value) return null;

      const items: Array<{
        key: string;
        label: string;
        icon: string;
        color?: "error";
        onSelect: () => void;
      }> = [];

      if (canEdit.value) {
        items.push({
          key: "edit",
          label: t("common.edit"),
          icon: "i-lucide-pencil",
          onSelect: () => openForm("edit", row.original),
        });
      }
      if (canDelete.value) {
        items.push({
          key: "delete",
          label: t("common.delete"),
          icon: "i-lucide-trash-2",
          color: "error",
          onSelect: () => {
            deleteTarget.value = row.original;
            deleteOpen.value = true;
          },
        });
      }

      return h(
        UDropdownMenu,
        { items: [items], content: { align: "center" } },
        () =>
          h(UButton, {
            "aria-label": t("common.actions"),
            color: "neutral",
            icon: "i-lucide-ellipsis",
            size: "sm",
            variant: "ghost",
          }),
      );
    },
  },
]);

const columnSettingKey = useColumnSettingKey("/org/posts");

const table: AppTable<Post> = useVueTable({
  get data() {
    return data.value;
  },
  get columns() {
    return columns.value;
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getRowId: (row: Post) => row.id,
  // 服务端分页 + 服务端排序：状态由列表 store 驱动（受控），仅取数
  manualPagination: true,
  manualSorting: true,
  // pageCount 必须用 getter 实时求值（对齐 UsersPage：写死会导致翻页被 clamp）
  get pageCount() {
    return Math.max(1, Math.ceil(pagination.value.total / store.pageSize));
  },
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

const deleteDescription = computed(() =>
  t("features.posts.message.deleteDesc", {
    name: deleteTarget.value?.name ?? "",
  }),
);
</script>

<script lang="ts">
export default { name: "PostsPage" };
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <DataTableToolbar :column-setting-key="columnSettingKey" :table="table">
      <div class="w-56">
        <DeptTreeSelect
          :aria-label="t('features.posts.filter.dept')"
          :model-value="store.filters.deptId ?? ''"
          :placeholder="t('features.org.deptTreeSelect.placeholder')"
          :tree="tree"
          @update:model-value="
            (key: unknown) =>
              store.setFilters({ deptId: key ? String(key) : null })
          "
        />
      </div>
      <USelectMenu
        :aria-label="t('features.posts.filter.category')"
        :items="categoryOptions"
        :model-value="store.filters.category ?? undefined"
        :placeholder="t('features.posts.column.category')"
        class="w-36"
        value-key="value"
        clear
        :search-input="false"
        @update:model-value="
          (value: unknown) =>
            store.setFilters({ category: value ? String(value) : null })
        "
      />
      <USelectMenu
        :aria-label="t('features.posts.filter.status')"
        :items="statusOptions"
        :model-value="store.filters.status ?? undefined"
        :placeholder="t('features.posts.column.status')"
        class="w-36"
        value-key="value"
        clear
        :search-input="false"
        @update:model-value="
          (value: unknown) =>
            store.setFilters({ status: value ? String(value) : null })
        "
      />
      <UInput
        v-model="searchInput"
        :aria-label="t('features.posts.search.placeholder')"
        :placeholder="t('features.posts.search.placeholder')"
        class="w-56"
        icon="i-lucide-search"
        @keyup.enter="applySearch"
      />
      <DataTableSearchReset
        :can-reset="canReset"
        :fetching="isFetching"
        @reset="resetFilters"
        @search="applySearch"
      />
      <UButton
        v-if="canAdd"
        :label="t('features.posts.action.add')"
        icon="i-lucide-plus"
        variant="outline"
        @click="openForm('create', null)"
      />
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

    <PostFormDialog
      v-model:open="formOpen"
      :mode="formMode"
      :post="formPost"
      :tree="tree"
      @saved="invalidateList"
    />

    <PostMembersDrawer v-model:open="membersOpen" :post="membersTarget" />

    <ConfirmDialog
      v-model:open="deleteOpen"
      :confirm-keyword="deleteTarget?.name"
      :confirm-text="t('common.delete')"
      :description="deleteDescription"
      :keyword-label="t('features.posts.message.deleteKeyword')"
      :loading="deleteSubmitting"
      :title="t('features.posts.message.deleteTitle')"
      destructive
      @confirm="confirmDelete"
    />
  </div>
</template>

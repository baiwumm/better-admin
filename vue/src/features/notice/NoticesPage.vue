<script setup lang="ts">
import type { Notice, NoticeScope } from "@/lib/api-types";
import type {
  AppColumnDef,
  AppTable,
} from "@/components/data-table/table-types";

import {
  computed,
  defineAsyncComponent,
  h,
  ref,
  resolveComponent,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { keepPreviousData } from "@tanstack/vue-query";
import { useVueTable } from "@tanstack/vue-table";
import { getCoreRowModel, getSortedRowModel } from "@tanstack/vue-table";
import { useToast } from "@nuxt/ui/composables";

import {
  NOTICES_QUERY_KEY,
  deleteNotice,
  getNoticeErrorMessage,
  withdrawNotice,
} from "./notice-api";
import NoticeDetailDrawer from "./NoticeDetailDrawer.vue";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import UserInfo from "@/components/common/UserInfo.vue";
import Spinner from "@/components/ui/spinner/index.vue";
import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "@/features/org/dept-api";
import { dictItemsQueryKey, fetchDictItems } from "@/features/dicts/dict-api";
import { useColumnSettingKey } from "@/composables/use-column-setting-key";
import { useMenuPermissions } from "@/composables/use-permissions";
import { useListQuery } from "@/composables/use-list-query";
import { createListStore } from "@/lib/list-store";
import { formatDateTime } from "@/lib/format-date";
import { useAuthStore } from "@/stores/auth-store";

// 发布/编辑弹窗含 Tiptap 富文本（重依赖）：懒加载，不拖累列表页首屏模块图
const NoticeFormDialog = defineAsyncComponent(
  () => import("./NoticeFormDialog.vue"),
);

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");

/**
 * 公告管理页（契约 v1.7.0 阶段 3，对应 React 端 notices-page.tsx）：
 * 服务端分页列表（keyword/status 筛选，含范围人数与已读率）+
 * 发布/编辑弹窗（Tiptap 富文本 + 三粒度范围选择器 + 定时发布）+
 * 详情抽屉（已读/未读 Tab + 一键催办）+ 撤回/删除。
 */

/** 列表 store（模块级单例：导航返回复用同一份分页/筛选状态） */
const noticesListStore = createListStore<{ status: string | null }>({
  status: null,
});

const SCOPE_TYPE_TAGS = ["dept", "post", "user"] as const;

/** 发布范围摘要单格展示字数上限（超长截断 + Tooltip 完整提示） */
const SCOPE_SUMMARY_LIMIT = 20;

/**
 * 发布范围摘要：按类型分组回填 targetName，组间「；」分隔、组内「、」连接。
 * 例：「岗位：前端组、测试；人员：张三、李四」。目标已删除（targetName 为 null）
 * 用「已删除」占位；无 scopes 返回空串（列渲染降级为「—」）。
 */
function formatScopeSummary(
  scopes: NoticeScope[] | undefined,
  translate: (key: string) => string,
): string {
  if (!scopes || scopes.length === 0) return "";

  const groups: string[] = [];

  for (const type of SCOPE_TYPE_TAGS) {
    const names = scopes
      .filter((s) => s.scopeType === type)
      .map((s) => s.targetName ?? translate("features.notices.scope.deleted"));

    if (names.length === 0) continue;
    groups.push(
      `${translate(`features.notices.scope.${type}Tag`)}：${names.join("、")}`,
    );
  }

  return groups.join("；");
}

const { t, locale } = useI18n();
const toast = useToast();
const queryClient = useQueryClient();
const auth = useAuthStore();
const { canAdd, canEdit, canDelete } = useMenuPermissions();

const store = noticesListStore;

const currentUserId = computed(() => auth.user?.id);
const currentUserIsSuperAdmin = computed(
  () => auth.user?.roles.includes("super_admin") ?? false,
);

/** 发布人本人或 super_admin 才显示编辑/撤回/删除入口（与后端保护一致） */
function isOperator(notice: Notice) {
  return (
    notice.publisherId === currentUserId.value || currentUserIsSuperAdmin.value
  );
}

// ---------------- 列表（服务端分页 + 筛选 + 排序） ----------------
const {
  data,
  pagination,
  isLoading,
  isFetching,
  isError,
  refetch,
  submitSearch,
} = useListQuery<Notice, { status: string | null }>({
  store,
  queryKeyPrefix: NOTICES_QUERY_KEY,
  path: "/notices",
  // 后端标题搜索参数名为 keyword（与 /org/* 系列统一命名）
  searchParam: "keyword",
  buildFilters: (f) => (f.status ? { status: f.status } : {}),
});

// 搜索（提交式后端过滤：标题）；条件未变化时 submitSearch 走 refetch
const searchInput = ref(store.search);

function applySearch() {
  submitSearch(searchInput.value.trim());
}

const searchDirty = computed(() => searchInput.value.trim() !== store.search);

function resetFilters() {
  searchInput.value = "";
  store.reset();
}

// 状态字典驱动（notice_status：draft/published/withdrawn，字典管理可维护文案）
const statusDictQuery = useQuery({
  queryKey: dictItemsQueryKey("notice_status"),
  queryFn: () => fetchDictItems("notice_status"),
  staleTime: 60_000,
});

const statusOptions = computed(() =>
  (statusDictQuery.data.value ?? []).map((item) => ({
    value: item.value,
    label: item.i18nKey ? t(item.i18nKey) : item.label,
  })),
);

function statusLabel(value: string) {
  const item = (statusDictQuery.data.value ?? []).find(
    (d) => d.value === value,
  );

  return item ? (item.i18nKey ? t(item.i18nKey) : item.label) : value;
}

function statusColor(value: string) {
  return value === "published"
    ? "success"
    : value === "draft"
      ? "neutral"
      : "error";
}

// 组织树（发布范围选择器数据源，与组织/岗位页共享缓存）
const treeQuery = useQuery({
  queryKey: DEPTS_TREE_QUERY_KEY,
  queryFn: fetchDeptTree,
  placeholderData: keepPreviousData,
  staleTime: 0,
});
const deptTree = computed(() => treeQuery.data.value ?? []);

// ---------------- 缓存失效 ----------------
function invalidateList() {
  void queryClient.invalidateQueries({ queryKey: NOTICES_QUERY_KEY });
}

// ---------------- 弹窗状态 ----------------
const formOpen = ref(false);
const formMode = ref<"create" | "edit">("create");
const formNoticeId = ref<string | null>(null);

const detailOpen = ref(false);
const detailTarget = ref<Notice | null>(null);

const deleteOpen = ref(false);
const deleteTarget = ref<Notice | null>(null);
const deleteSubmitting = ref(false);

function openCreate() {
  formMode.value = "create";
  formNoticeId.value = null;
  formOpen.value = true;
}

function openEdit(notice: Notice) {
  formMode.value = "edit";
  formNoticeId.value = notice.id;
  formOpen.value = true;
}

function openDetail(notice: Notice) {
  detailTarget.value = notice;
  detailOpen.value = true;
}

function openDelete(notice: Notice) {
  deleteTarget.value = notice;
  deleteOpen.value = true;
}

// 撤回：toast.promise 三段式（icon 用项目 Spinner，自带旋转动画）
async function handleWithdraw(id: string) {
  const withdrawingToast = toast.add({
    title: t("features.notices.action.withdrawing"),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  try {
    await withdrawNotice(id);

    toast.update(withdrawingToast.id, {
      title: t("features.notices.message.withdrawn"),
      icon: "i-lucide-check",
      color: "success",
    });
  } catch (error) {
    toast.update(withdrawingToast.id, {
      title: getNoticeErrorMessage(error),
      icon: "i-lucide-x",
      color: "error",
    });
  } finally {
    invalidateList();
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return;

  deleteSubmitting.value = true;

  try {
    await deleteNotice(deleteTarget.value.id);
  } catch (error) {
    toast.add({
      color: "error",
      title: getNoticeErrorMessage(error),
    });

    return; // 失败保持弹窗打开（ConfirmDialog 约定）
  } finally {
    deleteSubmitting.value = false;
  }

  invalidateList();
  deleteOpen.value = false;
  toast.add({
    color: "success",
    title: t("features.notices.message.deleted"),
  });
}

// ---------------- 表格（TanStack vue-table，服务端分页/排序受控） ----------------
const columns = computed<AppColumnDef<Notice>[]>(() => [
  {
    id: "title",
    enableSorting: true,
    header: () => t("features.notices.column.title"),
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-1.5" }, [
        row.original.isTop
          ? h(UBadge, {
              color: "warning",
              label: t("features.notices.status.top"),
              size: "sm",
              variant: "soft",
            })
          : null,
        h(
          "span",
          { class: "max-w-72 truncate text-sm font-medium" },
          row.original.title,
        ),
      ]),
  },
  {
    id: "publisherName",
    enableSorting: false,
    header: () => t("features.notices.column.publisher"),
    cell: ({ row }) => {
      const notice = row.original;

      // 发布人被删除（publisherId 置空）时整体占位；否则头像 + 名称 + 邮箱
      return notice.publisherId && notice.publisherName
        ? h(UserInfo, {
            user: {
              username: notice.publisherName,
              displayName: notice.publisherName,
              email: notice.publisherEmail,
              avatar: notice.publisherAvatar,
            },
          })
        : h("span", { class: "text-muted text-sm" }, "—");
    },
  },
  {
    id: "status",
    enableSorting: false,
    header: () => t("features.notices.column.status"),
    cell: ({ row }) =>
      h(UBadge, {
        color: statusColor(row.original.status),
        label: statusLabel(row.original.status),
        variant: "soft",
      }),
  },
  {
    id: "scopes",
    enableSorting: false,
    header: () => t("features.notices.column.scopes"),
    cell: ({ row }) => {
      const summary = formatScopeSummary(row.original.scopes, t);

      if (!summary) {
        return h("span", { class: "text-muted text-sm" }, "—");
      }

      // 超长截断（限制展示字数）+ Tooltip 完整提示，避免范围摘要撑爆列宽
      const truncated =
        summary.length > SCOPE_SUMMARY_LIMIT
          ? `${summary.slice(0, SCOPE_SUMMARY_LIMIT)}…`
          : summary;

      return h(resolveComponent("UTooltip"), { text: summary }, () =>
        h("span", { class: "block max-w-56 truncate text-sm" }, truncated),
      );
    },
  },
  {
    id: "readers",
    enableSorting: false,
    header: () => t("features.notices.column.readers"),
    cell: ({ row }) => {
      const notice = row.original;
      const readers = notice.readers ?? [];

      // 无已读人员占位；有则头像堆叠（最多 3 个），超出部分 +N（N = readCount - 3）
      if (readers.length === 0) {
        return h("span", { class: "text-muted text-sm" }, "—");
      }
      const shown = readers.slice(0, 3);
      const extra = Math.max(notice.readCount - shown.length, 0);

      return h("div", { class: "flex -space-x-2" }, [
        ...shown.map((reader) =>
          h(resolveComponent("UAvatar"), {
            key: reader.id,
            alt: reader.name,
            src: reader.avatar ?? undefined,
            text: reader.name.slice(0, 1),
            size: "sm",
            class: "ring-2 ring-default",
          }),
        ),
        ...(extra > 0
          ? [
              h(resolveComponent("UAvatar"), {
                size: "sm",
                text: `+${extra}`,
                class: "ring-2 ring-default",
              }),
            ]
          : []),
      ]);
    },
  },
  {
    id: "readRate",
    enableSorting: false,
    header: () => t("features.notices.column.readRate"),
    cell: ({ row }) => {
      const rate = row.original.readRate;

      return rate === null
        ? h("span", { class: "text-muted text-sm" }, "—")
        : h("div", { class: "flex min-w-32 items-center gap-2" }, [
            h(resolveComponent("UProgress"), {
              "aria-label": t("features.notices.column.readRate"),
              modelValue: Math.round(rate),
              size: "sm",
            }),
            h("span", { class: "shrink-0 text-xs" }, `${Math.round(rate)}%`),
          ]);
    },
  },
  {
    id: "publishTime",
    enableSorting: true,
    header: () => t("features.notices.column.publishTime"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-sm" },
        formatDateTime(row.original.publishTime, locale.value),
      ),
  },
  {
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    header: () => t("common.actions"),
    cell: ({ row }) => {
      const notice = row.original;
      const operator = isOperator(notice);
      const items: Array<{
        key: string;
        label: string;
        icon: string;
        color?: "error";
        disabled?: boolean;
        onSelect: () => void;
      }> = [
        {
          key: "detail",
          label: t("features.notices.action.detail"),
          icon: "i-lucide-eye",
          onSelect: () => openDetail(notice),
        },
      ];

      if (canEdit.value && operator && notice.status !== "withdrawn") {
        items.push({
          key: "edit",
          label: t("common.edit"),
          icon: "i-lucide-pencil",
          onSelect: () => openEdit(notice),
        });
      }
      if (canEdit.value && operator && notice.status === "published") {
        items.push({
          key: "withdraw",
          label: t("features.notices.action.withdraw"),
          icon: "i-lucide-undo-2",
          onSelect: () => void handleWithdraw(notice.id),
        });
      }
      if (canDelete.value && operator) {
        items.push({
          key: "delete",
          label: t("common.delete"),
          icon: "i-lucide-trash-2",
          color: "error",
          onSelect: () => openDelete(notice),
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

const columnSettingKey = useColumnSettingKey("/org/notices");

const table: AppTable<Notice> = useVueTable({
  get data() {
    return data.value;
  },
  get columns() {
    return columns.value;
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getRowId: (row: Notice) => row.id,
  // 服务端分页 + 服务端排序：状态由列表 store 驱动（受控），仅取数
  manualPagination: true,
  manualSorting: true,
  // pageCount 必须用 getter 实时求值（写死会导致翻页被 clamp）
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
  t("features.notices.message.deleteDesc", {
    title: deleteTarget.value?.title ?? "",
  }),
);

// formNoticeId 从 null 变为 id 时强制重建弹窗内层（对齐 React key 语义：
// 先看 A 再编辑 B 时清空上一份表单状态）
watch(formNoticeId, () => {
  if (formOpen.value) {
    formOpen.value = false;
    void Promise.resolve().then(() => {
      formOpen.value = true;
    });
  }
});
</script>

<script lang="ts">
export default { name: "NoticesPage" };
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <DataTableToolbar :column-setting-key="columnSettingKey" :table="table">
      <USelectMenu
        :aria-label="t('features.notices.filter.status')"
        :items="statusOptions"
        :model-value="store.filters.status ?? undefined"
        :placeholder="t('features.notices.column.status')"
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
        :aria-label="t('features.notices.search.placeholder')"
        :placeholder="t('features.notices.search.placeholder')"
        class="w-56"
        icon="i-lucide-search"
        @keyup.enter="applySearch"
      />
      <DataTableSearchReset
        :can-reset="
          searchDirty || store.search !== '' || Boolean(store.filters.status)
        "
        :fetching="isFetching"
        @reset="resetFilters"
        @search="applySearch"
      />
      <UButton
        v-if="canAdd"
        :label="t('features.notices.action.add')"
        icon="i-lucide-plus"
        variant="outline"
        @click="openCreate"
      />
    </DataTableToolbar>

    <DataTable
      :is-error="isError"
      :loading="isLoading"
      :refreshing="isFetching && !isLoading"
      :table="table"
      :total="pagination.total"
      @retry="refetch()"
    />

    <NoticeFormDialog
      :key="formNoticeId ?? 'create'"
      v-model:open="formOpen"
      :mode="formMode"
      :notice-id="formNoticeId"
      :tree="deptTree"
      @saved="invalidateList"
    />

    <NoticeDetailDrawer v-model:open="detailOpen" :notice="detailTarget" />

    <ConfirmDialog
      v-model:open="deleteOpen"
      :confirm-keyword="deleteTarget?.title"
      :confirm-text="t('common.delete')"
      :description="deleteDescription"
      :keyword-label="t('features.notices.message.deleteKeyword')"
      :loading="deleteSubmitting"
      :title="t('features.notices.message.deleteTitle')"
      destructive
      @confirm="confirmDelete"
    />
  </div>
</template>

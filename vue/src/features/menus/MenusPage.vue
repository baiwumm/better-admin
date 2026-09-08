<script setup lang="ts">
import type { MenuNode, PermissionItem } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/data-table/table-types";

import { computed, h, ref, resolveComponent } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useToast } from "@nuxt/ui/composables";

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UCheckbox = resolveComponent("UCheckbox");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UIcon = resolveComponent("UIcon");

import {
  deleteMenu,
  fetchManageMenuTree,
  getMenuErrorMessage,
  MENUS_TREE_QUERY_KEY,
} from "./menu-api";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import DataTableSearchReset from "@/components/data-table/DataTableSearchReset.vue";
import DataTableToolbar from "@/components/data-table/DataTableToolbar.vue";
import LoadingContent from "@/components/ui/loading-content/index.vue";
import { MENUS_QUERY_KEY } from "@/composables/use-menus";
import {
  useMenuPermissions,
  usePermissions,
} from "@/composables/use-permissions";
import MenuFormModal from "./MenuFormModal.vue";

/**
 * 菜单管理页（对齐 React 端 menus-page）：管理用全量菜单树的树形表格 + CRUD。
 *
 * - 搜索为后端模糊过滤（label / i18n_key / to，提交式），结果保留祖先链；
 * - 树形展开：TanStack expanded 模型（getSubRows + expandedRowModel，初始全展开）；
 * - 直接使用 UTable 渲染树形表格（不共用 DataTable，避免破坏其他页面）；
 * - 增删改后失效导航树与管理树两份缓存（导航树必须 exact——["menus"] 是
 *   管理树 key 的前缀，非 exact 会把刚失效在途的管理树取消重发）；
 * - 删除有子菜单的节点由后端 409（MENU_HAS_CHILDREN）拦截。
 */

const { t } = useI18n();
const toast = useToast();
const queryClient = useQueryClient();
const { canAdd, canEdit, canAddChild, canDelete } = useMenuPermissions();
const { data: permissionItems } = usePermissions();

// 搜索（提交式后端过滤）：applied 变化 → queryKey 变化 → 重新请求
const searchInput = ref("");
const appliedSearch = ref("");

// staleTime 0：菜单数据要求强一致；keepPreviousData 搜索切换时保留旧数据
const { data, isLoading, isFetching } = useQuery({
  queryKey: computed(() => [...MENUS_TREE_QUERY_KEY, appliedSearch.value]),
  queryFn: () => fetchManageMenuTree(appliedSearch.value),
  placeholderData: (previous) => previous,
  staleTime: 0,
});

/** 保存/删除后统一失效：当前管理树查询（exact）+ 导航树（exact，防双请求） */
function handleSaved() {
  void queryClient.invalidateQueries({
    queryKey: [...MENUS_TREE_QUERY_KEY, appliedSearch.value],
  });
  void queryClient.invalidateQueries({ queryKey: MENUS_QUERY_KEY });
}

function applySearch() {
  appliedSearch.value = searchInput.value.trim();
}

function resetSearch() {
  searchInput.value = "";
  appliedSearch.value = "";
}

const searchDirty = computed(
  () => searchInput.value.trim() !== appliedSearch.value,
);
const canReset = computed(
  () => searchDirty.value || appliedSearch.value !== "",
);

// ---------------- 弹窗状态 ----------------
const formOpen = ref(false);
const formMode = ref<"create" | "addChild" | "edit">("create");
const formNode = ref<MenuNode | null>(null);

const deleteOpen = ref(false);
const deleteTarget = ref<MenuNode | null>(null);
const deleting = ref(false);

function openForm(mode: "create" | "addChild" | "edit", node: MenuNode | null) {
  formMode.value = mode;
  formNode.value = node;
  formOpen.value = true;
}

async function confirmDelete() {
  if (!deleteTarget.value) return;

  deleting.value = true;

  try {
    await deleteMenu(deleteTarget.value.id);
    handleSaved();
    toast.add({
      color: "success",
      title: t("features.menus.message.deleteSuccess"),
    });
    deleteOpen.value = false;
  } catch (error) {
    toast.add({
      color: "error",
      title: getMenuErrorMessage(error),
    });
  } finally {
    deleting.value = false;
  }
}

// ---------------- 权限位解析（列渲染用） ----------------
interface GrantedPermission {
  displayName: string;
  icon: string;
}

function getGrantedPermissions(
  permissions: string,
  items: PermissionItem[],
): GrantedPermission[] {
  let bits: bigint;

  try {
    bits = BigInt(permissions || "0");
  } catch {
    return [];
  }

  if (bits === 0n) return [];

  return (items as PermissionItem[])
    .filter((item) => {
      const itemBits = BigInt(item.bits);

      return itemBits !== 0n && (bits & itemBits) === itemBits;
    })
    .map((item) => {
      const key = `features.permissions.items.${item.value}`;
      const name = t(key);

      return { displayName: name === key ? item.label : name, icon: item.icon };
    });
}

// ---------------- 树形表格（expanded 模型，初始全展开） ----------------
const columns = computed<AppColumnDef<MenuNode>[]>(() => [
  {
    id: "label",
    enableSorting: false,
    header: () => t("features.menus.column.name"),
    cell: ({ row }) => {
      const node = row.original as MenuNode;

      return h(
        "span",
        {
          class: "flex items-center gap-2",
          style: { paddingInlineStart: `${row.depth * 12}px` },
        },
        [
          row.getCanExpand()
            ? h(UButton, {
                "aria-label": t("features.menus.tree.toggle"),
                class: "shrink-0",
                color: "neutral",
                icon: row.getIsExpanded()
                  ? "i-lucide-chevron-down"
                  : "i-lucide-chevron-right",
                size: "xs",
                variant: "ghost",
                onClick: (event: MouseEvent) =>
                  (row.getToggleExpandedHandler() as (e: MouseEvent) => void)(
                    event,
                  ),
              })
            : h("span", { class: "inline-block size-6 shrink-0" }),
          h(UIcon, {
            "aria-hidden": true,
            class: "text-muted size-4 shrink-0",
            name: `i-lucide-${node.icon || "circle"}`,
          }),
          h("span", { class: "font-medium" }, node.label),
        ],
      );
    },
  },
  {
    id: "route",
    enableSorting: false,
    header: () => t("features.menus.column.route"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "text-muted text-sm" },
        (row.original as MenuNode).to ?? "—",
      ),
  },
  {
    id: "permissions",
    enableSorting: false,
    header: () => t("features.menus.column.permissions"),
    cell: ({ row }) => {
      const node = row.original as MenuNode;
      const granted = getGrantedPermissions(
        node.permissions,
        permissionItems.value ?? [],
      );

      if (granted.length === 0) {
        return h("span", { class: "text-muted text-sm" }, "—");
      }

      const visible = granted.slice(0, 2);
      const extraCount = granted.length - visible.length;

      return h(
        "div",
        { class: "flex flex-wrap items-center justify-center gap-1" },
        [
          ...visible.map((perm) =>
            h(UBadge, {
              color: "neutral",
              icon: perm.icon ? `i-lucide-${perm.icon}` : undefined,
              label: perm.displayName,
              variant: "soft",
            }),
          ),
          extraCount > 0
            ? h(UBadge, {
                color: "neutral",
                label: `+${extraCount}`,
                variant: "soft",
              })
            : null,
        ],
      );
    },
  },
  ...(
    [
      ["keepAlive", "features.menus.form.keepAlive", "keepAlive"],
      ["hideInMenu", "features.menus.form.hideInMenu", "hideInMenu"],
      ["enabled", "features.menus.form.enabled", "enabled"],
      ["defaultOpen", "features.menus.form.defaultOpen", "defaultOpen"],
    ] as const
  ).map(([id, labelKey, field]) => ({
    id,
    enableSorting: false,
    header: () => t(labelKey),
    cell: ({ row }: { row: { original: MenuNode } }) =>
      h(UCheckbox, {
        disabled: true,
        "model-value": Boolean((row.original as MenuNode)[field]),
      }),
  })),
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
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    header: () => t("common.actions"),
    cell: ({ row }) => {
      const node = row.original as MenuNode;
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
          onSelect: () => openForm("edit", node),
        });
      }
      if (canAddChild.value) {
        items.push({
          key: "addChild",
          label: t("features.menus.action.addChild"),
          icon: "i-lucide-plus",
          onSelect: () => openForm("addChild", node),
        });
      }
      if (canDelete.value) {
        items.push({
          key: "delete",
          label: t("common.delete"),
          icon: "i-lucide-trash-2",
          color: "error",
          onSelect: () => {
            deleteTarget.value = node;
            deleteOpen.value = true;
          },
        });
      }

      if (items.length === 0) return null;

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

/** 树形子行提取函数（透传给 UTable） */
function menuSubRows(row: MenuNode): MenuNode[] | undefined {
  return row.children;
}
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <DataTableToolbar>
      <UInput
        v-model="searchInput"
        :aria-label="t('features.menus.searchPlaceholder')"
        :placeholder="t('features.menus.searchPlaceholder')"
        class="w-64"
        icon="i-lucide-search"
        @keyup.enter="applySearch"
      />
      <DataTableSearchReset
        :can-reset="canReset"
        :fetching="isFetching"
        @reset="resetSearch"
        @search="applySearch"
      />
      <UButton
        v-if="canAdd"
        :label="t('features.menus.action.add')"
        icon="i-lucide-plus"
        variant="outline"
        @click="openForm('create', null)"
      />
    </DataTableToolbar>

    <div class="relative">
      <LoadingContent v-if="isFetching || isLoading" />
      <UTable
        sticky
        :loading="isFetching || isLoading"
        :data="data ?? []"
        :columns="columns"
        :get-sub-rows="menuSubRows"
        :get-row-id="(row) => row.id"
        :ui="{
          thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
          tr: 'group',
          td: 'group-has-[td:not(:empty)]:border-b border-default text-start',
        }"
      >
        <template #empty>
          <div class="flex items-center justify-center w-full">
            <UEmpty
              icon="i-lucide-inbox"
              :title="t('common.datatable.empty')"
              class="ring-0"
            />
          </div>
        </template>
      </UTable>
    </div>

    <MenuFormModal
      v-model:open="formOpen"
      :mode="formMode"
      :node="formNode"
      :permission-items="permissionItems ?? []"
      :tree="data ?? []"
      @saved="handleSaved"
    />

    <ConfirmDialog
      v-model:open="deleteOpen"
      :confirm-keyword="deleteTarget?.label"
      :confirm-text="t('common.delete')"
      :description="
        t('features.menus.message.deleteDesc', {
          label: deleteTarget?.label ?? '',
        })
      "
      :keyword-label="t('features.menus.message.deleteKeyword')"
      :loading="deleting"
      :title="t('features.menus.message.deleteTitle')"
      destructive
      @confirm="confirmDelete"
    />
  </div>
</template>

<style scoped>
/*
 * 树形表格：子行通过 getSubRows + expanded 自动展开为独立行，
 * UTable 仍会为每个展开的父行渲染一个空的 expanded <tr>（单个 td[colspan]），
 * 通过 CSS 隐藏该空行（仅影响本页，不破坏其他使用 DataTable 的页面）。
 */
:deep(table tbody tr:has(> td[colspan]:only-child)) {
  display: none;
}
</style>

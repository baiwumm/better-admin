<script setup lang="ts">
import type { MenuNode, PermissionItem } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/data-table/table-types";

import { computed, h, reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useTable } from "@tanstack/vue-table";
import { useToast } from "@nuxt/ui/composables";
import UBadge from "@nuxt/ui/runtime/components/Badge.vue";
import UIcon from "@nuxt/ui/runtime/components/Icon.vue";
import UButton from "@nuxt/ui/runtime/components/Button.vue";
import UDropdownMenu from "@nuxt/ui/runtime/components/DropdownMenu.vue";
import UCheckbox from "@nuxt/ui/runtime/components/Checkbox.vue";

import {
  addChildMenu,
  createMenu,
  deleteMenu,
  fetchManageMenuTree,
  getMenuErrorMessage,
  MENUS_TREE_QUERY_KEY,
  updateMenu,
  type MenuSaveInput,
} from "./menu-api";
import {
  collectSelfAndDescendantIds,
  flattenParentOptions,
} from "@/lib/menu-tree-utils";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import DataTable from "@/components/data-table/DataTable.vue";
import DataTableSearchReset from "@/components/data-table/DataTableSearchReset.vue";
import DataTableToolbar from "@/components/data-table/DataTableToolbar.vue";
import {
  appTableFeatures,
  type AppTable,
} from "@/components/data-table/table-types";
import { MENUS_QUERY_KEY } from "@/composables/use-menus";
import {
  useMenuPermissions,
  usePermissions,
} from "@/composables/use-permissions";

/**
 * 菜单管理页（对齐 React 端 menus-page）：管理用全量菜单树的树形表格 + CRUD。
 *
 * - 搜索为后端模糊过滤（label / i18n_key / to，提交式），结果保留祖先链；
 * - 树形展开：TanStack expanded 模型（getSubRows + expandedRowModel，初始全展开）；
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
      duration: 5000,
      title: t("features.menus.message.deleteSuccess"),
    });
    deleteOpen.value = false;
  } catch (error) {
    toast.add({
      color: "error",
      duration: 5000,
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
          variant: "subtle",
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

      if (canEdit) {
        items.push({
          key: "edit",
          label: t("common.edit"),
          icon: "i-lucide-pencil",
          onSelect: () => openForm("edit", node),
        });
      }
      if (canAddChild) {
        items.push({
          key: "addChild",
          label: t("features.menus.action.addChild"),
          icon: "i-lucide-plus",
          onSelect: () => openForm("addChild", node),
        });
      }
      if (canDelete) {
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

      return h(UDropdownMenu, { items: [items], content: { align: "center" } });
    },
  },
]);

const table: AppTable<MenuNode> = useTable({
  get data() {
    return data.value ?? [];
  },
  columns: columns.value,
  features: appTableFeatures,
  // 树形：subRows = children，初始全部展开
  getSubRows: (row: MenuNode) => row.children,
  initialState: { expanded: true },
  manualPagination: true,
  manualSorting: true,
});

// ---------------- 表单弹窗（内联于本页； addChild 锁父级 / edit 防环） ----------------
const FORM_ID = "menu-form";
const EMPTY_ICON = "circle";
const I18N_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;

const form = reactive({
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
const formErrors = reactive({
  label: "",
  i18nKey: "",
  icon: "",
  to: "",
});
const submitting = ref(false);

watch(formOpen, (open) => {
  if (!open) return;

  const mode = formMode.value;
  const node = formNode.value;
  const addChild = mode === "addChild";

  form.parentId = addChild ? (node?.id ?? "") : (node?.parentId ?? "");
  form.label = addChild ? "" : (node?.label ?? "");
  form.i18nKey = addChild ? "" : (node?.i18nKey ?? "");
  form.icon = addChild ? "" : (node?.icon ?? "");
  form.to = addChild ? "" : (node?.to ?? "");
  form.sort = addChild ? 0 : (node?.sort ?? 0);
  form.keepAlive = addChild ? false : (node?.keepAlive ?? false);
  form.hideInMenu = addChild ? false : (node?.hideInMenu ?? false);
  form.enabled = addChild ? true : (node?.enabled ?? true);
  form.defaultOpen = addChild ? false : (node?.defaultOpen ?? false);

  try {
    permBits.value = BigInt(node?.permissions ?? "0");
  } catch {
    permBits.value = 0n;
  }

  formErrors.label = "";
  formErrors.i18nKey = "";
  formErrors.icon = "";
  formErrors.to = "";
});

const isFormEdit = computed(() => formMode.value === "edit");

// 编辑态的父级候选：排除自身及后代（防成环）； addChild 锁定不可改
const parentItems = computed(() => {
  const excluded =
    isFormEdit.value && formNode.value
      ? collectSelfAndDescendantIds(formNode.value)
      : new Set<string>();

  return flattenParentOptions(data.value ?? [])
    .filter((option) => !excluded.has(option.id))
    .map((option) => ({
      label: `${"\u00A0".repeat(option.depth * 4)}${option.label}`,
      value: option.id,
    }));
});

// 权限位多选：由 permBits 推导选中项
const permissionSelectItems = computed(() =>
  (permissionItems.value ?? []).map((item) => ({
    label: t(`features.permissions.items.${item.value}`),
    value: item.value,
  })),
);

const selectedPermissionValues = computed(() =>
  (permissionItems.value ?? [])
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

  for (const item of permissionItems.value ?? []) {
    if (selected.has(item.value)) next |= BigInt(item.bits);
  }
  permBits.value = next;
}

function validateForm(): boolean {
  formErrors.label =
    form.label.trim().length >= 1 && form.label.trim().length <= 50
      ? ""
      : t("features.menus.form.labelInvalid");
  formErrors.i18nKey =
    form.i18nKey.trim() === "" || I18N_KEY_PATTERN.test(form.i18nKey.trim())
      ? ""
      : t("features.menus.form.i18nKeyFormat");
  formErrors.icon = form.icon.trim()
    ? ""
    : t("features.menus.form.iconRequired");
  formErrors.to =
    form.to.trim() === "" ||
    form.to.trim().startsWith("/") ||
    form.to.trim().startsWith("https://")
      ? ""
      : t("features.menus.form.routeFormat");

  return !Object.values(formErrors).some(Boolean);
}

function closeForm() {
  formOpen.value = false;
}

async function submitForm() {
  if (!validateForm()) return;

  submitting.value = true;

  const payload: MenuSaveInput = {
    label: form.label.trim(),
    i18nKey: form.i18nKey.trim() || null,
    icon: form.icon.trim() || EMPTY_ICON,
    to: form.to.trim() || null,
    parentId: form.parentId || null,
    sort: form.sort,
    keepAlive: form.keepAlive,
    hideInMenu: form.hideInMenu,
    enabled: form.enabled,
    defaultOpen: form.defaultOpen,
    permissions: permBits.value.toString(),
  };

  try {
    if (isFormEdit.value && formNode.value) {
      await updateMenu(formNode.value.id, payload);
    } else if (formMode.value === "addChild" && formNode.value) {
      await addChildMenu(formNode.value.id, payload);
    } else {
      await createMenu(payload);
    }

    toast.add({
      color: "success",
      duration: 5000,
      title: t(
        isFormEdit.value
          ? "features.menus.message.updateSuccess"
          : "features.menus.message.createSuccess",
      ),
    });
    handleSaved();
    closeForm();
  } catch (error) {
    toast.add({
      color: "error",
      duration: 5000,
      title: getMenuErrorMessage(error),
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="flex w-full flex-col pb-8">
    <DataTableToolbar>
      <UInput
        v-model="searchInput"
        :aria-label="t('features.menus.searchPlaceholder')"
        :placeholder="t('features.menus.searchPlaceholder')"
        class="w-64"
        icon="i-lucide-search"
        size="sm"
        @keyup.enter="applySearch"
      />
      <DataTableSearchReset
        :can-reset="canReset"
        :fetching="isFetching"
        :search-dirty="searchDirty"
        @reset="resetSearch"
        @search="applySearch"
      />
      <template #actions>
        <UButton
          v-if="canAdd"
          :label="t('features.menus.action.add')"
          icon="i-lucide-plus"
          size="sm"
          variant="outline"
          @click="openForm('create', null)"
        />
      </template>
    </DataTableToolbar>

    <div class="relative">
      <div
        v-if="isLoading"
        class="bg-default/60 absolute inset-0 z-10 grid place-items-center"
      >
        <UIcon
          class="size-6 animate-spin text-muted"
          name="i-lucide-loader-circle"
        />
      </div>
      <DataTable
        :loading="isFetching && !isLoading"
        :min-width="'860px'"
        :table="table"
      />
    </div>

    <UModal
      :open="formOpen"
      :dismissible="false"
      :ui="{ content: 'sm:max-w-xl' }"
      @update:open="(value: boolean) => !value && closeForm()"
    >
      <template #content>
        <form
          :id="FORM_ID"
          class="flex flex-col gap-4 p-6"
          @submit.prevent="submitForm"
        >
          <h2 class="text-lg font-semibold">
            {{
              t(
                formMode === "edit"
                  ? "features.menus.form.title.edit"
                  : formMode === "addChild"
                    ? "features.menus.form.title.addChild"
                    : "features.menus.form.title.create",
              )
            }}
          </h2>

          <UFormField
            :label="t('features.menus.form.parent')"
            :description="t('features.menus.form.parentHint')"
          >
            <div class="flex items-center gap-2">
              <USelect
                v-model="form.parentId"
                :aria-label="t('features.menus.form.parent')"
                :disabled="formMode === 'addChild'"
                :items="parentItems"
                :placeholder="t('features.menus.form.parentPlaceholder')"
                class="flex-1"
                value-key="value"
              />
              <UButton
                v-if="form.parentId && formMode !== 'addChild'"
                :aria-label="t('features.menus.form.parentClear')"
                color="neutral"
                icon="i-lucide-x"
                size="sm"
                variant="ghost"
                @click="form.parentId = ''"
              />
            </div>
          </UFormField>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UFormField
              :label="t('features.menus.form.label')"
              :error="formErrors.label || undefined"
              required
            >
              <UInput
                v-model="form.label"
                :maxlength="50"
                :placeholder="t('features.menus.form.labelPlaceholder')"
                class="w-full"
                variant="soft"
              />
            </UFormField>

            <UFormField
              :label="t('features.menus.form.i18nKey')"
              :error="formErrors.i18nKey || undefined"
              required
            >
              <UInput
                v-model="form.i18nKey"
                class="w-full"
                placeholder="menu.xxx.yyy"
                variant="soft"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UFormField
              :label="t('features.menus.form.icon')"
              :error="formErrors.icon || undefined"
              required
            >
              <div class="flex items-center gap-2">
                <UInput
                  v-model="form.icon"
                  aria-label="Icon"
                  class="flex-1"
                  placeholder="house"
                  variant="soft"
                />
                <UIcon
                  v-if="form.icon"
                  :name="`i-lucide-${form.icon}`"
                  class="text-muted size-4"
                />
              </div>
            </UFormField>

            <UFormField
              :label="t('features.menus.form.route')"
              :error="formErrors.to || undefined"
              :description="
                formErrors.to ? undefined : t('features.menus.form.routeHint')
              "
            >
              <UInput
                v-model="form.to"
                :placeholder="t('features.menus.form.routePlaceholder')"
                class="w-full"
                variant="soft"
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
            <UInput
              v-model.number="form.sort"
              class="w-full"
              type="number"
              variant="soft"
            />
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
              class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
            >
              <span class="text-sm font-medium">{{ switchRow.label }}</span>
              <USwitch v-model="form[switchRow.key as 'keepAlive']" />
            </div>
          </div>

          <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <UButton
              :label="t('common.cancel')"
              color="neutral"
              variant="outline"
              type="button"
              @click="closeForm"
            />
            <UButton
              :form="FORM_ID"
              :label="
                submitting
                  ? t('features.menus.form.saving')
                  : t('common.confirm')
              "
              :loading="submitting"
              type="submit"
            />
          </div>
        </form>
      </template>
    </UModal>

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
      :title="t('features.menus.message.deleteTitle')"
      destructive
      @confirm="confirmDelete"
    />
  </div>
</template>

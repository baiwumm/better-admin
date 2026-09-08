<script setup lang="ts">
import type { MenuNode, PermissionItem } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/data-table/table-types";
import type { FormSubmitEvent } from "@nuxt/ui";

import * as z from "zod";
import {
  computed,
  h,
  reactive,
  ref,
  resolveComponent,
  useTemplateRef,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import { useVueTable } from "@tanstack/vue-table";
import {
  getCoreRowModel,
  getExpandedRowModel,
  getSortedRowModel,
} from "@tanstack/vue-table";
import { useToast } from "@nuxt/ui/composables";

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UCheckbox = resolveComponent("UCheckbox");
const UDropdownMenu = resolveComponent("UDropdownMenu");
const UIcon = resolveComponent("UIcon");

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
import { type AppTable } from "@/components/data-table/table-types";
import LoadingContent from "@/components/ui/loading-content/index.vue";
import Spinner from "@/components/ui/spinner/index.vue";
import { MENUS_QUERY_KEY } from "@/composables/use-menus";
import {
  useMenuPermissions,
  usePermissions,
} from "@/composables/use-permissions";
import { I18N_KEY_PATTERN } from "@/lib/constants";

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

      if (canEdit.value) {
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

      return h(UDropdownMenu, { items: [items], content: { align: "center" } });
    },
  },
]);

const table: AppTable<MenuNode> = useVueTable({
  get data() {
    return data.value ?? [];
  },
  get columns() {
    return columns.value;
  },
  getCoreRowModel: getCoreRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  getSortedRowModel: getSortedRowModel(),
  // 树形：subRows = children，初始全部展开
  getSubRows: (row: MenuNode) => row.children,
  initialState: { expanded: true },
  manualPagination: true,
  manualSorting: true,
});

// ---------------- 表单弹窗（内联于本页； addChild 锁父级 / edit 防环） ----------------
const FORM_ID = "menu-form";
const EMPTY_ICON = "circle";

// 校验消息用函数延迟求值：语言切换后错误文案跟随当前 locale
const schema = z.object({
  parentId: z.string(),
  label: z
    .string()
    .trim()
    .min(1, { error: () => t("features.menus.form.labelInvalid") })
    .max(50, { error: () => t("features.menus.form.labelInvalid") }),
  i18nKey: z
    .string()
    .trim()
    .refine((value) => value === "" || I18N_KEY_PATTERN.test(value), {
      error: () => t("features.menus.form.i18nKeyFormat"),
    }),
  icon: z
    .string()
    .trim()
    .min(1, { error: () => t("features.menus.form.iconRequired") }),
  to: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || value.startsWith("/") || value.startsWith("https://"),
      { error: () => t("features.menus.form.routeFormat") },
    ),
  sort: z.number(),
  keepAlive: z.boolean(),
  hideInMenu: z.boolean(),
  enabled: z.boolean(),
  defaultOpen: z.boolean(),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
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
const formRef = useTemplateRef("formRef");
const submitting = ref(false);

watch(formOpen, (open) => {
  if (!open) return;

  const mode = formMode.value;
  const node = formNode.value;
  const addChild = mode === "addChild";

  state.parentId = addChild ? (node?.id ?? "") : (node?.parentId ?? "");
  state.label = addChild ? "" : (node?.label ?? "");
  state.i18nKey = addChild ? "" : (node?.i18nKey ?? "");
  state.icon = addChild ? "" : (node?.icon ?? "");
  state.to = addChild ? "" : (node?.to ?? "");
  state.sort = addChild ? 0 : (node?.sort ?? 0);
  state.keepAlive = addChild ? false : (node?.keepAlive ?? false);
  state.hideInMenu = addChild ? false : (node?.hideInMenu ?? false);
  state.enabled = addChild ? true : (node?.enabled ?? true);
  state.defaultOpen = addChild ? false : (node?.defaultOpen ?? false);

  try {
    permBits.value = BigInt(node?.permissions ?? "0");
  } catch {
    permBits.value = 0n;
  }

  formRef.value?.clear();
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

function closeForm() {
  formOpen.value = false;
}

async function submitForm(event: FormSubmitEvent<Schema>) {
  submitting.value = true;

  // toast.promise 形态（对齐 React 端）：保存全程 loading toast，
  // 完成后原位替换为成功/失败；duration 0 保证请求返回前不消失
  //（update 会重置计时回落全局时长）；icon 用 Spinner 组件（toast
  // 内容支持 VNode），自带旋转动画
  const savingToast = toast.add({
    title: t("features.menus.form.saving"),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  const payload: MenuSaveInput = {
    label: event.data.label,
    i18nKey: event.data.i18nKey || null,
    icon: event.data.icon || EMPTY_ICON,
    to: event.data.to || null,
    parentId: event.data.parentId || null,
    sort: event.data.sort,
    keepAlive: event.data.keepAlive,
    hideInMenu: event.data.hideInMenu,
    enabled: event.data.enabled,
    defaultOpen: event.data.defaultOpen,
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

    toast.update(savingToast.id, {
      title: t(
        isFormEdit.value
          ? "features.menus.message.updateSuccess"
          : "features.menus.message.createSuccess",
      ),
      icon: "i-lucide-check",
      color: "success",
    });
    handleSaved();
    closeForm();
  } catch (error) {
    toast.update(savingToast.id, {
      title: getMenuErrorMessage(error),
      icon: "i-lucide-x",
      color: "error",
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="flex w-full flex-col">
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
      <LoadingContent v-if="isLoading" />
      <DataTable :loading="isFetching && !isLoading" :table="table" />
    </div>

    <UModal
      :open="formOpen"
      :dismissible="false"
      :title="
        t(
          formMode === 'edit'
            ? 'features.menus.form.title.edit'
            : formMode === 'addChild'
              ? 'features.menus.form.title.addChild'
              : 'features.menus.form.title.create',
        )
      "
      :ui="{ content: 'sm:max-w-xl', footer: 'justify-end' }"
      @update:open="(value: boolean) => !value && closeForm()"
    >
      <template #body>
        <UForm
          :id="FORM_ID"
          ref="formRef"
          :schema="schema"
          :state="state"
          class="flex flex-col gap-4"
          @submit="submitForm"
        >
          <UFormField
            :label="t('features.menus.form.parent')"
            :description="t('features.menus.form.parentHint')"
          >
            <div class="flex items-center gap-2">
              <USelect
                v-model="state.parentId"
                :aria-label="t('features.menus.form.parent')"
                :disabled="formMode === 'addChild'"
                :items="parentItems"
                :placeholder="t('features.menus.form.parentPlaceholder')"
                class="flex-1"
                value-key="value"
              />
              <UButton
                v-if="state.parentId && formMode !== 'addChild'"
                :aria-label="t('features.menus.form.parentClear')"
                color="neutral"
                icon="i-lucide-x"
                size="sm"
                variant="ghost"
                @click="state.parentId = ''"
              />
            </div>
          </UFormField>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UFormField
              :label="t('features.menus.form.label')"
              name="label"
              required
            >
              <UInput
                v-model="state.label"
                :maxlength="50"
                :placeholder="t('features.menus.form.labelPlaceholder')"
                class="w-full"
                variant="soft"
              />
            </UFormField>

            <UFormField
              :label="t('features.menus.form.i18nKey')"
              name="i18nKey"
              required
            >
              <UInput
                v-model="state.i18nKey"
                class="w-full"
                placeholder="menu.xxx.yyy"
                variant="soft"
              />
            </UFormField>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <UFormField
              :label="t('features.menus.form.icon')"
              name="icon"
              required
            >
              <div class="flex items-center gap-2">
                <UInput
                  v-model="state.icon"
                  aria-label="Icon"
                  class="flex-1"
                  placeholder="house"
                  variant="soft"
                />
                <UIcon
                  v-if="state.icon"
                  :name="`i-lucide-${state.icon}`"
                  class="text-muted size-4"
                />
              </div>
            </UFormField>

            <UFormField
              :help="t('features.menus.form.routeHint')"
              :label="t('features.menus.form.route')"
              name="to"
            >
              <UInput
                v-model="state.to"
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
              v-model.number="state.sort"
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
              <USwitch
                v-model="state[switchRow.key as 'keepAlive']"
                unchecked-icon="i-lucide-x"
                checked-icon="i-lucide-check"
              />
            </div>
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
            submitting ? t('features.menus.form.saving') : t('common.confirm')
          "
          :loading="submitting"
          type="submit"
        />
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
      :loading="deleting"
      :title="t('features.menus.message.deleteTitle')"
      destructive
      @confirm="confirmDelete"
    />
  </div>
</template>

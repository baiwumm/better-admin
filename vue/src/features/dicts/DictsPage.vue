<script setup lang="ts">
import type { DictItem, DictType } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/data-table/table-types";

import { computed, h, ref, resolveComponent } from "vue";
import { useI18n } from "vue-i18n";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { useVueTable } from "@tanstack/vue-table";
import { getCoreRowModel } from "@tanstack/vue-table";
import { useToast } from "@nuxt/ui/composables";

const UBadge = resolveComponent("UBadge");
const UButton = resolveComponent("UButton");
const UDropdownMenu = resolveComponent("UDropdownMenu");

import {
  DICT_TYPES_QUERY_KEY,
  deleteDictItem,
  deleteDictType,
  dictItemsQueryKey,
  fetchDictItems,
  fetchDictTypes,
  getDictErrorMessage,
} from "./dict-api";
import DictItemFormDialog from "./DictItemFormDialog.vue";
import DictTypeFormDialog from "./DictTypeFormDialog.vue";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import DataTable from "@/components/data-table/DataTable.vue";
import DataTableSearchReset from "@/components/data-table/DataTableSearchReset.vue";
import DataTableToolbar from "@/components/data-table/DataTableToolbar.vue";
import { type AppTable } from "@/components/data-table/table-types";
import { useMenuPermissions } from "@/composables/use-permissions";
import { useDictStore } from "@/stores/dict-store";

/**
 * 字典管理页（对齐 React 端 dicts-page）：双栏布局——左栏字典类型，
 * 右栏选中类型的字典项。
 *
 * - 契约 v1.4 无分页：类型/项均全量拉取 + 前端提交式关键字过滤（量级小）；
 * - 选中类型为派生态（selectedCode 失效自动回退首个，删除后无需手动清理）；
 * - 字典项保存后联动刷新 dict-store（业务页下拉实时更新，复用本次请求结果）；
 * - 删除被引用的类型由后端 409（DICT_TYPE_IN_USE）拦截，toast 透出。
 */

const { t } = useI18n();
const toast = useToast();
const queryClient = useQueryClient();
const dictStore = useDictStore();
const { canAdd, canEdit, canDelete } = useMenuPermissions();

// ---------------- 字典类型（左栏） ----------------
const typesQuery = useQuery({
  queryKey: DICT_TYPES_QUERY_KEY,
  queryFn: fetchDictTypes,
  staleTime: 0,
});
const types = computed(() => typesQuery.data.value ?? []);

// 选中类型：派生态——selectedCode 不在列表中（被删/未选）时回退首个
const selectedCode = ref<string | null>(null);
const activeType = computed(
  () =>
    types.value.find((type) => type.code === selectedCode.value) ??
    types.value[0] ??
    null,
);

// 左栏过滤（提交式本地过滤：code / 名称 / 描述）
const typeSearchInput = ref("");
const typeSearch = ref("");
const filteredTypes = computed(() => {
  const normalized = typeSearch.value.trim().toLowerCase();

  if (!normalized) return types.value;

  return types.value.filter((type) =>
    [type.code, type.name, type.description ?? ""].some((text) =>
      text.toLowerCase().includes(normalized),
    ),
  );
});

function applyTypeSearch() {
  typeSearch.value = typeSearchInput.value.trim();
}

// ---------------- 字典项（右栏） ----------------
const itemsQuery = useQuery({
  queryKey: computed(() => dictItemsQueryKey(activeType.value?.code ?? "")),
  queryFn: () => fetchDictItems(activeType.value!.code),
  enabled: computed(() => Boolean(activeType.value)),
  placeholderData: keepPreviousData,
  staleTime: 0,
});
const items = computed(() => itemsQuery.data.value ?? []);

// 右栏过滤（提交式本地过滤：value / label / i18nKey）
const itemSearchInput = ref("");
const itemSearch = ref("");
const filteredItems = computed(() => {
  const normalized = itemSearch.value.trim().toLowerCase();

  if (!normalized) return items.value;

  return items.value.filter((item) =>
    [item.value, item.label, item.i18nKey ?? ""].some((text) =>
      text.toLowerCase().includes(normalized),
    ),
  );
});

function applyItemSearch() {
  itemSearch.value = itemSearchInput.value.trim();
}

function resetItemSearch() {
  itemSearchInput.value = "";
  itemSearch.value = "";
}

const itemSearchDirty = computed(
  () => itemSearchInput.value.trim() !== itemSearch.value,
);
const canResetItems = computed(
  () => itemSearchDirty.value || itemSearch.value !== "",
);

// ---------------- 缓存失效 ----------------
/** 刷新右栏列表并用本次请求结果回填业务侧字典缓存（单次请求） */
async function refreshItemsAndSync(code: string) {
  await queryClient.invalidateQueries({
    queryKey: dictItemsQueryKey(code),
  });
  const fresh = queryClient.getQueryData<DictItem[]>(dictItemsQueryKey(code));

  if (fresh) dictStore.setDict(code, fresh);
}

function handleItemSaved() {
  if (activeType.value) void refreshItemsAndSync(activeType.value.code);
}

/** 类型保存后：等类型列表刷新完成再切选中（创建场景，右栏 items 只发一次请求） */
async function handleTypeSaved(saved: DictType, mode: "create" | "edit") {
  await queryClient.invalidateQueries({ queryKey: DICT_TYPES_QUERY_KEY });

  if (mode === "create") selectedCode.value = saved.code;
}

// ---------------- 弹窗状态 ----------------
const typeFormOpen = ref(false);
const typeFormMode = ref<"create" | "edit">("create");
const typeFormType = ref<DictType | null>(null);

const itemFormOpen = ref(false);
const itemFormMode = ref<"create" | "edit">("create");
const itemFormItem = ref<DictItem | null>(null);

const typeDeleteOpen = ref(false);
const deleteTypeTarget = ref<DictType | null>(null);
const typeDeleteSubmitting = ref(false);

const itemDeleteOpen = ref(false);
const deleteItemTarget = ref<DictItem | null>(null);
const itemDeleteSubmitting = ref(false);

function openTypeForm(mode: "create" | "edit", type: DictType | null) {
  typeFormMode.value = mode;
  typeFormType.value = type;
  typeFormOpen.value = true;
}

function openItemForm(mode: "create" | "edit", item: DictItem | null) {
  itemFormMode.value = mode;
  itemFormItem.value = item;
  itemFormOpen.value = true;
}

/**
 * 删除类型：失败 toast 透出。成功后清业务侧缓存并失效类型列表，
 * 不 removeQueries——激活中的 items 观察者被移除缓存后会立即重发请求
 * （对已删类型返回 404）；选中态经派生自动回退首个。
 */
async function confirmDeleteType() {
  if (!deleteTypeTarget.value) return;

  typeDeleteSubmitting.value = true;

  try {
    await deleteDictType(deleteTypeTarget.value.code);
  } catch (error) {
    toast.add({
      color: "error",
      title: getDictErrorMessage(error),
    });

    return;
  } finally {
    typeDeleteSubmitting.value = false;
  }

  dictStore.clearDict(deleteTypeTarget.value.code);
  await queryClient.invalidateQueries({ queryKey: DICT_TYPES_QUERY_KEY });
  typeDeleteOpen.value = false;
  toast.add({
    color: "success",
    title: t("features.dicts.message.typeDeleted"),
  });
}

async function confirmDeleteItem() {
  if (!deleteItemTarget.value) return;

  itemDeleteSubmitting.value = true;

  try {
    await deleteDictItem(deleteItemTarget.value.id);
  } catch (error) {
    toast.add({
      color: "error",
      title: getDictErrorMessage(error),
    });

    return;
  } finally {
    itemDeleteSubmitting.value = false;
  }

  if (activeType.value) await refreshItemsAndSync(activeType.value.code);
  itemDeleteOpen.value = false;
  toast.add({
    color: "success",
    title: t("features.dicts.message.itemDeleted"),
  });
}

// ---------------- 右栏表格列定义 ----------------
const columns = computed<AppColumnDef<DictItem>[]>(() => [
  {
    id: "label",
    enableSorting: false,
    header: () => t("features.dicts.column.label"),
    cell: ({ row }) =>
      h("div", { class: "flex flex-col" }, [
        h("span", { class: "text-sm font-medium" }, row.original.label),
        row.original.i18nKey
          ? h("span", { class: "text-muted text-xs" }, row.original.i18nKey)
          : null,
      ]),
  },
  {
    id: "value",
    enableSorting: false,
    header: () => t("features.dicts.column.value"),
    cell: ({ row }) =>
      h("span", { class: "font-mono text-sm" }, row.original.value),
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
          variant: "subtle",
        }),
      ),
  },
  {
    id: "enabled",
    enableSorting: false,
    header: () => t("features.dicts.column.enabled"),
    cell: ({ row }) =>
      h(
        "span",
        { class: "flex justify-center" },
        h(UBadge, {
          color: row.original.enabled ? "success" : "error",
          label: t(
            row.original.enabled
              ? "features.dicts.enabled.yes"
              : "features.dicts.enabled.no",
          ),
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
          onSelect: () => openItemForm("edit", row.original),
        });
      }
      if (canDelete.value) {
        items.push({
          key: "delete",
          label: t("common.delete"),
          icon: "i-lucide-trash-2",
          color: "error",
          onSelect: () => {
            deleteItemTarget.value = row.original;
            itemDeleteOpen.value = true;
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

const table: AppTable<DictItem> = useVueTable({
  get data() {
    return filteredItems.value;
  },
  get columns() {
    return columns.value;
  },
  getCoreRowModel: getCoreRowModel(),
  getRowId: (row: DictItem) => row.id,
  // 全量展示：关闭自动分页切片（本页不渲染分页条）
  manualPagination: true,
});
</script>

<template>
  <div class="flex w-full flex-col pb-8">
    <div
      class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]"
    >
      <!-- 左栏：字典类型 -->
      <div class="rounded-xl border p-4">
        <div class="mb-3 flex items-center justify-between gap-2">
          <span class="text-sm font-medium">
            {{ t("features.dicts.type.title") }}
            <span class="text-muted ms-1">({{ types.length }})</span>
          </span>
          <UButton
            v-if="canAdd"
            :aria-label="t('features.dicts.type.add')"
            icon="i-lucide-plus"
            size="sm"
            variant="outline"
            @click="openTypeForm('create', null)"
          />
        </div>

        <UInput
          v-model="typeSearchInput"
          :aria-label="t('features.dicts.type.searchPlaceholder')"
          :placeholder="t('features.dicts.type.searchPlaceholder')"
          class="mb-3 w-full"
          icon="i-lucide-search"
          size="sm"
          @keyup.enter="applyTypeSearch"
        />

        <div v-if="typesQuery.isLoading.value" class="flex flex-col gap-1">
          <div
            v-for="index in 5"
            :key="index"
            class="flex flex-col gap-1.5 rounded-lg px-3 py-2"
          >
            <USkeleton class="h-3.5 w-3/5 rounded-md" />
            <USkeleton class="h-3 w-2/5 rounded-md" />
          </div>
        </div>

        <p v-else-if="filteredTypes.length === 0" class="text-muted text-xs">
          {{
            t(
              typeSearch
                ? "features.dicts.type.noMatch"
                : "features.dicts.type.empty",
            )
          }}
        </p>

        <div v-else class="flex flex-col gap-1">
          <div
            v-for="type in filteredTypes"
            :key="type.code"
            :class="
              type.code === activeType?.code
                ? 'bg-elevated/60'
                : 'hover:bg-elevated/30'
            "
            class="group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 transition-colors"
            role="button"
            tabindex="0"
            @click="selectedCode = type.code"
            @keydown.enter.prevent="selectedCode = type.code"
            @keydown.space.prevent="selectedCode = type.code"
          >
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium">{{ type.name }}</div>
              <div class="text-muted truncate text-xs">{{ type.code }}</div>
            </div>
            <div
              class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
            >
              <UButton
                v-if="canEdit"
                :aria-label="t('common.edit')"
                color="neutral"
                icon="i-lucide-pencil"
                size="xs"
                variant="ghost"
                @click.stop="openTypeForm('edit', type)"
              />
              <UButton
                v-if="canDelete"
                :aria-label="t('common.delete')"
                color="error"
                icon="i-lucide-trash-2"
                size="xs"
                variant="ghost"
                @click.stop="
                  deleteTypeTarget = type;
                  typeDeleteOpen = true;
                "
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 右栏：选中类型的字典项 -->
      <div class="flex min-w-0 flex-col">
        <DataTableToolbar>
          <UInput
            v-model="itemSearchInput"
            :aria-label="t('features.dicts.item.searchPlaceholder')"
            :placeholder="t('features.dicts.item.searchPlaceholder')"
            class="w-64"
            icon="i-lucide-search"
            size="sm"
            @keyup.enter="applyItemSearch"
          />
          <DataTableSearchReset
            :can-reset="canResetItems"
            :fetching="itemsQuery.isFetching.value"
            :search-dirty="itemSearchDirty"
            @reset="resetItemSearch"
            @search="applyItemSearch"
          />
          <template #actions>
            <UButton
              v-if="canAdd"
              :disabled="!activeType"
              :label="t('features.dicts.item.add')"
              icon="i-lucide-plus"
              size="sm"
              variant="outline"
              @click="openItemForm('create', null)"
            />
          </template>
        </DataTableToolbar>

        <div
          v-if="!activeType"
          class="text-muted flex flex-col items-center justify-center gap-2 rounded-md border py-20"
        >
          <UIcon class="size-10" name="i-lucide-inbox" />
          <span class="text-sm">
            {{ t("features.dicts.item.noSelection") }}
          </span>
        </div>
        <DataTable
          v-else
          :loading="itemsQuery.isLoading.value || itemsQuery.isFetching.value"
          :min-width="'640px'"
          :table="table"
        />
      </div>
    </div>

    <!-- 弹窗集合 -->
    <DictTypeFormDialog
      v-model:open="typeFormOpen"
      :mode="typeFormMode"
      :type="typeFormType"
      @saved="handleTypeSaved"
    />

    <DictItemFormDialog
      v-model:open="itemFormOpen"
      :item="itemFormItem"
      :mode="itemFormMode"
      :type-code="activeType?.code ?? ''"
      @saved="handleItemSaved"
    />

    <ConfirmDialog
      v-model:open="typeDeleteOpen"
      :confirm-keyword="deleteTypeTarget?.code"
      :confirm-text="t('common.delete')"
      :description="
        t('features.dicts.message.deleteTypeDesc', {
          code: deleteTypeTarget?.code ?? '',
        })
      "
      :keyword-label="t('features.dicts.message.deleteTypeKeyword')"
      :loading="typeDeleteSubmitting"
      :title="t('features.dicts.message.deleteTypeTitle')"
      destructive
      @confirm="confirmDeleteType"
    />

    <ConfirmDialog
      v-model:open="itemDeleteOpen"
      :confirm-text="t('common.delete')"
      :description="
        t('features.dicts.message.deleteItemDesc', {
          label: deleteItemTarget?.label ?? '',
        })
      "
      :loading="itemDeleteSubmitting"
      :title="t('features.dicts.message.deleteItemTitle')"
      destructive
      @confirm="confirmDeleteItem"
    />
  </div>
</template>

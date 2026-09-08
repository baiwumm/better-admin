<script setup lang="ts">
import type { DeptSortItem, DeptTreeNode } from "@/lib/api-types";
import type { AppColumnDef } from "@/components/data-table/table-types";
import Spinner from "@/components/ui/spinner/index.vue";
import { computed, h, ref, resolveComponent } from "vue";
import { useI18n } from "vue-i18n";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { keepPreviousData } from "@tanstack/vue-query";
import { useToast } from "@nuxt/ui/composables";
import { useVueTable } from "@tanstack/vue-table";
import { getCoreRowModel } from "@tanstack/vue-table";

import {
  DEPTS_TREE_QUERY_KEY,
  deleteDept,
  fetchDeptTree,
  getDeptErrorMessage,
  sortDepts,
} from "./dept-api";
import DeptFormDialog from "./DeptFormDialog.vue";
import DeptTreePanel from "./DeptTreePanel.vue";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import DataTable from "@/components/data-table/DataTable.vue";
import { type AppTable } from "@/components/data-table/table-types";
import { useMenuPermissions } from "@/composables/use-permissions";

/**
 * 组织管理页（契约 v1.6.0 阶段 1，对应 React 端 depts-page.tsx）：左树右表布局。
 *
 * - 数据源统一为全量树查询（GET /org/depts/tree）：左栏树、右栏选中组织
 *   详情与子组织列表均由树派生，避免树 + 分页双请求的瀑布；
 * - 同级拖拽整组重编号后提交 PATCH /org/depts/sort，成功失败都失效树缓存
 *   （失败时同样回拉服务端真实状态，避免本地残留拖拽后的视觉顺序）；
 * - 删除由后端三级校验 409 拦截（HAS_CHILDREN / HAS_POSTS / HAS_ACTIVE_USERS），
 *   前端关键词确认弹窗 + toast 透出。
 */

const UButton = resolveComponent("UButton");
const UBadge = resolveComponent("UBadge");
const UDropdownMenu = resolveComponent("UDropdownMenu");

const { t } = useI18n();
const queryClient = useQueryClient();
const toast = useToast();
const { canAdd, canEdit, canDelete } = useMenuPermissions();

// 全量树（含停用组织，左栏置灰）；staleTime 0 保证强一致
const treeQuery = useQuery({
  queryKey: DEPTS_TREE_QUERY_KEY,
  queryFn: fetchDeptTree,
  placeholderData: keepPreviousData,
  staleTime: 0,
});
const tree = computed(() => treeQuery.data.value ?? []);

// 选中组织：派生态——selectedId 不在树中（被删/未选）时回退顶级首个
const selectedId = ref<string | null>(null);
const selectedNode = computed<DeptTreeNode | null>(() => {
  const find = (nodes: DeptTreeNode[]): DeptTreeNode | null => {
    for (const node of nodes) {
      if (node.id === selectedId.value) return node;

      const found = find(node.children);

      if (found) return found;
    }

    return null;
  };

  return find(tree.value) ?? tree.value[0] ?? null;
});

function invalidateTree() {
  void queryClient.invalidateQueries({ queryKey: DEPTS_TREE_QUERY_KEY });
}

// ---------------- 同级拖拽排序 ----------------

const reorderMutation = useMutation({
  mutationFn: sortDepts,
  // 成功失败都失效树：失败时同样回拉服务端真实状态，避免本地残留拖拽后的视觉顺序
  onSettled: () => invalidateTree(),
});

function handleReorder(items: DeptSortItem[]) {
  // toast.promise 形态（对齐 React 端）：先显示 loading，API 完成后
  // 通过 toast.update 原位替换为成功/失败；duration 0 保证排序接口
  // 返回前 loading 不被全局时长提前移除（update 后回落全局时长）；
  // icon 用 Spinner 组件（toast 内容支持 VNode），自带旋转动画
  const loadingToast = toast.add({
    title: t("features.depts.message.sorting"),
    icon: h(Spinner, { size: "sm", class: "mt-0.5" }),
    color: "info",
    duration: 0,
  });

  reorderMutation.mutate(items, {
    onSuccess: () => {
      toast.update(loadingToast.id, {
        title: t("features.depts.message.sorted"),
        icon: "i-lucide-check",
        color: "success",
      });
    },
    onError: (error) => {
      toast.update(loadingToast.id, {
        title: getDeptErrorMessage(error),
        icon: "i-lucide-x",
        color: "error",
      });
    },
  });
}

// ---------------- 弹窗状态 ----------------

interface FormContext {
  mode: "create" | "edit";
  dept: DeptTreeNode | null;
  /** create：预设父级（新增子组织）；create-root 为 null */
  parentNode: DeptTreeNode | null;
}

const formOpen = ref(false);
const formMode = ref<FormContext["mode"]>("create");
const formDept = ref<DeptTreeNode | null>(null);
const formParentNode = ref<DeptTreeNode | null>(null);

const deleteOpen = ref(false);
const deleteTarget = ref<DeptTreeNode | null>(null);
const deleteSubmitting = ref(false);

function openCreateRoot() {
  formMode.value = "create";
  formDept.value = null;
  formParentNode.value = null;
  formOpen.value = true;
}

function openCreateChild(parent: DeptTreeNode) {
  formMode.value = "create";
  formDept.value = null;
  formParentNode.value = parent;
  formOpen.value = true;
}

function openEdit(node: DeptTreeNode) {
  formMode.value = "edit";
  // 树节点含全部表单回显字段（标量子集），直接传节点
  formDept.value = node;
  formParentNode.value = null;
  formOpen.value = true;
}

function openDelete(node: DeptTreeNode) {
  deleteTarget.value = node;
  deleteOpen.value = true;
}

const deleteMutation = useMutation({
  mutationFn: (id: string) => deleteDept(id),
});

async function handleDeleteConfirm() {
  if (!deleteTarget.value) return;

  deleteSubmitting.value = true;

  try {
    await deleteMutation.mutateAsync(deleteTarget.value.id);
    invalidateTree();
    deleteOpen.value = false;

    toast.add({
      color: "success",
      title: t("features.depts.message.deleted"),
    });
  } catch (error) {
    toast.add({
      color: "error",
      title: getDeptErrorMessage(error),
    });
  } finally {
    deleteSubmitting.value = false;
  }
}

// ---------------- 子组织表格列（数据源：选中节点的 children） ----------------

const childNodes = computed(() => selectedNode.value?.children ?? []);

const columns = computed<AppColumnDef<DeptTreeNode>[]>(() => [
  {
    id: "name",
    enableSorting: false,
    header: () => t("features.depts.column.name"),
    cell: ({ row }) =>
      h("span", { class: "text-sm font-medium" }, row.original.name),
  },
  {
    id: "code",
    enableSorting: false,
    header: () => t("features.depts.column.code"),
    cell: ({ row }) =>
      h("span", { class: "text-sm font-mono" }, row.original.code ?? "—"),
  },
  {
    id: "leaderName",
    enableSorting: false,
    header: () => t("features.depts.column.leader"),
    cell: ({ row }) =>
      h("span", { class: "text-sm" }, row.original.leaderName ?? "—"),
  },
  {
    id: "childCount",
    enableSorting: false,
    header: () => t("features.depts.column.childCount"),
    cell: ({ row }) =>
      h(UBadge, { color: "neutral", variant: "soft" }, () =>
        String(row.original.children.length),
      ),
  },
  {
    id: "status",
    enableSorting: false,
    header: () => t("features.depts.column.status"),
    cell: ({ row }) =>
      h(
        UBadge,
        {
          color: row.original.status === "enabled" ? "success" : "error",
          variant: "soft",
        },
        () =>
          t(
            row.original.status === "enabled"
              ? "features.depts.status.enabled"
              : "features.depts.status.disabled",
          ),
      ),
  },
  {
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    header: () => t("common.actions"),
    cell: ({ row }) => {
      if (!canAdd.value && !canEdit.value && !canDelete.value) return null;

      const items: Array<{
        key: string;
        label: string;
        icon: string;
        color?: "error";
        onSelect: () => void;
      }> = [];

      if (canAdd.value) {
        items.push({
          key: "add",
          label: t("features.depts.action.add"),
          icon: "i-lucide-plus",
          onSelect: () => openCreateChild(row.original),
        });
      }
      if (canEdit.value) {
        items.push({
          key: "edit",
          label: t("common.edit"),
          icon: "i-lucide-pencil",
          onSelect: () => openEdit(row.original),
        });
      }
      if (canDelete.value) {
        items.push({
          key: "delete",
          label: t("common.delete"),
          icon: "i-lucide-trash-2",
          color: "error",
          onSelect: () => openDelete(row.original),
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

const table: AppTable<DeptTreeNode> = useVueTable({
  get data() {
    return childNodes.value;
  },
  get columns() {
    return columns.value;
  },
  getCoreRowModel: getCoreRowModel(),
  getRowId: (row: DeptTreeNode) => row.id,
  // 全量展示：子组织列表随树派生，不渲染分页条
  manualPagination: true,
});

const deleteDescription = computed(() =>
  t("features.depts.message.deleteDesc", {
    name: deleteTarget.value?.name ?? "",
  }),
);
</script>

<template>
  <div
    class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]"
  >
    <!-- 左栏：组织树面板（与人员通讯录共用） -->
    <DeptTreePanel
      :can-reorder="canEdit && !reorderMutation.isPending.value"
      :is-fetching="treeQuery.isFetching.value"
      :is-loading="treeQuery.isLoading.value"
      :is-pending="reorderMutation.isPending.value"
      :nodes="tree"
      :selected-id="selectedNode?.id ?? null"
      :empty-title="t('features.depts.tree.empty')"
      @reorder="handleReorder"
      @select="(node) => (selectedId = node.id)"
    >
      <template v-if="canAdd" #header-action>
        <UButton
          :aria-label="t('features.depts.action.addRoot')"
          class="p-1"
          color="neutral"
          icon="i-lucide-plus"
          size="sm"
          variant="outline"
          @click="openCreateRoot"
        />
      </template>
      <template v-if="canAdd" #empty-action>
        <UButton
          color="neutral"
          icon="i-lucide-plus"
          size="sm"
          variant="outline"
          @click="openCreateRoot"
        >
          {{ t("features.depts.action.addRoot") }}
        </UButton>
      </template>
    </DeptTreePanel>

    <!-- 右栏：选中组织详情 + 子组织列表 -->
    <div class="flex min-w-0 flex-col gap-4">
      <UCard class="flex flex-col gap-3" variant="outline">
        <template v-if="selectedNode">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-2">
              <span class="truncate text-sm font-semibold">
                {{ selectedNode.name }}
              </span>
              <UBadge
                :color="selectedNode.status === 'enabled' ? 'success' : 'error'"
                variant="soft"
              >
                {{
                  t(
                    selectedNode.status === "enabled"
                      ? "features.depts.status.enabled"
                      : "features.depts.status.disabled",
                  )
                }}
              </UBadge>
            </div>
            <!-- 允许换行：窄屏/长名称时按钮折行右对齐，不挤压左侧标题区 -->
            <div class="flex flex-wrap items-center justify-end gap-2">
              <UButton
                v-if="canAdd"
                size="sm"
                @click="openCreateChild(selectedNode)"
              >
                <UIcon class="size-4" name="i-lucide-plus" />
                {{ t("features.depts.action.add") }}
              </UButton>
              <UButton
                v-if="canEdit"
                color="neutral"
                size="sm"
                variant="subtle"
                @click="openEdit(selectedNode)"
              >
                <UIcon class="size-4" name="i-lucide-pencil" />
                {{ t("common.edit") }}
              </UButton>
              <UButton
                v-if="canDelete"
                color="error"
                size="sm"
                variant="subtle"
                @click="openDelete(selectedNode)"
              >
                <UIcon class="size-4" name="i-lucide-trash-2" />
                {{ t("common.delete") }}
              </UButton>
            </div>
          </div>
          <div class="text-muted flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              {{ t("features.depts.column.code") }}：
              <span class="font-mono">{{ selectedNode.code ?? "—" }}</span>
            </span>
            <span>
              {{ t("features.depts.column.leader") }}：
              {{ selectedNode.leaderName ?? "—" }}
            </span>
            <span>
              {{
                t("features.depts.detail.childCount", {
                  count: selectedNode.children.length,
                })
              }}
            </span>
          </div>
        </template>
        <div
          v-else
          class="text-muted flex flex-col items-center justify-center gap-2 py-10"
        >
          <p class="text-sm">{{ t("features.depts.detail.unselected") }}</p>
        </div>
      </UCard>

      <!-- 子组织列表（与详情卡留出呼吸间距，页面底部有 pb-8） -->
      <div class="flex min-w-0 flex-col">
        <DataTable :loading="treeQuery.isLoading.value" :table="table" />
      </div>
    </div>
  </div>

  <!-- 弹窗集合 -->
  <DeptFormDialog
    v-model:open="formOpen"
    :dept="formDept"
    :mode="formMode"
    :parent-node="formParentNode"
    :tree="tree"
    @saved="invalidateTree"
  />

  <ConfirmDialog
    v-model:open="deleteOpen"
    :confirm-keyword="deleteTarget?.name"
    :confirm-text="t('common.delete')"
    :description="deleteDescription"
    :keyword-label="t('features.depts.message.deleteKeyword')"
    :loading="deleteSubmitting"
    :title="t('features.depts.message.deleteTitle')"
    destructive
    @confirm="handleDeleteConfirm"
  />
</template>

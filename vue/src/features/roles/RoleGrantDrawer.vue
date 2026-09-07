<script setup lang="ts">
import { computed, provide, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useQueryClient } from "@tanstack/vue-query";
import { useToast } from "@nuxt/ui/composables";

import GrantTreeNode from "./GrantTreeNode.vue";
import { getRoleErrorMessage, updateRoleMenus } from "./role-api";
import { useGrantTree } from "./use-grant-tree";

import ErrorContent from "@/components/common/ErrorContent.vue";
import type { MenuNode } from "@/lib/api-types";

/**
 * 角色授权抽屉（勾选模型与级联语义见 use-grant-tree.ts；树渲染在
 * GrantTreeNode 递归组件）。保存 = PUT 全量替换 role_menus（载荷只含
 * 选中节点及其位）；保存后页面统一失效导航菜单缓存（侧边栏立即生效）。
 */
const props = defineProps<{
  open: boolean;
  /** 授权目标角色（null = 关闭态；code 用于系统内置角色保护） */
  role: { id: string; name: string; code: string } | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  /** 保存成功（页面统一失效导航菜单缓存并提示） */
  saved: [];
}>();

const { t } = useI18n();
const toast = useToast();
const queryClient = useQueryClient();

const roleId = computed(() => props.role?.id ?? "");
const roleName = computed(() => props.role?.name ?? "");

const grantTree = useGrantTree(
  () => roleId.value,
  () => props.role?.code ?? "",
);

provide("grantTree", grantTree);

// 打开时重置本地覆盖层与展开状态
watch(
  () => props.open,
  (open) => {
    if (open) grantTree.resetOverrides();
  },
);

const saving = ref(false);

function close() {
  emit("update:open", false);
}

async function onSave() {
  if (!props.role) return;

  saving.value = true;

  try {
    // 选中节点全量收集（含半选：部分位勾选的叶子也是「可见」记录）
    const menus: Array<{ menuId: string; permissions: string }> = [];

    const walk = (nodes: MenuNode[]) => {
      for (const node of nodes) {
        if (grantTree.isNodeSelected(node)) {
          menus.push({
            menuId: node.id,
            permissions: grantTree.getBits(node.id),
          });
        }
        walk(node.children ?? []);
      }
    };

    walk(grantTree.menuTree.value);

    await updateRoleMenus(props.role.id, menus);

    // 授权已变：失效角色授权缓存 + 导航菜单缓存（当前用户自己的角色立即生效）
    void queryClient.invalidateQueries({
      queryKey: ["roles", props.role.id, "menus"],
    });
    emit("saved");
    toast.add({
      color: "success",
      title: t("features.roles.grant.saveSuccess"),
    });
    close();
  } catch (error) {
    toast.add({
      color: "error",
      title: getRoleErrorMessage(error),
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <USlideover
    :open="open"
    :ui="{ content: 'w-152 max-w-[85vw]' }"
    @update:open="(value: boolean) => !value && close()"
  >
    <template #title>
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <UIcon class="size-5 text-muted" name="i-lucide-key-round" />
          <span class="text-base font-semibold">
            {{ t("features.roles.grant.title", { name: roleName }) }}
          </span>
        </div>
        <p class="text-muted text-xs">
          {{
            t("features.roles.grant.hint", {
              selected: grantTree.selectedCount.value,
              total: grantTree.totalNodes.value,
            })
          }}
        </p>
      </div>
    </template>

    <template #body>
      <div class="flex flex-col gap-3">
        <UAlert
          v-if="grantTree.isProtected.value"
          color="warning"
          icon="i-lucide-triangle-alert"
          :description="t('features.roles.grant.protected')"
          :title="t('features.roles.grant.protectedTitle')"
        />

        <div v-if="grantTree.loading.value" class="flex flex-col gap-2 py-1">
          <div
            v-for="(indent, index) in [0, 1, 1, 2, 2, 2, 1, 2]"
            :key="index"
            class="flex items-center gap-2.5 py-1"
            :style="{ paddingInlineStart: `${indent * 20}px` }"
          >
            <USkeleton class="size-4 rounded-md" />
            <USkeleton
              class="h-3.5 rounded-md"
              :style="{ width: `${88 - indent * 12}px` }"
            />
          </div>
        </div>

        <ErrorContent
          v-else-if="grantTree.loadError.value"
          :retry-label="t('common.retry')"
          :title="t('features.roles.grant.loadError')"
          @retry="grantTree.refetch()"
        />

        <p
          v-else-if="grantTree.menuTree.value.length === 0"
          class="text-muted py-8 text-center text-sm"
        >
          {{ t("features.roles.grant.noMenus") }}
        </p>

        <div v-else class="flex flex-col">
          <GrantTreeNode
            v-for="node in grantTree.menuTree.value"
            :key="node.id"
            :depth="0"
            :node="node"
          />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <UButton
            :disabled="
              grantTree.loading.value || grantTree.menuTree.value.length === 0
            "
            :label="t('features.roles.grant.collapseAll')"
            color="neutral"
            size="sm"
            variant="soft"
            @click="grantTree.setAllExpanded(false)"
          />
          <UButton
            :disabled="
              grantTree.loading.value || grantTree.menuTree.value.length === 0
            "
            :label="t('features.roles.grant.expandAll')"
            color="neutral"
            size="sm"
            variant="soft"
            @click="grantTree.setAllExpanded(true)"
          />
        </div>
        <div class="flex items-center gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            @click="close"
          />
          <UButton
            :disabled="grantTree.loading.value || grantTree.isProtected.value"
            :label="
              saving
                ? t('features.roles.grant.saving')
                : t('features.roles.grant.save')
            "
            :loading="saving"
            @click="onSave"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>

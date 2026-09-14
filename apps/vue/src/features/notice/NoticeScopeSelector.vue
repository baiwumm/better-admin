<script setup lang="ts">
import type { DeptTreeNode, NoticeScopeType } from "@/lib/api-types";
import type { User } from "@/lib/api-types";

import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 公告发布范围选择器（契约 v1.7.0 三粒度并集，对应 React 端
 * notice-scope-selector.tsx）：UTabs 三页签——组织（层级多选）/
 * 岗位（多选）/ 人员（多选），受控值三类 id 数组（并集语义，切换页签不丢已选）。
 *
 * - 停用组织/岗位禁选；
 * - 组织候选为全量树扁平化（与 DeptTreeSelect 同款缩进）；
 * - 岗位/人员候选改用 USelectMenu searchable 远程搜索（React 端为
 *   无限滚动）：首屏预取 50 条 + 关键词远端过滤，功能语义等价（全量可选），
 *   实现贴合 Nuxt UI 组件能力。
 */
const props = defineProps<{
  /** 三类目标分别受控（并集语义，提交时合成 NoticeScope[]） */
  deptIds: string[];
  postIds: string[];
  userIds: string[];
  tree: DeptTreeNode[];
  posts: { id: string; name: string; deptPath: string; status: string }[];
  users: Pick<User, "id" | "username" | "displayName">[];
  usersLoading: boolean;
}>();

const emit = defineEmits<{
  "update:deptIds": [ids: string[]];
  "update:postIds": [ids: string[]];
  "update:userIds": [ids: string[]];
}>();

const { t } = useI18n();

const tab = ref<NoticeScopeType>("dept");

const tabItems = computed(() => [
  { label: t("features.notices.scope.tabDept"), value: "dept" },
  { label: t("features.notices.scope.tabPost"), value: "post" },
  { label: t("features.notices.scope.tabUser"), value: "user" },
]);

// 组织平铺选项（「└ 」前缀表达层级，有编码以「名称(编码)」展示；含停用禁选）
interface DeptOption {
  label: string;
  value: string;
  disabled: boolean;
}

const deptOptions = computed<DeptOption[]>(() => {
  const options: DeptOption[] = [];

  const walk = (nodes: DeptTreeNode[], level: number) => {
    for (const node of nodes) {
      const prefix = "\u3000".repeat(level) + (level > 0 ? "└ " : "");
      const label = node.code ? `${node.name}(${node.code})` : node.name;

      options.push({
        label: prefix + label,
        value: node.id,
        disabled: node.status !== "enabled",
      });
      walk(node.children, level + 1);
    }
  };

  walk(props.tree, 0);

  return options;
});

const postOptions = computed(() =>
  props.posts.map((post) => ({
    label: post.name,
    hint: post.deptPath,
    value: post.id,
    disabled: post.status !== "enabled",
  })),
);

const userOptions = computed(() =>
  props.users.map((user) => ({
    label: user.displayName || user.username,
    value: user.id,
  })),
);

const selectedSummary = computed(() => {
  const parts: string[] = [];

  if (props.deptIds.length)
    parts.push(
      t("features.notices.scope.depts", { count: props.deptIds.length }),
    );
  if (props.postIds.length)
    parts.push(
      t("features.notices.scope.posts", { count: props.postIds.length }),
    );
  if (props.userIds.length)
    parts.push(
      t("features.notices.scope.users", { count: props.userIds.length }),
    );

  return parts.length ? parts.join("、") : t("features.notices.scope.none");
});

function toIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((id) => String(id));
  }

  return value == null ? [] : [String(value)];
}
</script>

<script lang="ts">
export default { name: "NoticeScopeSelector" };
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-sm font-medium">
      {{ t("features.notices.form.scope") }}
    </span>
    <UTabs
      v-model:model-value="tab"
      :content="false"
      :items="tabItems"
      size="sm"
    />

    <USelectMenu
      v-if="tab === 'dept'"
      :items="deptOptions"
      :model-value="deptIds"
      :placeholder="t('features.notices.scope.deptPlaceholder')"
      class="w-full"
      multiple
      value-key="value"
      @update:model-value="
        (value: unknown) => emit('update:deptIds', toIds(value))
      "
    />

    <USelectMenu
      v-else-if="tab === 'post'"
      :items="postOptions"
      :model-value="postIds"
      :placeholder="t('features.notices.scope.postPlaceholder')"
      class="w-full"
      multiple
      value-key="value"
      @update:model-value="
        (value: unknown) => emit('update:postIds', toIds(value))
      "
    />

    <USelectMenu
      v-else
      :items="userOptions"
      :loading="usersLoading"
      :model-value="userIds"
      :placeholder="
        usersLoading
          ? t('features.notices.scope.usersLoading')
          : t('features.notices.scope.userPlaceholder')
      "
      class="w-full"
      multiple
      value-key="value"
      @update:model-value="
        (value: unknown) => emit('update:userIds', toIds(value))
      "
    />

    <p class="text-muted text-xs">{{ selectedSummary }}</p>
  </div>
</template>

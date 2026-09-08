<script setup lang="ts">
import type { DeptTreeNode } from "@/lib/api-types";

import { computed, defineAsyncComponent, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useQuery } from "@tanstack/vue-query";
import { keepPreviousData } from "@tanstack/vue-query";

import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "./dept-api";
import { CHART_ROOT_ID } from "./org-chart-layout";

// 图谱重组件懒加载（vue-flow + CSS 仅在进入本页时拉取）
const OrgChart = defineAsyncComponent(() => import("./OrgChart.vue"));

/**
 * 组织架构图谱页（对应 React 端 org-chart-page.tsx）：vue-flow 只读可视化。
 *
 * - 数据源复用 GET /org/depts/tree（与组织管理 / 通讯录共享缓存），无新契约；
 * - 顶部为图谱虚拟根节点「Better Admin」（品牌入口，非真实组织，点击不跳转），
 *   其下挂全量组织森林；画布撑满主体区域（h-full 链路）；
 * - 图谱组件随页面懒加载（@vue-flow/core 不进主包）；
 * - 节点点击跳转通讯录统一 URL Query（/org/directory?deptId=xxx，
 *   支持刷新 / 分享 / 前进后退，四端一致的跳转规范）；
 * - 交互边界见 OrgChart.vue：只读，平移 / 缩放 / Fit View / 折叠展开。
 */
const { t } = useI18n();
const router = useRouter();

// 组织树（与组织管理 / 通讯录共享 queryKey 缓存）
const treeQuery = useQuery({
  queryKey: DEPTS_TREE_QUERY_KEY,
  queryFn: fetchDeptTree,
  placeholderData: keepPreviousData,
  staleTime: 0,
});
const tree = computed<DeptTreeNode[]>(() => treeQuery.data.value ?? []);

/** 顶部虚拟根节点（Better Admin）：非真实组织，仅作为图谱品牌入口 */
const chartTree = computed<DeptTreeNode[]>(() => {
  if (tree.value.length === 0) {
    return [];
  }

  return [
    {
      id: CHART_ROOT_ID,
      parentId: null,
      name: "Better Admin",
      code: null,
      leaderId: null,
      leaderName: null,
      leaderAvatar: null,
      sort: 0,
      status: "enabled",
      children: tree.value,
    },
  ];
});

/** 收起节点集合（空集 = 全展开；折叠仅影响图谱视图，不改动组织数据） */
const collapsed = ref<Set<string>>(new Set());

function toggleCollapse(id: string) {
  const next = new Set(collapsed.value);

  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }

  collapsed.value = next;
}

/** 节点点击 → 通讯录按组织筛选（URL Query 规范）；虚拟根节点不跳转 */
function handleNodeClick(deptId: string) {
  if (deptId === CHART_ROOT_ID) {
    return;
  }
  void router.push({ path: "/org/directory", query: { deptId } });
}
</script>

<script lang="ts">
export default { name: "OrgChartPage" };
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="bg-default min-h-120 flex-1 overflow-hidden rounded-xl border">
      <!-- 加载骨架：与图谱节点卡片同形 -->
      <div
        v-if="treeQuery.isLoading.value"
        aria-hidden
        class="flex h-full flex-col items-center justify-center gap-3 p-6"
      >
        <USkeleton class="h-28 w-60 rounded-xl" />
        <div class="flex gap-8">
          <USkeleton class="h-28 w-60 rounded-xl" />
          <USkeleton class="h-28 w-60 rounded-xl" />
        </div>
        <div class="flex gap-8">
          <USkeleton class="h-28 w-60 rounded-xl" />
          <USkeleton class="h-28 w-60 rounded-xl" />
          <USkeleton class="h-28 w-60 rounded-xl" />
        </div>
      </div>

      <div
        v-else-if="tree.length === 0"
        class="text-muted flex h-full flex-col items-center justify-center gap-2"
      >
        <p class="text-sm">{{ t("features.chart.empty") }}</p>
      </div>

      <div v-else class="h-full w-full">
        <OrgChart
          :collapsed="collapsed"
          :tree="chartTree"
          @node-click="handleNodeClick"
          @toggle="toggleCollapse"
        />
      </div>
    </div>
  </div>
</template>

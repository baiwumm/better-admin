<script setup lang="ts">
import type { DeptTreeNode } from '@/lib/api-types'

import { computed, defineAsyncComponent, ref, watch } from 'vue'
import { useQuery, keepPreviousData } from '@tanstack/vue-query'

import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from './dept-api'

// 图谱重组件懒加载（vue-flow + CSS 仅在进入本页时拉取）
const OrgChart = defineAsyncComponent(() => import('./OrgChart.vue'))

/**
 * 组织架构图谱页（对应 React 端 org-chart-page.tsx）：vue-flow 只读可视化。
 *
 * - 数据源复用 GET /org/depts/tree（与组织管理 / 通讯录共享缓存），无新契约；
 * - 不设图谱虚拟根节点，顶级组织直接作为根层；默认仅展开前两级，
 *   更深层级收起（点击节点底部折叠钮展开）；
 * - 图谱组件随页面懒加载（@vue-flow/core 不进主包）；
 * - 节点点击跳转通讯录统一 URL Query（/org/directory?deptId=xxx，
 *   支持刷新 / 分享 / 前进后退，四端一致的跳转规范）；
 * - 交互边界见 OrgChart.vue：只读，平移 / 缩放 / Fit View / 折叠展开。
 */
const { t } = useI18n()
const router = useRouter()

// 组织树（与组织管理 / 通讯录共享 queryKey 缓存）
const treeQuery = useQuery({
  queryKey: DEPTS_TREE_QUERY_KEY,
  queryFn: fetchDeptTree,
  placeholderData: keepPreviousData,
  staleTime: 0
})
const tree = computed<DeptTreeNode[]>(() => treeQuery.data.value ?? [])

/** 收起节点集合（折叠仅影响图谱视图，不改动组织数据） */
const collapsed = ref<Set<string>>(new Set())

/** 默认折叠集合：仅展示前两级——深度 ≥ 1 的节点统一视为收起（下级默认隐藏） */
function collectDefaultCollapsed(
  nodes: DeptTreeNode[],
  depth = 0,
  acc: Set<string> = new Set()
): Set<string> {
  for (const node of nodes) {
    if (depth >= 1) {
      acc.add(node.id)
    }
    collectDefaultCollapsed(node.children, depth + 1, acc)
  }

  return acc
}

// 树首次到达后按「仅展开前两级」初始化折叠集合，此后树刷新不重置用户操作
let collapsedInitialized = false

watch(
  tree,
  (value) => {
    if (collapsedInitialized || value.length === 0) {
      return
    }
    collapsedInitialized = true
    collapsed.value = collectDefaultCollapsed(value)
  },
  { immediate: true }
)

function toggleCollapse(id: string) {
  const next = new Set(collapsed.value)

  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }

  collapsed.value = next
}

/** 节点点击 → 通讯录按组织筛选（URL Query 规范） */
function handleNodeClick(deptId: string) {
  void router.push({ path: '/org/directory', query: { deptId } })
}
</script>

<script lang="ts">
export default { name: 'OrgChartPage' }
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <div class="min-h-120 flex-1 overflow-hidden">
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
        <p class="text-sm">
          {{ t("features.chart.empty") }}
        </p>
      </div>

      <div
        v-else
        class="h-full w-full"
      >
        <OrgChart
          :collapsed="collapsed"
          :tree="tree"
          @node-click="handleNodeClick"
          @toggle="toggleCollapse"
        />
      </div>
    </div>
  </div>
</template>

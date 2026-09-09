<script setup lang="ts">
import type { DeptTreeNode } from "@/lib/api-types";
import type { Edge, Node } from "@vue-flow/core";

import { VueFlow, useVueFlow } from "@vue-flow/core";
import { Background, BackgroundVariant } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { computed, useTemplateRef } from "vue";
import { useColorMode } from "@vueuse/core";
import { useI18n } from "vue-i18n";

import OrgChartNode from "./OrgChartNode.vue";
import { CHART_ROOT_ID, layoutDeptForest } from "./org-chart-layout";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/controls/dist/style.css";

/**
 * 组织架构图谱（vue-flow 只读封装，对应 React 端 org-chart.tsx，随图谱页懒加载）。
 *
 * 交互边界（阶段 4 选型评审定稿，勿放宽为流程编辑器）：
 * - 允许：画布平移 / 缩放 / Fit View（Controls）/ 点击节点 / 折叠展开组织节点；
 * - 禁用：节点拖拽、连线创建与编辑、双击缩放（误触）。
 * - Minimap 未加入（演示规模几十~百级节点，按实际规模再评估）。
 *
 * 布局为手写紧凑树算法（org-chart-layout，未引入 d3-hierarchy）；
 * 展开 / 收起后基于可见子树整体重排，视口不自动缩放（保持用户视角）。
 * 暗色适配：vue-flow 的样式跟随容器 .dark 类，以应用内 useColorMode 的
 * resolved 值驱动（与 <html> 类一致），而非 OS 偏好。
 */
const props = defineProps<{
  /** 全量组织树（GET /org/depts/tree，含顶部虚拟根节点） */
  tree: DeptTreeNode[];
  /** 收起节点 id 集合（空集 = 全展开） */
  collapsed: Set<string>;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  /** 节点点击（携带组织 id，页面负责跳转通讯录） */
  nodeClick: [deptId: string];
}>();

const { t } = useI18n();
const colorMode = useColorMode();
const wrapperRef = useTemplateRef<HTMLElement>("wrapperRef");
const { fitView } = useVueFlow();

/**
 * 初始居中：vue-flow 内置 fitViewOnInit 在首批节点测量后就执行（bounds 不完整，
 * 且无 options prop 可传），实测画布偏右上、根节点被截断。改为监听
 * nodes-initialized（全部节点完成测量，等价 React Flow 的 fitView 时机）后
 * 以与 React 端一致的选项 fitView；只执行一次，展开 / 收起后不自动缩放
 * （保持用户视角，对齐 React 端交互边界）。
 */
let didInitialFit = false;

function handleNodesInitialized() {
  if (didInitialFit) {
    return;
  }
  didInitialFit = true;
  void fitView({ maxZoom: 1, padding: 0.15 });
}

/** 过滤可见子树：收起节点的 children 整体剪掉（仅用于布局计算） */
function filterVisible(
  nodes: DeptTreeNode[],
  collapsed: Set<string>,
): DeptTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    children: collapsed.has(node.id)
      ? []
      : filterVisible(node.children, collapsed),
  }));
}

const nodes = computed<Node[]>(() => {
  const positions = layoutDeptForest(
    filterVisible(props.tree, props.collapsed),
  );
  const list: Node[] = [];
  const walk = (node: DeptTreeNode) => {
    const position = positions.get(node.id);

    if (position) {
      list.push({
        data: {
          childCount: node.children.length,
          dept: node,
          expandable: node.children.length > 0,
          isCollapsed: props.collapsed.has(node.id),
          isRoot: node.id === CHART_ROOT_ID,
        },
        id: node.id,
        position,
        type: "dept",
      });
    }
    if (!props.collapsed.has(node.id)) {
      for (const child of node.children) {
        walk(child);
      }
    }
  };

  for (const root of props.tree) {
    walk(root);
  }

  return list;
});

const edges = computed<Edge[]>(() => {
  const list: Edge[] = [];
  const walk = (node: DeptTreeNode) => {
    if (props.collapsed.has(node.id)) {
      return;
    }
    for (const child of node.children) {
      list.push({
        id: `${node.id}->${child.id}`,
        source: node.id,
        target: child.id,
        type: "smoothstep",
      });
    }
    for (const child of node.children) {
      walk(child);
    }
  };

  for (const root of props.tree) {
    walk(root);
  }

  return list;
});

const ariaLabel = computed(() => t("menu.pageTitle.chart"));
</script>

<script lang="ts">
export default { name: "OrgChart" };
</script>

<template>
  <div
    ref="wrapperRef"
    :class="{ dark: colorMode === 'dark' }"
    :aria-label="ariaLabel"
    class="h-full w-full"
  >
    <VueFlow
      :edges="edges"
      :edges-focusable="false"
      :max-zoom="1.5"
      :min-zoom="0.15"
      :nodes="nodes"
      :nodes-connectable="false"
      :nodes-draggable="false"
      :zoom-on-double-click="false"
      @nodes-initialized="handleNodesInitialized"
      @node-click="({ node }) => emit('nodeClick', String(node.id))"
    >
      <template #node-dept="nodeProps">
        <OrgChartNode
          :data="nodeProps.data"
          @toggle="(id: string) => emit('toggle', id)"
        />
      </template>
      <Background :gap="24" :size="1.5" :variant="BackgroundVariant.Dots" />
      <Controls :show-interactive="false" position="bottom-right" />
    </VueFlow>
  </div>
</template>

import type { DeptTreeNode } from "@/lib/api-types";
import type { Edge, Node, ColorMode } from "@xyflow/react";

import { useTheme } from "@heroui/react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
} from "@xyflow/react";
import { useMemo } from "react";

import "@xyflow/react/dist/style.css";

import { CHART_ROOT_ID, layoutDeptForest } from "./org-chart-layout";
import { DeptChartNode, type DeptNodeData } from "./org-chart-node";

/**
 * 组织架构图谱（React Flow 只读封装，随图谱页面懒加载）。
 *
 * 交互边界（阶段 4 选型评审定稿，勿放宽为流程编辑器）：
 * - 允许：画布平移 / 缩放 / Fit View（Controls）/ 点击节点 / 折叠展开组织节点；
 * - 禁用：节点拖拽、连线创建与编辑、双击缩放（误触）——
 *   nodesDraggable / nodesConnectable / edgesFocusable / elementsSelectable 全关。
 * - Minimap 未加入（演示规模几十~百级节点，按实际规模再评估）。
 *
 * 布局为手写紧凑树算法（org-chart-layout，未引入 d3-hierarchy）；
 * 展开 / 收起后基于可见子树整体重排，视口不自动缩放（保持用户视角）。
 */

/** nodeTypes 必须为模块级常量（组件内字面量会随渲染重建导致性能警告） */
const NODE_TYPES = { dept: DeptChartNode };

export interface OrgChartProps {
  /** 全量组织树（GET /org/depts/tree） */
  tree: DeptTreeNode[];
  /** 收起节点 id 集合（空集 = 全展开） */
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  /** 节点点击（携带组织 id，页面负责跳转通讯录） */
  onNodeClick: (deptId: string) => void;
}

/** 过滤可见子树：收起节点的 children 整体剪掉（仅用于布局计算） */
function filterVisible(
  nodes: DeptTreeNode[],
  collapsed: Set<string>,
): DeptTreeNode[] {
  const out: DeptTreeNode[] = [];

  for (const node of nodes) {
    out.push({
      ...node,
      children: collapsed.has(node.id)
        ? []
        : filterVisible(node.children, collapsed),
    });
  }

  return out;
}

export function OrgChart({
  tree,
  collapsed,
  onToggle,
  onNodeClick,
}: OrgChartProps) {
  const { theme } = useTheme();
  const nodes = useMemo<Node<DeptNodeData>[]>(() => {
    const positions = layoutDeptForest(filterVisible(tree, collapsed));
    const list: Node<DeptNodeData>[] = [];
    const walk = (node: DeptTreeNode) => {
      const position = positions.get(node.id);

      if (position) {
        list.push({
          data: {
            childCount: node.children.length,
            dept: node,
            expandable: node.children.length > 0,
            isCollapsed: collapsed.has(node.id),
            isRoot: node.id === CHART_ROOT_ID,
            onToggle,
          },
          id: node.id,
          position,
          type: "dept",
        });
      }
      if (!collapsed.has(node.id)) {
        for (const child of node.children) {
          walk(child);
        }
      }
    };

    for (const root of tree) {
      walk(root);
    }

    return list;
  }, [tree, collapsed, onToggle]);

  const edges = useMemo<Edge[]>(() => {
    const list: Edge[] = [];
    const walk = (node: DeptTreeNode) => {
      if (collapsed.has(node.id)) {
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

    for (const root of tree) {
      walk(root);
    }

    return list;
  }, [tree, collapsed]);

  return (
    <ReactFlow
      fitView
      colorMode={theme as ColorMode}
      edges={edges}
      edgesFocusable={false}
      elementsSelectable={false}
      fitViewOptions={{ maxZoom: 1, padding: 0.15 }}
      maxZoom={1.5}
      minZoom={0.15}
      nodeTypes={NODE_TYPES}
      nodes={nodes}
      nodesConnectable={false}
      nodesDraggable={false}
      zoomOnDoubleClick={false}
      onNodeClick={(_, node) => onNodeClick(node.id)}
    >
      <Background gap={24} size={1.5} variant={BackgroundVariant.Dots} />
      <Controls position="bottom-right" showInteractive={false} />
    </ReactFlow>
  );
}

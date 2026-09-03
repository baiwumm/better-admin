import type { DeptTreeNode } from "@/lib/api-types";

/**
 * 组织架构图谱布局（手写紧凑树布局，未引入 d3-hierarchy）。
 *
 * 组织数据为严格树形 + 节点固定尺寸，采用「子树宽度先序分配」即可：
 * 叶子占一个节点宽；内部节点先布局全部子树，再居中于子树 span 之上。
 * 相比 d3-hierarchy 的通用树布局，本实现只覆盖森林 + 固定尺寸场景，
 * 换取零依赖（阶段 4 选型评审结论：确认需要前不提前引入布局库）。
 *
 * 坐标为 React Flow 画布坐标（节点左上角），y 由层级深度决定。
 */

/** 图谱虚拟根节点 id（Better Admin，非真实组织；点击不跳转通讯录） */
export const CHART_ROOT_ID = "__chart_root__";

/** 节点卡片固定尺寸（与 org-chart-node 的 Card 样式保持一致，布局正确性的前提） */
export const CHART_NODE_WIDTH = 240;
export const CHART_NODE_HEIGHT = 112;

/** 同层兄弟水平间距 */
const SIBLING_GAP = 36;
/** 顶层根节点之间的间距 */
const ROOT_GAP = 64;
/** 层间垂直间距（含折叠圆钮的悬浮空间） */
const LEVEL_GAP = 100;

export interface ChartPosition {
  x: number;
  y: number;
}

/** 计算可见组织森林中每个节点的画布坐标（key 为组织 id） */
export function layoutDeptForest(
  roots: DeptTreeNode[],
): Map<string, ChartPosition> {
  const positions = new Map<string, ChartPosition>();
  let cursorX = 0;

  for (const root of roots) {
    layoutSubtree(root, 0, cursorX, positions);
    cursorX += subtreeWidth(root) + ROOT_GAP;
  }

  return positions;
}

/** 节点垂直坐标由深度决定 */
function depthY(depth: number): number {
  return depth * (CHART_NODE_HEIGHT + LEVEL_GAP);
}

/** 子树总宽度：叶子为单节点宽；内部节点为 max(自身, 子树宽度和 + 间距) */
function subtreeWidth(node: DeptTreeNode): number {
  const children = node.children;

  if (children.length === 0) {
    return CHART_NODE_WIDTH;
  }
  const childrenWidth =
    children.reduce((sum, child) => sum + subtreeWidth(child), 0) +
    (children.length - 1) * SIBLING_GAP;

  return Math.max(CHART_NODE_WIDTH, childrenWidth);
}

/** 先序分配坐标：子树布完后父节点居中于子树 span */
function layoutSubtree(
  node: DeptTreeNode,
  depth: number,
  offsetX: number,
  positions: Map<string, ChartPosition>,
): void {
  const width = subtreeWidth(node);

  positions.set(node.id, {
    x: offsetX + (width - CHART_NODE_WIDTH) / 2,
    y: depthY(depth),
  });
  let childCursor = offsetX;

  for (const child of node.children) {
    layoutSubtree(child, depth + 1, childCursor, positions);
    childCursor += subtreeWidth(child) + SIBLING_GAP;
  }
}

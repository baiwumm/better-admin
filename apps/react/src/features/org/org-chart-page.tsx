import type { DeptTreeNode } from "@/lib/api-types";

import { useQuery } from "@tanstack/react-query";
import { Skeleton, Surface } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";

import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "./dept-api";

import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { useTranslation } from "@/i18n";

/**
 * 组织架构图谱页（阶段 4）：React Flow 只读可视化。
 *
 * - 数据源复用 GET /org/depts/tree（与组织管理 / 通讯录共享缓存），无新契约；
 * - 不设图谱虚拟根节点，顶级组织直接作为根层；默认仅展开前两级，
 *   更深层级收起（点击节点底部折叠钮展开）；
 * - 图谱组件随页面懒加载（@xyflow/react 不进主包，bundle-dynamic-imports）；
 * - 节点点击跳转通讯录统一 URL Query（/org/directory?deptId=xxx，
 *   支持刷新 / 分享 / 前进后退，四端一致的跳转规范）；
 * - 交互边界见 org-chart.tsx：只读，平移 / 缩放 / Fit View / 折叠展开。
 */

/** 图谱重组件懒加载（React Flow + CSS 仅在进入本页时拉取） */
const OrgChart = lazy(() =>
  import("./org-chart").then((m) => ({ default: m.OrgChart })),
);

function ChartSkeleton() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
      <Skeleton className="h-28 w-60 rounded-xl" />
      <div className="flex gap-8">
        <Skeleton className="h-28 w-60 rounded-xl" />
        <Skeleton className="h-28 w-60 rounded-xl" />
      </div>
      <div className="flex gap-8">
        <Skeleton className="h-28 w-60 rounded-xl" />
        <Skeleton className="h-28 w-60 rounded-xl" />
        <Skeleton className="h-28 w-60 rounded-xl" />
      </div>
    </div>
  );
}

/** 默认折叠集合：仅展示前两级——深度 ≥ 1 的节点统一视为收起（下级默认隐藏） */
function collectDefaultCollapsed(
  nodes: DeptTreeNode[],
  depth = 0,
  acc: Set<string> = new Set(),
): Set<string> {
  for (const node of nodes) {
    if (depth >= 1) {
      acc.add(node.id);
    }
    collectDefaultCollapsed(node.children, depth + 1, acc);
  }

  return acc;
}

export function OrgChartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 组织树（与组织管理 / 通讯录共享 queryKey 缓存）
  const treeQuery = useQuery({
    queryKey: DEPTS_TREE_QUERY_KEY,
    queryFn: fetchDeptTree,
    placeholderData: (prev) => prev,
    staleTime: 0,
  });
  const tree = useMemo(() => treeQuery.data ?? [], [treeQuery.data]);

  /** 节点点击 → 通讯录按组织筛选（URL Query 规范） */
  const handleNodeClick = useCallback(
    (deptId: string) => {
      void navigate({ to: "/org/directory", search: { deptId } });
    },
    [navigate],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Surface className="min-h-120 flex-1 overflow-hidden">
        {treeQuery.isLoading ? (
          <ChartSkeleton />
        ) : tree.length === 0 ? (
          <EmptyContent
            className="flex h-full flex-col items-center justify-center gap-2 py-8 text-muted"
            title={t("features.chart.empty")}
          />
        ) : (
          <OrgChartView tree={tree} onNodeClick={handleNodeClick} />
        )}
      </Surface>
    </div>
  );
}

/** 图谱视图宿主：组织树就绪后才挂载，折叠集合以「仅展开前两级」为初始值 */
function OrgChartView({
  tree,
  onNodeClick,
}: {
  tree: DeptTreeNode[];
  onNodeClick: (deptId: string) => void;
}) {
  // 收起节点集合（折叠仅影响图谱视图，不改动组织数据）；
  // 树数据就绪后挂载才能惰性初始化，后续树刷新不重置用户已展开 / 收起的状态
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    collectDefaultCollapsed(tree),
  );
  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }, []);

  return (
    <div className="h-full w-full">
      <Suspense fallback={<ChartSkeleton />}>
        <OrgChart
          collapsed={collapsed}
          tree={tree}
          onNodeClick={onNodeClick}
          onToggle={toggleCollapse}
        />
      </Suspense>
    </div>
  );
}

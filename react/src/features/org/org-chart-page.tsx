import type { DeptTreeNode } from "@/lib/api-types";

import { useQuery } from "@tanstack/react-query";
import { Skeleton, Surface } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";

import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "./dept-api";
import { CHART_ROOT_ID } from "./org-chart-layout";

import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { useTranslation } from "@/i18n";

/**
 * 组织架构图谱页（阶段 4）：React Flow 只读可视化。
 *
 * - 数据源复用 GET /org/depts/tree（与组织管理 / 通讯录共享缓存），无新契约；
 * - 顶部为图谱虚拟根节点「Better Admin」（品牌入口，非真实组织，点击不跳转），
 *   其下挂全量组织森林；画布撑满主体区域（h-full 链路）；
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
      <Skeleton className="h-[112px] w-[240px] rounded-xl" />
      <div className="flex gap-8">
        <Skeleton className="h-[112px] w-[240px] rounded-xl" />
        <Skeleton className="h-[112px] w-[240px] rounded-xl" />
      </div>
      <div className="flex gap-8">
        <Skeleton className="h-[112px] w-[240px] rounded-xl" />
        <Skeleton className="h-[112px] w-[240px] rounded-xl" />
        <Skeleton className="h-[112px] w-[240px] rounded-xl" />
      </div>
    </div>
  );
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

  /** 顶部虚拟根节点（Better Admin）：非真实组织，仅作为图谱品牌入口 */
  const chartTree = useMemo<DeptTreeNode[]>(() => {
    if (tree.length === 0) {
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
        children: tree,
      },
    ];
  }, [tree]);

  /** 收起节点集合（空集 = 全展开；折叠仅影响图谱视图，不改动组织数据） */
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
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

  /** 节点点击 → 通讯录按组织筛选（URL Query 规范）；虚拟根节点不跳转 */
  const handleNodeClick = useCallback(
    (deptId: string) => {
      if (deptId === CHART_ROOT_ID) {
        return;
      }
      void navigate({ to: "/org/directory", search: { deptId } });
    },
    [navigate],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Surface className="min-h-[420px] flex-1 overflow-hidden rounded-3xl">
        {treeQuery.isLoading ? (
          <ChartSkeleton />
        ) : tree.length === 0 ? (
          <EmptyContent
            className="flex h-full flex-col items-center justify-center gap-2 py-8 text-muted"
            title={t("features.chart.empty")}
          />
        ) : (
          <div className="h-full w-full">
            <Suspense fallback={<ChartSkeleton />}>
              <OrgChart
                collapsed={collapsed}
                tree={chartTree}
                onNodeClick={handleNodeClick}
                onToggle={toggleCollapse}
              />
            </Suspense>
          </div>
        )}
      </Surface>
    </div>
  );
}

"use client";

import type { DeptTreeNode } from "@/lib/api-types";

import { useQuery } from "@tanstack/react-query";
import { Skeleton, Surface } from "@heroui/react";
import { useRouter } from "@bprogress/next/app";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";

import { DEPTS_TREE_QUERY_KEY, fetchDeptTree } from "./dept-api";
import { CHART_ROOT_ID } from "./org-chart-layout";

import { EmptyContent } from "@/components/common/empty-content/empty-content";
import { useTranslation } from "@/i18n";

/**
 * 组织架构图谱页（阶段 4，Next 端）：React Flow 只读可视化。
 *
 * - 数据源复用 GET /org/depts/tree（与组织管理 / 通讯录共享缓存），无新契约；
 * - 图谱组件按选型评审定稿用 next/dynamic 动态加载且 **ssr: false**
 *   （后台高交互页面无 SEO 需求，不为 SSR 增加节点尺寸 / Handle / 容器尺寸复杂度）；
 * - 顶部为图谱虚拟根节点「Better Admin」（品牌入口，非真实组织，点击不跳转），
 *   其下挂全量组织森林；画布撑满主体区域（h-full 链路）；
 * - 节点点击跳转通讯录统一 URL Query（/org/directory?deptId=xxx，
 *   支持刷新 / 分享 / 前进后退，四端一致的跳转规范）；
 * - 交互边界见 org-chart.tsx：只读，平移 / 缩放 / Fit View / 折叠展开。
 */

/** 图谱重组件动态加载（React Flow + CSS 仅在进入本页时拉取，默认不 SSR） */
const OrgChart = dynamic(
  () => import("./org-chart").then((m) => ({ default: m.OrgChart })),
  { ssr: false, loading: () => <ChartSkeleton /> },
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
  const router = useRouter();

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
      router.push(`/org/directory?deptId=${encodeURIComponent(deptId)}`);
    },
    [router],
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
            <OrgChart
              collapsed={collapsed}
              tree={chartTree}
              onNodeClick={handleNodeClick}
              onToggle={toggleCollapse}
            />
          </div>
        )}
      </Surface>
    </div>
  );
}

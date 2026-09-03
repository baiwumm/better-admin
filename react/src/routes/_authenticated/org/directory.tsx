import { createFileRoute } from "@tanstack/react-router";

import { DirectoryPage } from "@/features/org/directory-page";

/**
 * 通讯录组织筛选支持 URL Query（/org/directory?deptId=xxx）：
 * 架构图谱节点点击跳转的落点（阶段 4 交互规范：URL Query 而非路由 state，
 * 支持刷新 / 复制分享 / 浏览器前进后退）。
 */
interface DirectorySearch {
  deptId?: string;
}

export const Route = createFileRoute("/_authenticated/org/directory")({
  staticData: { titleKey: "menu.pageTitle.directory" },
  validateSearch: (search: Record<string, unknown>): DirectorySearch => ({
    deptId:
      typeof search.deptId === "string" && search.deptId
        ? search.deptId
        : undefined,
  }),
  component: function DirectoryRoute() {
    const { deptId } = Route.useSearch();

    return <DirectoryPage urlDeptId={deptId ?? null} />;
  },
});

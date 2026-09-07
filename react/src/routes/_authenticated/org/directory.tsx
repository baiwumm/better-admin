import { createFileRoute, useSearch } from "@tanstack/react-router";

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
    // 本页在 KeepAlive 实例池中渲染（脱离路由树 MatchContext），切走后的
    // 过渡帧里组件仍在渲染、match 已移除，Route.useSearch() 的严格匹配会抛
    // “Could not find an active match”（机制与规避原因见 my-notices.tsx 同款
    // 注释及 docs/mechanisms.md §10）。故用 strict:false 的全局 search 读取；
    // validateSearch 仍负责写入时的参数校验。strict:false 不经过本路由的
    // validateSearch，deptId 需按同样规则规整（空串视为未选）。
    const { deptId } = useSearch({ strict: false }) as DirectorySearch;

    return <DirectoryPage urlDeptId={deptId || null} />;
  },
});

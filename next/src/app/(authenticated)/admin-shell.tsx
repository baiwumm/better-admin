"use client";

import type { AuthUser, MenuNode } from "@/lib/api-types";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { AppHeader } from "@/layouts/components/app-header";
import { AppSidebar } from "@/layouts/components/app-sidebar";
import { TagsBar } from "@/layouts/components/tags-bar";
import { usePageTitle } from "@/lib/use-page-title";
import { LOGIN_REQUIRED_PATHS } from "@/lib/route-access";
import { collectMenuPaths } from "@/lib/menu-utils";
import { useAuthStore } from "@/stores/auth-store";
import { useDesignThemeStore } from "@/stores/design-theme-store";
import { useTabsStore } from "@/stores/tabs-store";

type AdminShellProps = {
  /** 服务端注入的可见菜单树（权限过滤后，含固定控制台节点） */
  menuTree: MenuNode[];
  /** 服务端注入的当前用户 */
  user: AuthUser;
  children: React.ReactNode;
};

/**
 * Admin 双栏布局壳（客户端组件；数据由 authenticated layout RSC 注入）：
 * - 桌面（md+）：左侧 256px 侧边栏（可折叠为图标栏），右侧顶部 64px + 主体内容
 * - 移动端（<md）：不显示侧边栏，点击顶栏按钮用 Drawer 弹出侧边栏
 *   （Drawer 与其触发按钮同在 AppHeader 内，满足 HeroUI Trigger anatomy）
 *
 * 与 React 版 AdminLayout 的差异：
 * - 菜单/用户数据来自 RSC 注入（服务端已按权限过滤），无 useMenus/加载
 *   覆盖层（RSC 阻塞渲染即 loading，失败走 error boundary）；
 * - 布局级 403 门卫上移到 proxy（服务端统一执行，见 proxy.ts）；
 * - KeepAlive 放弃（已知差异）：主体区直接渲染 children，无实例池。
 */
export function AdminShell({ menuTree, user, children }: AdminShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const showTabs = useDesignThemeStore((s) => s.showTabs);

  // 当前用户快照同步：把 RSC 注入的服务端权威 user 覆盖进客户端 store，
  // 使管理员修改角色授权后「刷新页面生效」（等价 React 版 useAuthSync）。
  useEffect(() => {
    useAuthStore.getState().setUser(user);
  }, [user]);

  // 多标签页：挂载恢复 sessionStorage 快照（SSR 安全，见 tabs-store）；
  // 路由变化登记标签；菜单就绪后按可达路径治理残留标签。
  const openPath = useTabsStore((s) => s.openPath);
  const pruneTabs = useTabsStore((s) => s.pruneTabs);
  const restoreTabs = useTabsStore((s) => s.restoreTabs);

  useEffect(() => {
    restoreTabs();
  }, [restoreTabs]);

  useEffect(() => {
    openPath(pathname, pathname);
  }, [pathname, openPath]);

  useEffect(() => {
    pruneTabs(
      new Set([...collectMenuPaths(menuTree), ...LOGIN_REQUIRED_PATHS]),
    );
  }, [menuTree, pruneTabs]);

  // 页面标题（document.title）：菜单名称 → 静态映射 → 应用名
  usePageTitle(menuTree, pathname);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* 桌面侧边栏壳：
          - width 过渡承担折叠动画（布局属性无法避免 reflow，故由内层配合）；
          - overflow-hidden 裁剪内容瞬切的溢出（内容宽度在 AppSidebar 内瞬切，
            避免中间态逐帧文字折行/截断的重排抖动）；
          - contain:layout/paint/style 把侧边栏内部的样式/布局/绘制变化圈在
            自身子树内，不波及右侧布局树；
          - transform-gpu 提升为独立合成层，重绘范围进一步隔离。 */}
      <aside
        className={`hidden shrink-0 transform-gpu flex-col overflow-hidden border-r border-separator transition-[width] duration-200 ease-out contain-[layout_paint_style] md:flex ${collapsed ? "w-16" : "w-64"}`}
      >
        <AppSidebar collapsed={collapsed} menuTree={menuTree} user={user} />
      </aside>

      {/* 右侧区域：顶部 64px + 主体 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          collapsed={collapsed}
          menuTree={menuTree}
          user={user}
          onToggle={() => setCollapsed((v) => !v)}
        />
        {/* 多标签页栏（偏好设置可关；仅隐藏 UI，标签数据照常维护） */}
        {showTabs && <TagsBar menuTree={menuTree} />}
        {/* 主体内容：滚动统一由本容器承担（滚动条贴合主体区边缘）。
            React 版的 view-transition-name/KeepAlive 实例池随 KeepAlive
            一并放弃（已知差异），页面切换为普通提交渲染。 */}
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

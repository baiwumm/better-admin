import { Link } from "@tanstack/react-router";
import { cn, Skeleton, Typography, useTheme } from "@heroui/react";

import { CollapsedMenu } from "./collapsed-menu";
import { SidebarMenu } from "./sidebar-menu";
import { SidebarUser } from "./sidebar-user";

import { useMenus } from "@/hooks/use-menus";
import { filterHiddenMenus } from "@/lib/permission";
import { ENV } from "@/lib/env";

import logo from "/logo.svg";
import logoDark from "/logo-dark.svg";

type AppSidebarProps = {
  /** 桌面端折叠态：仅显示一级图标，hover 弹出子菜单 */
  collapsed?: boolean;
  /** 子菜单导航后回调（移动端 Drawer 用于自动关闭） */
  onNavigate?: () => void;
};

/** 侧边栏菜单加载骨架屏（展开态）：图标方块 + 两行文字占位，逼真模拟菜单项。 */
function SidebarMenuSkeleton() {
  return (
    <div className="flex flex-col gap-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-3xl px-3 py-2">
          <Skeleton className="size-5 rounded-lg" />
          <Skeleton
            className="h-3.5 rounded-full"
            style={{ width: `${55 + ((i * 13) % 35)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

/** 侧边栏菜单加载骨架屏（折叠态）：仅图标方块占位。 */
function CollapsedMenuSkeleton() {
  return (
    <div className="flex flex-col items-center gap-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="size-9 rounded-3xl" />
      ))}
    </div>
  );
}

/**
 * 侧边栏主体：顶部 Logo + 标题，中间 Accordion(ListBox) 菜单，底部用户头像。
 * - 展开态（256px）：Accordion 折叠展开菜单 + ListBox 子菜单
 * - 折叠态（仅图标宽度）：保留 Logo 图标、一级菜单图标、用户头像
 */
export function AppSidebar({ collapsed, onNavigate }: AppSidebarProps) {
  const { theme } = useTheme("system");

  // 当前用户可见菜单树（权限过滤后）；侧边栏再剔除 hideInMenu 隐藏节点
  const { data: menuTree, isLoading } = useMenus();
  const items = filterHiddenMenus(menuTree ?? []);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-surface border border-r">
      {/* 顶部 Logo + 标题 */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-separator",
          collapsed ? "justify-center px-2" : "gap-3 px-4",
        )}
      >
        <Link className="flex items-center gap-3" to="/" onClick={onNavigate}>
          <img
            alt="Logo"
            className="size-8 shrink-0 rounded-lg"
            src={theme === "dark" ? logoDark : logo}
          />
          {!collapsed && (
            <div className="grid leading-tight">
              <Typography
                className="truncate leading-tight font-bold"
                type="body-sm"
              >
                {ENV.appName}
              </Typography>
              <Typography
                className="truncate leading-tight"
                color="muted"
                type="body-xs"
              >
                全栈 Admin 系统
              </Typography>
            </div>
          )}
        </Link>
      </div>

      {/* 中间菜单区域：首次加载（无缓存）显示骨架屏；有数据后渲染真实菜单 */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        {isLoading ? (
          collapsed ? (
            <CollapsedMenuSkeleton />
          ) : (
            <SidebarMenuSkeleton />
          )
        ) : collapsed ? (
          <CollapsedMenu items={items} onNavigate={onNavigate} />
        ) : (
          <SidebarMenu items={items} onNavigate={onNavigate} />
        )}
      </nav>

      {/* 底部用户区 */}
      <SidebarUser collapsed={collapsed} />
    </div>
  );
}

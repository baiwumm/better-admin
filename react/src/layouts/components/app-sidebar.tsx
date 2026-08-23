import { Link } from "react-router-dom";
import { cn, useTheme } from "@heroui/react";

import { CollapsedMenu } from "./collapsed-menu";
import { SidebarMenu } from "./sidebar-menu";
import { SidebarUser } from "./sidebar-user";

import logo from "/logo.svg";
import logoDark from "/logo-dark.svg";

import { mockMenus } from "@/data/menus";

type AppSidebarProps = {
  /** 桌面端折叠态：仅显示一级图标，hover 弹出子菜单 */
  collapsed?: boolean;
  /** 子菜单导航后回调（移动端 Drawer 用于自动关闭） */
  onNavigate?: () => void;
};

/**
 * 侧边栏主体：顶部 Logo + 标题，中间 Accordion(ListBox) 菜单，底部用户头像。
 * - 展开态（256px）：Accordion 折叠展开菜单 + ListBox 子菜单
 * - 折叠态（仅图标宽度）：保留 Logo 图标、一级菜单图标、用户头像
 */
export function AppSidebar({ collapsed, onNavigate }: AppSidebarProps) {
  const { theme } = useTheme("system");

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
            <span className="grid leading-tight">
              <span className="truncate text-sm font-bold text-foreground">
                Better Admin
              </span>
              <span className="truncate text-xs text-muted">
                全栈 Admin 系统
              </span>
            </span>
          )}
        </Link>
      </div>

      {/* 中间菜单区域 */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        {collapsed ? (
          <CollapsedMenu items={mockMenus} onNavigate={onNavigate} />
        ) : (
          <SidebarMenu items={mockMenus} onNavigate={onNavigate} />
        )}
      </nav>

      {/* 底部用户区 */}
      <SidebarUser collapsed={collapsed} />
    </div>
  );
}

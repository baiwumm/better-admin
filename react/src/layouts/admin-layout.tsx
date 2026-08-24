import { useState } from "react";
import type { ReactNode } from "react";
import { Outlet, useLocation } from "@tanstack/react-router";
import { Drawer, Spinner, Typography } from "@heroui/react";

import { AppHeader } from "./components/app-header";
import { AppSidebar } from "./components/app-sidebar";

import { ForbiddenErrorPage } from "@/components/common/error-pages/forbidden-error";
import { useMenus } from "@/hooks/use-menus";
import { type MenuNode } from "@/lib/api-types";
import { LOGIN_REQUIRED_PATHS } from "@/lib/route-access";
import { collectMenuPaths } from "@/lib/menu-utils";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Admin 双栏布局：
 * - 桌面（md+）：左侧 256px 侧边栏（可折叠为图标栏），右侧顶部 64px + 主体内容
 * - 移动端（<md）：不显示侧边栏，点击顶栏按钮用 Drawer 弹出侧边栏
 *
 * 菜单权限门卫（布局级，替代原路由跳转方案）：
 * - 未登录：beforeLoad 已拦截，此处双保险返回空。
 * - 白名单（/ 与 /account）：登录即可访问，直接渲染内容。
 * - 菜单未就绪/加载中：布局照常（侧边栏 Skeleton），主体区显示全屏「正在校验权限…」。
 * - 菜单加载失败：主体区提示失败，不误跳 403。
 * - 菜单就绪 + 路径不在用户可见菜单树：渲染 403 无权限页（方案 X：URL 不变）。
 * - 菜单就绪 + 路径在菜单树：渲染内容。
 */
export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: menuTree, isLoading, isError } = useMenus();
  const { pathname } = useLocation();

  // 未登录双保险（beforeLoad 已保证，正常不会到这）
  if (!isAuthenticated) return null;

  // 白名单：登录即可访问，不参与菜单权限校验
  const isWhitelisted = (LOGIN_REQUIRED_PATHS as readonly string[]).includes(
    pathname,
  );

  // 主体区内容（loading / 失败提示 / 业务页）：
  // 菜单未就绪（首次请求中，且无旧数据）→ loading
  let body: ReactNode;
  if (isLoading || (menuTree === undefined && !isError)) {
    body = (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
        <Spinner color="current" />
        <Typography className="text-sm" color="muted" type="body-sm">
          正在校验权限…
        </Typography>
      </div>
    );
  } else if (isError) {
    // 加载失败：提示失败，不误跳 403
    body = (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
        <Typography className="text-sm" color="muted" type="body-sm">
          权限校验失败，请刷新重试
        </Typography>
      </div>
    );
  } else {
    // 菜单已就绪：非白名单路径做权限校验
    const allowed = menuTree
      ? collectMenuPaths(menuTree as MenuNode[])
      : new Set<string>();
    const forbidden = !isWhitelisted && !allowed.has(pathname);

    // 无权限：整页替换为 403（URL 不变，避免闪跳）
    if (forbidden) return <ForbiddenErrorPage />;

    body = <Outlet />;
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* 桌面侧边栏 */}
      <aside
        className={`hidden shrink-0 flex-col transition-[width] duration-200 ease-out md:flex ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <AppSidebar collapsed={collapsed} />
      </aside>

      {/* 右侧区域：顶部 64px + 主体 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          collapsed={collapsed}
          onOpenDrawer={() => setDrawerOpen(true)}
          onToggle={() => setCollapsed((v) => !v)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{body}</main>
      </div>

      {/* 移动端 Drawer 侧边栏 */}
      <Drawer>
        <Drawer.Backdrop
          className="md:hidden"
          isOpen={drawerOpen}
          onOpenChange={setDrawerOpen}
        >
          <Drawer.Content placement="left">
            <Drawer.Dialog className="h-full w-64 p-0">
              <AppSidebar
                collapsed={false}
                onNavigate={() => setDrawerOpen(false)}
              />
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
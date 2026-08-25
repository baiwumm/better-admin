import type { ReactNode } from "react";

import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Drawer, Spinner, Typography } from "@heroui/react";

import { AppHeader } from "./components/app-header";
import { AppSidebar } from "./components/app-sidebar";
import { KeepAliveOutlet } from "./components/keep-alive-outlet";

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
 * - 菜单未就绪/加载中：主体区显示「正在校验权限…」覆盖层（侧边栏照常）。
 * - 菜单加载失败：主体区提示失败，不误跳 403。
 * - 菜单就绪 + 路径不在用户可见菜单树：主体区渲染 403 无权限页
 *   （方案 X：URL 不变；侧边栏保留，可直接切换其它菜单离开）。
 * - 异常态统一以 overlay 传入 KeepAliveOutlet：实例池保持挂载不销毁保活。
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

  // 主体区异常态覆盖层（loading / 校验失败 / 403）：
  // overlay 非空时 KeepAliveOutlet 实例池保持挂载（全部转 hidden 保活），
  // 异常内容渲染于其上——恢复后原页面状态无损，不再销毁保活。
  let overlay: ReactNode = null;

  if (isLoading || (menuTree === undefined && !isError)) {
    // 菜单未就绪（首次请求中，且无旧数据）→ loading
    overlay = (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
        <Spinner color="current" />
        <Typography className="text-sm" color="muted" type="body-sm">
          正在校验权限…
        </Typography>
      </div>
    );
  } else if (isError) {
    // 加载失败：提示失败，不误跳 403
    overlay = (
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

    // 无权限：主体区替换为 403（URL 不变，避免闪跳；侧边栏保留，
    // 用户可直接切换其它菜单离开）
    if (forbidden) overlay = <ForbiddenErrorPage />;
  }

  // 业务页：KeepAliveOutlet 统一承担路由呈现（实例池保活）、路由过渡
  // 动画编排（VT + flushSync，只作用 main-content 区域）与异常覆盖层。
  const body = <KeepAliveOutlet overlay={overlay} />;

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
        {/* 主体内容：指定 view-transition-name 使路由过渡动画只作用于该区域
            （布局/侧边栏/顶栏不参与过渡，见 styles/route-transitions.css）。
            滚动统一由本容器承担（滚动条贴合主体区边缘）；KeepAliveOutlet
            在每次页面切换完成后会将滚动位置重置到顶部。 */}
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 [view-transition-name:main-content]">
          {body}
        </main>
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

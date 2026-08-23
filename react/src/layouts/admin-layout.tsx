import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Drawer } from "@heroui/react";

import { AppHeader } from "./components/app-header";
import { AppSidebar } from "./components/app-sidebar";

/**
 * Admin 双栏布局：
 * - 桌面（md+）：左侧 256px 侧边栏（可折叠为图标栏），右侧顶部 64px + 主体内容
 * - 移动端（<md）：不显示侧边栏，点击顶栏按钮用 Drawer 弹出侧边栏
 */
export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
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

import { useLocation } from "@tanstack/react-router";
import { Breadcrumbs, Button } from "@heroui/react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { ThemeSettingsDrawer } from "./theme-settings-drawer";

import { useMenus } from "@/hooks/use-menus";
import { filterHiddenMenus } from "@/lib/permission";
import { findActivePath, getBreadcrumbNodes } from "@/lib/menu-utils";
import { type MenuNode } from "@/lib/api-types";

type AppHeaderProps = {
  collapsed: boolean;
  /** 桌面端：点击切换折叠态 */
  onToggle: () => void;
  /** 移动端：点击打开 Drawer 侧边栏 */
  onOpenDrawer: () => void;
};

/**
 * 右侧顶栏（高度 64px）：左侧为侧边栏折叠 / Drawer 展开按钮，其后跟随面包屑。
 * - 桌面（md+）：点击切换侧边栏折叠/展开
 * - 移动端（<md）：点击使用 Drawer 弹出侧边栏
 * - 面包屑：根据当前路由从可见菜单树解析出「根分组 → 当前页」的路径，
 *   每项显示图标 + 菜单名称，末项为当前页（不可点击）。
 */
export function AppHeader({
  collapsed,
  onToggle,
  onOpenDrawer,
}: AppHeaderProps) {
  const { pathname } = useLocation();
  const { data: menuTree } = useMenus();

  // 从可见菜单树解析出当前路由对应的面包屑节点链（含图标与名称）。
  const crumbs: MenuNode[] = (() => {
    const tree = filterHiddenMenus(menuTree ?? []);
    const activePath = findActivePath(tree, pathname);

    return activePath.length > 0 ? getBreadcrumbNodes(tree, activePath) : [];
  })();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-separator bg-surface px-4">
      {/* 移动端：Drawer 按钮 */}
      <Button
        isIconOnly
        aria-label="打开侧边栏"
        className="md:hidden"
        variant="ghost"
        onPress={onOpenDrawer}
      >
        <Menu className="size-5" />
      </Button>

      {/* 桌面端：折叠 / 展开按钮 */}
      <Button
        isIconOnly
        aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        className="hidden md:inline-flex"
        variant="ghost"
        onPress={onToggle}
      >
        {collapsed ? (
          <PanelLeftOpen className="size-5" />
        ) : (
          <PanelLeftClose className="size-5" />
        )}
      </Button>

      {/* 面包屑：图标 + 菜单名称 */}
      {crumbs.length > 0 && (
        <Breadcrumbs className="min-w-0">
          {crumbs.map((item) => (
            <Breadcrumbs.Item key={item.id} className="min-w-0">
              <DynamicIcon
                className="shrink-0 mr-1.5"
                name={item.icon as IconName}
                size={16}
              />
              {item.label}
            </Breadcrumbs.Item>
          ))}
        </Breadcrumbs>
      )}

      {/* 右侧区域：主题设置入口 */}
      <div className="flex flex-1 items-center justify-end gap-2">
        <ThemeSettingsDrawer />
      </div>
    </header>
  );
}

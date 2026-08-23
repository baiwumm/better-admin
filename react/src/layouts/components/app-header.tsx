import { Button } from "@heroui/react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

type AppHeaderProps = {
  collapsed: boolean;
  /** 桌面端：点击切换折叠态 */
  onToggle: () => void;
  /** 移动端：点击打开 Drawer 侧边栏 */
  onOpenDrawer: () => void;
};

/**
 * 右侧顶栏（高度 64px）：左侧为侧边栏折叠 / Drawer 展开按钮。
 * - 桌面（md+）：点击切换侧边栏折叠/展开
 * - 移动端（<md）：点击使用 Drawer 弹出侧边栏
 */
export function AppHeader({
  collapsed,
  onToggle,
  onOpenDrawer,
}: AppHeaderProps) {
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

      {/* 预留：右侧区域可放面包屑 / 用户操作等 */}
      <div aria-hidden="true" className="flex-1" />
    </header>
  );
}

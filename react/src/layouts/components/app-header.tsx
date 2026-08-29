import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { Breadcrumbs, Button, Separator, useOverlayState } from "@heroui/react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { CommandMenu } from "./command-menu";
import { FullscreenButton } from "./fullscreen-button";
import { LanguageSwitcher } from "./language-switcher";
import { SearchTrigger } from "./search-trigger";
import { ThemeSettingsDrawer } from "./theme-settings-drawer";

import { useMenus } from "@/hooks/use-menus";
import { useTranslation } from "@/i18n";
import { getMenuLabel } from "@/lib/menu-i18n";
import { filterHiddenMenus } from "@/lib/permission";
import { findActivePath, getBreadcrumbNodes } from "@/lib/menu-utils";
import { type MenuNode } from "@/lib/api-types";
import { useDisplayedPathStore } from "@/stores/displayed-path-store";

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
  const { t } = useTranslation();

  // 面包屑跟随「已提交」的呈现路径（KeepAliveOutlet 在过渡回调内 flushSync
  // 时同步镜像），不直接用 pathname：主体内容冻结在旧页期间，面包屑文案
  // 与其保持一致、在同一提交内一起切换，不会先于页面内容跳变。
  // store 初值在挂载校正前为空，回退 pathname。
  const committedPath = useDisplayedPathStore((s) => s.path);

  // 命令面板开合状态（Hero UI 官方用法：useOverlayState + 状态挂 Backdrop），
  // 由本组件持有：SearchTrigger（入口按钮）与 CommandMenu（面板）共享。
  const searchState = useOverlayState();
  const searchSetOpen = searchState.setOpen;

  // 全局快捷键 ⌘K / Ctrl+K 开关命令面板（仅登录后布局挂载期间生效）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchSetOpen(!searchState.isOpen);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [searchSetOpen, searchState.isOpen]);

  // 从可见菜单树解析出当前路由对应的面包屑节点链（含图标与名称）。
  const crumbs: MenuNode[] = (() => {
    const tree = filterHiddenMenus(menuTree ?? []);
    const activePath = findActivePath(tree, committedPath || pathname);

    return activePath.length > 0 ? getBreadcrumbNodes(tree, activePath) : [];
  })();

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-separator bg-surface px-4">
        <div className="shrink-0 flex items-center gap-3">
          {/* 移动端：Drawer 按钮 */}
          <Button
            isIconOnly
            aria-label={t("layout.header.openSidebar")}
            className="md:hidden"
            size="sm"
            variant="ghost"
            onPress={onOpenDrawer}
          >
            <Menu />
          </Button>

          {/* 桌面端：折叠 / 展开按钮 */}
          <Button
            isIconOnly
            aria-label={
              collapsed
                ? t("layout.header.expandSidebar")
                : t("layout.header.collapseSidebar")
            }
            className="hidden md:inline-flex"
            size="sm"
            variant="ghost"
            onPress={onToggle}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>

          {/* 分隔线：折叠按钮 / 面包屑 */}
          <Separator
            className="hidden h-5 self-center md:flex"
            orientation="vertical"
          />

          {/* 面包屑：图标 + 菜单名称。不做 view-transition 绑定（曾因
          old/new 快照同文案的重影问题改为绑定、最终按产品约定移除），
          切换时随 root 组瞬间替换，文案与主体内容同一 commit 更新 */}
          {crumbs.length > 0 && (
            <div className="min-w-0 hidden md:flex">
              <Breadcrumbs className="min-w-0">
                {crumbs.map((item) => (
                  <Breadcrumbs.Item key={item.id} className="min-w-0">
                    <DynamicIcon
                      className="shrink-0 mr-1.5"
                      name={item.icon as IconName}
                      size={16}
                    />
                    {getMenuLabel(item, t)}
                  </Breadcrumbs.Item>
                ))}
              </Breadcrumbs>
            </div>
          )}
        </div>

        {/* 右侧区域：搜索入口 + 全屏切换 + 语言切换 + 主题设置入口 */}
        <div className="flex flex-1 items-center justify-end gap-2">
          <SearchTrigger onPress={searchState.open} />
          <FullscreenButton />
          <LanguageSwitcher />
          <ThemeSettingsDrawer />
        </div>
      </header>

      {/* 命令面板（Modal 经 Portal 渲染，挂载位置不影响视觉层级） */}
      <CommandMenu state={searchState} />
    </>
  );
}

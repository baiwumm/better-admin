import type { AuthUser, MenuNode } from "@/lib/api-types";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Breadcrumbs,
  Button,
  Drawer,
  Separator,
  useOverlayState,
} from "@heroui/react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { AppSidebar } from "./app-sidebar";
import { CommandMenu } from "./command-menu";
import { FullscreenButton } from "./fullscreen-button";
import { LanguageSwitcher } from "./language-switcher";
import { SearchTrigger } from "./search-trigger";
import { ThemeSettingsDrawer } from "./theme-settings-drawer";

import { useTranslation } from "@/i18n";
import { getMenuLabel } from "@/lib/menu-i18n";
import { filterHiddenMenus } from "@/lib/permission";
import { findActivePath, getBreadcrumbNodes } from "@/lib/menu-utils";
import { getRouteTitleKey } from "@/lib/route-title";

type AppHeaderProps = {
  /** 服务端注入的可见菜单树 */
  menuTree: MenuNode[];
  /** 服务端注入的当前用户（透传给 Drawer 内的侧边栏用户区） */
  user: AuthUser | null;
  collapsed: boolean;
  /** 桌面端：点击切换折叠态 */
  onToggle: () => void;
};

/**
 * 右侧顶栏（高度 64px）：左侧为侧边栏折叠 / Drawer 展开按钮，其后跟随面包屑。
 * - 桌面（md+）：点击切换侧边栏折叠/展开
 * - 移动端（<md）：点击使用 Drawer 弹出侧边栏
 * - 面包屑：根据当前路由从可见菜单树解析出「根分组 → 当前页」的路径，
 *   每项显示菜单名称，末项为当前页（不可点击）。
 *
 * Next 适配：菜单树/用户由 RSC 注入；React 版的 committedPath
 * （displayed-path-store，与 KeepAlive 双缓冲同步）随 KeepAlive 一并放弃，
 * 直接使用 usePathname；路由标题兜底改走静态映射（lib/route-title）。
 */
export function AppHeader({
  menuTree,
  user,
  collapsed,
  onToggle,
}: AppHeaderProps) {
  const pathname = usePathname();
  const { t } = useTranslation();

  // 命令面板开合状态（Hero UI 官方用法：useOverlayState + 状态挂 Backdrop），
  // 由本组件持有：SearchTrigger（入口按钮）与 CommandMenu（面板）共享。
  const searchState = useOverlayState();
  const searchSetOpen = searchState.setOpen;

  // 移动端侧边栏抽屉开合状态（Hero UI 官方用法：useOverlayState + 状态挂
  // Drawer 根的 state prop）。菜单按钮作为 Drawer 的触发子元素（官方 anatomy
  // 要求 Drawer 根下存在 pressable 子元素，否则 PressResponder 控制台告警）。
  const mobileMenu = useOverlayState();

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

  // 从可见菜单树解析出当前路由对应的面包屑节点链（含图标与名称）；
  // 非菜单路由（如登录白名单页 /account）在菜单树中无匹配，回退为单级
  // 面包屑，标题取静态路由标题映射（与标签栏、页面标题 hook 同源）。
  const crumbs = (() => {
    const tree = filterHiddenMenus(menuTree);
    const activePath = findActivePath(tree, pathname);

    if (activePath.length > 0) {
      return getBreadcrumbNodes(tree, activePath).map((node) => ({
        id: node.id,
        label: getMenuLabel(node, t),
      }));
    }

    const titleKey = getRouteTitleKey(pathname);

    return titleKey ? [{ id: pathname, label: t(titleKey) }] : [];
  })();

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-separator bg-surface px-4">
        <div className="shrink-0 flex items-center gap-3">
          {/* 移动端：Drawer 按钮 + 抽屉同根（官方 anatomy：Drawer 根下首个
              子元素为触发按钮，press 上下文才能触达；Backdrop 经 Portal
              渲染到 body，包裹不影响顶栏布局） */}
          <Drawer state={mobileMenu}>
            <Button
              isIconOnly
              aria-label={t("layout.header.openSidebar")}
              className="md:hidden"
              size="sm"
              variant="ghost"
            >
              <Menu />
            </Button>
            <Drawer.Backdrop
              className="md:hidden"
              isOpen={mobileMenu.isOpen}
              onOpenChange={mobileMenu.setOpen}
            >
              <Drawer.Content placement="left">
                <Drawer.Dialog className="h-full w-64 p-0">
                  <AppSidebar
                    collapsed={false}
                    menuTree={menuTree}
                    user={user}
                    onNavigate={mobileMenu.close}
                  />
                </Drawer.Dialog>
              </Drawer.Content>
            </Drawer.Backdrop>
          </Drawer>

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
                    {item.label}
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
      <CommandMenu menuTree={menuTree} state={searchState} />
    </>
  );
}

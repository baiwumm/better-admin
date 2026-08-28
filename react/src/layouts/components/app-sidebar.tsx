import type { ComponentType, Key } from "react";

import {
  cn,
  Dropdown,
  Label,
  Link,
  Separator,
  Skeleton,
  Tooltip,
  Typography,
} from "@heroui/react";
import { ArrowUpRight, ChevronsUpDown, Globe } from "lucide-react";

import { CollapsedMenu } from "./collapsed-menu";
import { SidebarMenu } from "./sidebar-menu";
import { SidebarUser } from "./sidebar-user";

import {
  HeroUIIcon,
  ReactIcon,
  TailwindIcon,
  TypeScriptIcon,
  ViteIcon,
} from "@/components/common/brand-icons";
import { useMenus } from "@/hooks/use-menus";
import { filterHiddenMenus } from "@/lib/permission";
import { ENV } from "@/lib/env";
import { useTranslation } from "@/i18n";

import logo from "/logo.svg";
import logoDark from "/logo-dark.svg";

import { useResolvedTheme } from "@/stores/design-theme-store";

type AppSidebarProps = {
  /** 桌面端折叠态：仅显示一级图标，hover 弹出子菜单 */
  collapsed?: boolean;
  /** 子菜单导航后回调（移动端 Drawer 用于自动关闭） */
  onNavigate?: () => void;
};

/** 技术栈入口（顶部品牌下拉菜单）：当前项目核心栈，新窗口跳转对应官网。 */
const TECH_STACKS: {
  name: string;
  url: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { name: "React", url: "https://react.dev", Icon: ReactIcon },
  { name: "HeroUI", url: "https://www.heroui.com", Icon: HeroUIIcon },
  {
    name: "TypeScript",
    url: "https://www.typescriptlang.org",
    Icon: TypeScriptIcon,
  },
  { name: "Vite", url: "https://vite.dev", Icon: ViteIcon },
  { name: "Tailwind CSS", url: "https://tailwindcss.com", Icon: TailwindIcon },
];

/** 底部快捷链接（菜单区与用户区之间）：新窗口跳转。 */
const SIDEBAR_LINKS = [
  {
    labelKey: "layout.sidebar.github",
    href: "https://github.com/baiwumm/better-admin",
    kind: "github",
  },
  {
    labelKey: "layout.sidebar.blog",
    href: "https://www.baiwumm.com",
    kind: "blog",
  },
] as const;

/** GitHub 官方 mark（lucide 已移除品牌图标，此处内联官方 SVG path）。 */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 16 16"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/** 链接图标映射（Github 用内联 SVG，其余走 lucide）。 */
function SidebarLinkIcon({ kind }: { kind: "github" | "blog" }) {
  if (kind === "github") {
    return <GithubIcon className="size-4 shrink-0" />;
  }

  return <Globe className="size-4 shrink-0" />;
}

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
 * 顶部品牌区：Logo + 品牌名（折叠态仅 Logo），形式对齐底部用户头像——
 * 点击弹出下拉菜单展示技术栈入口，点击项新窗口跳转对应官网。
 */
function SidebarBrand({ collapsed }: { collapsed?: boolean }) {
  // 实际生效的明暗外观（来自 design-theme-store，跨组件一致）
  const theme = useResolvedTheme();
  const { t } = useTranslation();

  const handleMenuAction = (key: Key) => {
    const stack = TECH_STACKS.find((s) => s.name === key);

    if (stack) window.open(stack.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={cn(
        "flex h-16 shrink-0 items-center border-b border-separator",
        collapsed ? "justify-center px-2" : "px-3",
      )}
    >
      <Dropdown>
        {/* Dropdown.Trigger 本身就是 button 元素，内容直接放入，避免 button 嵌套 */}
        <Dropdown.Trigger
          className={cn(
            "flex w-full items-center gap-3 rounded-3xl px-3 py-2 text-start hover:bg-default",
            collapsed && "w-auto justify-center px-2",
          )}
        >
          <img
            alt="Logo"
            className="size-8 shrink-0 rounded-lg"
            src={theme === "dark" ? logoDark : logo}
          />
          {!collapsed && (
            <>
              <Typography
                className="min-w-0 flex-1 truncate font-bold"
                type="h5"
              >
                {ENV.appName}
              </Typography>
              <ChevronsUpDown className="size-4 shrink-0 text-muted" />
            </>
          )}
        </Dropdown.Trigger>

        <Dropdown.Popover className="min-w-44">
          {/* 弹层头部：分组标题 */}
          <div className="px-3 pt-2.5 pb-1">
            <Typography color="muted" type="body-xs">
              {t("layout.sidebar.techStack")}
            </Typography>
          </div>

          <Separator />

          <Dropdown.Menu onAction={handleMenuAction}>
            {TECH_STACKS.map(({ name, Icon }) => (
              <Dropdown.Item key={name} id={name} textValue={name}>
                <Icon className="size-4 shrink-0 text-muted" />
                <Label>{name}</Label>
                <ArrowUpRight className="ml-auto size-3.5 shrink-0 text-muted" />
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}

/**
 * 菜单区底部快捷链接：Github / 博客，新窗口跳转。
 * 展开态为「图标 + 文字」，折叠态仅图标（Tooltip 提示名称）。
 */
function SidebarLinks({ collapsed }: { collapsed?: boolean }) {
  const { t } = useTranslation();

  return (
    /* 纵向排布；与用户区之间由 SidebarUser 自带的 border-t 分隔 */
    <div className="flex shrink-0 flex-col px-3.5 py-2">
      {SIDEBAR_LINKS.map((link) => {
        const label = t(link.labelKey);
        const linkEl = (
          <Link
            key={link.labelKey}
            className="flex h-9 w-full items-center gap-2 rounded-3xl px-2.5 text-muted transition-colors hover:bg-default hover:text-foreground no-underline"
            href={link.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            <SidebarLinkIcon kind={link.kind} />
            {!collapsed && (
              <>
                <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                <Link.Icon className="pb-0" />
              </>
            )}
          </Link>
        );

        if (!collapsed) return linkEl;

        return (
          <Tooltip key={link.labelKey} delay={0}>
            {linkEl}
            <Tooltip.Content showArrow placement="right">
              <Tooltip.Arrow />
              {label}
            </Tooltip.Content>
          </Tooltip>
        );
      })}
    </div>
  );
}

/**
 * 侧边栏主体：顶部品牌（技术栈下拉），中间 Accordion(ListBox) 菜单，
 * 菜单区底部快捷链接，最底部用户头像。
 * - 展开态（256px）：Accordion 折叠展开菜单 + ListBox 子菜单
 * - 折叠态（仅图标宽度）：保留 Logo 图标、一级菜单图标、快捷链接图标、用户头像
 * - 菜单过多时由中间 nav 区域滚动（flex-1 + overflow-y-auto），上下区块固定
 */
export function AppSidebar({ collapsed, onNavigate }: AppSidebarProps) {
  // 当前用户可见菜单树（权限过滤后）；侧边栏再剔除 hideInMenu 隐藏节点
  const { data: menuTree, isLoading } = useMenus();
  const items = filterHiddenMenus(menuTree ?? []);

  return (
    /* 内容层宽度瞬切（不加过渡）：外层 aside 负责 width 动画并裁剪溢出，
       本层始终以目标宽度布局——过渡期间不产生逐帧中间态重排与文字折行。
       右边框 / 裁剪 / contain 由 aside 壳承担（见 admin-layout.tsx）。 */
    <div
      className={cn(
        "flex h-full flex-col bg-surface",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* 顶部品牌：Logo + 名称（技术栈下拉） */}
      <SidebarBrand collapsed={collapsed} />

      {/* 中间菜单区域：首次加载（无缓存）显示骨架屏；有数据后渲染真实菜单 */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-2">
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

      {/* 菜单区底部快捷链接 */}
      <SidebarLinks collapsed={collapsed} />

      {/* 底部用户区 */}
      <SidebarUser collapsed={collapsed} />
    </div>
  );
}

import type { ReactNode } from "react";

import { memo, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { Button, Spinner, Typography } from "@heroui/react";

import { AppHeader } from "./components/app-header";
import { AppSidebar } from "./components/app-sidebar";
import { KeepAliveOutlet } from "./components/keep-alive-outlet";
import { TagsBar } from "./components/tags-bar";

import { ForbiddenErrorPage } from "@/components/common/error-pages/forbidden-error";
import { ErrorContent } from "@/components/common/error-content/error-content";
import { MENUS_QUERY_KEY, useMenus } from "@/hooks/use-menus";
import { useTranslation } from "@/i18n";
import { type MenuNode } from "@/lib/api-types";
import { LOGIN_REQUIRED_PATHS } from "@/lib/route-access";
import { collectMenuPaths } from "@/lib/menu-utils";
import { useAuthStore } from "@/stores/auth-store";
import { useDesignThemeStore } from "@/stores/design-theme-store";

/** 登录即可访问的白名单路径集合（Set 查找 O(1)，模块级只建一次）。 */
const LOGIN_REQUIRED_SET = new Set<string>(LOGIN_REQUIRED_PATHS);

/* 异常态覆盖层：组件化取词（跟随语言切换重渲染），
   外层用 memo 包装保持引用稳定，替代原先的模块级 JSX 常量（hoist-jsx） */
const LoadingOverlay = memo(function LoadingOverlay() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 text-muted">
      <Spinner color="current" />
      <Typography className="text-sm" color="muted" type="body-sm">
        {t("layout.overlay.verifyingPermission")}
      </Typography>
    </div>
  );
});

/** 菜单加载失败覆盖层：区分背景的全尺寸容器 + ErrorContent + 重试按钮 */
const ErrorOverlay = memo(function ErrorOverlay() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-separator bg-surface">
      <ErrorContent
        action={
          <Button
            size="sm"
            variant="outline"
            onPress={() => {
              void queryClient.refetchQueries({
                queryKey: MENUS_QUERY_KEY,
                exact: true,
              });
            }}
          >
            {t("common.retry")}
          </Button>
        }
        description={t("layout.overlay.permissionCheckFailedDesc")}
        title={t("layout.overlay.permissionCheckFailed")}
      />
    </div>
  );
});

/**
 * Admin 双栏布局：
 * - 桌面（md+）：左侧 256px 侧边栏（可折叠为图标栏），右侧顶部 64px + 主体内容
 * - 移动端（<md）：不显示侧边栏，点击顶栏按钮用 Drawer 弹出侧边栏
 *   （Drawer 与其触发按钮同在 AppHeader 内，满足 HeroUI Trigger anatomy）
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

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const showTabs = useDesignThemeStore((s) => s.showTabs);
  const { data: menuTree, isLoading, isError } = useMenus();
  const { pathname } = useLocation();

  // 可达路径集合：由菜单树派生，仅菜单变化时重算
  const allowedPaths = useMemo(
    () =>
      menuTree ? collectMenuPaths(menuTree as MenuNode[]) : new Set<string>(),
    [menuTree],
  );

  // 未登录双保险（beforeLoad 已保证，正常不会到这）
  if (!isAuthenticated) return null;

  // 白名单：登录即可访问，不参与菜单权限校验
  const isWhitelisted = LOGIN_REQUIRED_SET.has(pathname);

  // 主体区异常态覆盖层（loading / 校验失败 / 403）：
  // overlay 非空时 KeepAliveOutlet 实例池保持挂载（全部转 hidden 保活），
  // 异常内容渲染于其上——恢复后原页面状态无损，不再销毁保活。
  let overlay: ReactNode = null;

  if (isLoading || (menuTree === undefined && !isError)) {
    // 菜单未就绪（首次请求中，且无旧数据）→ loading
    overlay = <LoadingOverlay />;
  } else if (isError) {
    // 加载失败：提示失败，不误跳 403
    overlay = <ErrorOverlay />;
  } else {
    // 菜单已就绪：非白名单路径做权限校验
    const forbidden = !isWhitelisted && !allowedPaths.has(pathname);

    // 无权限：主体区替换为 403（URL 不变，避免闪跳；侧边栏保留，
    // 用户可直接切换其它菜单离开）
    if (forbidden) overlay = <ForbiddenErrorPage />;
  }

  // 业务页：KeepAliveOutlet 统一承担路由呈现（实例池保活）、路由过渡
  // 动画编排（VT + flushSync，只作用 main-content 区域）与异常覆盖层。
  const body = <KeepAliveOutlet overlay={overlay} />;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* 桌面侧边栏壳：
          - width 过渡承担折叠动画（布局属性无法避免 reflow，故由内层配合）；
          - overflow-hidden 裁剪内容瞬切的溢出（内容宽度在 AppSidebar 内瞬切，
            避免中间态逐帧文字折行/截断的重排抖动）；
          - contain:layout/paint/style 把侧边栏内部的样式/布局/绘制变化圈在
            自身子树内，不波及右侧布局树；
          - transform-gpu 提升为独立合成层，重绘范围进一步隔离。 */}
      <aside
        className={`hidden shrink-0 transform-gpu flex-col overflow-hidden border-r border-separator transition-[width] duration-200 ease-out [contain:layout_paint_style] md:flex ${collapsed ? "w-16" : "w-64"}`}
      >
        <AppSidebar collapsed={collapsed} />
      </aside>

      {/* 右侧区域：顶部 64px + 主体 */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
        />
        {/* 多标签页栏（偏好设置可关；仅隐藏 UI，标签数据照常维护） */}
        {showTabs && <TagsBar />}
        {/* 主体内容：指定 view-transition-name 使路由过渡动画只作用于该区域
            （布局/侧边栏/顶栏不参与过渡，见 styles/route-transitions.css）。
            data-vt-name 供主题切换动画临时摘名（见 transition-direction.ts）。
            滚动统一由本容器承担（滚动条贴合主体区边缘）；KeepAliveOutlet
            在每次页面切换完成后会将滚动位置重置到顶部。 */}
        <main
          className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 [view-transition-name:main-content]"
          data-vt-name="main-content"
        >
          {body}
        </main>
      </div>
    </div>
  );
}

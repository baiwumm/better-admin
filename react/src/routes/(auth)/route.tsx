import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Chip, Typography } from "@heroui/react";

import { useResolvedTheme } from "@/stores/design-theme-store";
import { LanguageSwitcher } from "@/layouts/components/language-switcher";
import { ThemeSettingsDrawer } from "@/layouts/components/theme-settings-drawer";
import { ENV } from "@/lib/env";

import logo from "/logo.svg";
import logoDark from "/logo-dark.svg";

/** 品牌区 4 个特性 chip（多技术栈 + 关键能力） */
const BRAND_CHIPS = [
  "React · Vue · Next · Nuxt",
  "RBAC 权限模型",
  "PostgreSQL · Drizzle",
  "Vercel 部署",
] as const;

export const Route = createFileRoute("/(auth)")({
  // 已登录用户访问任一认证页（登录 / 注册 / 忘记密码…）→ 直接回首页
  beforeLoad: ({ context }) => {
    if (context.auth.getState().isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: AuthPageLayout,
});

/**
 * 认证页统一布局：
 * 整页格子背景 + 光晕、左栏品牌区（桌面）、右侧表单卡片、页脚版权。
 * 各认证页只提供卡片内部的标题区与表单，通过 <Outlet /> 注入。
 */
function AuthPageLayout() {
  // 实际生效的明暗外观（来自 design-theme-store，跨组件一致）
  const theme = useResolvedTheme();

  return (
    // 唯一高度容器：锁定 h-dvh（100dvh 不支持时回退 100vh）+ overflow-hidden，
    // 整页任何断点都不出现滚动条；内容超高时由表单区内部消化；
    // 页面级格子底纹由 .sign-in-page 统一绘制，左右无分界
    <div className="sign-in-page relative flex h-screen w-full flex-col overflow-hidden bg-background text-foreground supports-[height:100dvh]:h-dvh">
      {/* 氛围光晕：2 个柔光球（缓慢呼吸漂移），基于整页绝对定位 */}
      <div aria-hidden className="sign-in-glow sign-in-glow--a" />
      <div aria-hidden className="sign-in-glow sign-in-glow--b" />

      {/* 右上角入口组：语言切换 + 偏好设置（移动端压在页头，桌面端落在表单区上方） */}
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeSettingsDrawer />
      </div>

      <div className="grid w-full min-h-0 flex-1 grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
        {/* ============================================================
            左：品牌区（桌面 lg+ 与右栏等高；移动端仅作 Logo + 标题页头）
            ============================================================ */}
        <aside
          className="
            sign-in-fade-up
            relative flex w-full min-h-0 flex-col justify-between
            gap-6 p-6 sm:p-8 lg:p-12
          "
        >
          {/* 顶部：品牌头 */}
          <div className="relative z-10 flex items-center gap-2.5">
            <img
              alt={ENV.appName}
              className="size-8 rounded-lg shadow-sm lg:size-9"
              src={theme === "dark" ? logoDark : logo}
            />
            <Typography
              className="text-base font-semibold tracking-tight"
              type="h2"
            >
              {ENV.appName}
            </Typography>
          </div>

          {/* 中部：Slogan + 描述 + Chip（仅桌面端展示） */}
          <div className="relative z-10 hidden flex-1 flex-col justify-center py-8 lg:flex">
            <Typography
              className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
              type="h1"
            >
              一套产品，四种实现
            </Typography>
            <Typography className="mt-4" color="muted" type="body-sm">
              {ENV.appDesc}
            </Typography>
            <Typography className="mt-2 max-w-md" color="muted" type="body-sm">
              用
              React、Vue、Next.js、Nuxt，四种现代技术栈，共同构建一套统一的产品、UI
              与业务逻辑。
            </Typography>

            {/* 特性 Chip 行 */}
            <div className="mt-8 flex flex-wrap gap-2">
              {BRAND_CHIPS.map((label) => (
                <Chip
                  key={label}
                  className="border border-separator/60 bg-surface/60 backdrop-blur"
                  size="sm"
                  variant="secondary"
                >
                  {label}
                </Chip>
              ))}
            </div>
          </div>

          {/* 底部：桌面端安全提示（移动端隐藏，避免撑高 brand 区） */}
          <div className="relative z-10 hidden items-center gap-2 text-xs text-muted lg:flex">
            <span>端到端鉴权 · JWT · HttpOnly Refresh</span>
          </div>
        </aside>

        {/* ============================================================
            右：表单区（背景由页面级格子统一提供；
            极端矮屏内容超高时内部滚动消化，滚动条不可见）
            ============================================================ */}
        <main className="sign-in-scroll-area relative flex min-h-0 w-full flex-col p-6 sm:p-8 lg:p-12">
          {/* flex-1 撑满：把表单卡片垂直居中，版权贴底 */}
          <div className="relative z-10 flex flex-1 items-center justify-center">
            <Outlet />
          </div>

          {/* 版权：右侧区域底部（仅桌面端；移动端由页面级 footer 接管） */}
          <p className="relative z-10 mt-4 hidden text-center text-xs text-muted lg:block">
            © 2026 by{" "}
            <a
              className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
              href="https://github.com/baiwumm"
              rel="noreferrer"
              target="_blank"
            >
              baiwumm
            </a>
            . All rights reserved.
          </p>
        </main>
      </div>

      {/* 版权：页面级底部（仅移动端，位于表单区之下、整页贴底） */}
      <footer className="relative z-10 pb-4 text-center text-xs text-muted lg:hidden">
        © 2026{" "}
        <a
          className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
          href="https://github.com/baiwumm"
          rel="noreferrer"
          target="_blank"
        >
          baiwumm
        </a>
        . All rights reserved.
      </footer>
    </div>
  );
}

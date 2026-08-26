import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import {
  Button,
  Checkbox,
  Chip,
  FieldError,
  Form,
  InputGroup,
  Label,
  Separator,
  Spinner,
  Surface,
  TextField,
  Typography,
  toast,
  Description,
} from "@heroui/react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useState } from "react";

import { useAuthStore } from "@/stores/auth-store";
import { useResolvedTheme } from "@/stores/design-theme-store";
import { ThemeSettingsDrawer } from "@/layouts/components/theme-settings-drawer";
import { ENV } from "@/lib/env";

import logo from "/logo.svg";
import logoDark from "/logo-dark.svg";

type SignInSearch = {
  redirect?: string;
};

/**
 * 第三方登录图标（lucide-react v1.x 不内置品牌图标，inline SVG 自绘以避免引入新依赖）。
 * 当前均为占位实现：仅做视觉展示与点击 Toast 提示，未接真实 OAuth 流程。
 */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * 登录回跳地址校验：仅允许站内绝对路径（以 / 开头且非协议相对 //），
 * 防止通过 ?redirect=https://evil.com 构造开放重定向。
 */
function isSafeRedirect(target: string): boolean {
  return target.startsWith("/") && !target.startsWith("//");
}

export const Route = createFileRoute("/(auth)/sign-in")({
  validateSearch: (search: Record<string, unknown>): SignInSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: ({ context }) => {
    // 已登录用户再访问登录页 → 直接回首页
    if (context.auth.getState().isAuthenticated) {
      throw redirect({ to: "/" });
    }
  },
  component: SignInPage,
});

/** 品牌区 4 个特性 chip（多技术栈 + 关键能力） */
const BRAND_CHIPS = [
  "React · Vue · Next · Nuxt",
  "RBAC 权限模型",
  "PostgreSQL · Drizzle",
  "Vercel 部署",
] as const;

function SignInPage() {
  const navigate = useNavigate();
  const router = useRouter();
  // 实际生效的明暗外观（来自 design-theme-store，跨组件一致）
  const theme = useResolvedTheme();
  const { redirect: redirectTo } = Route.useSearch();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  // 本地 UI 态：密码显隐 + 记住我（纯 UI 切换，非浮层，useState 安全）
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  // HeroUI Form：原生校验（isRequired + validate）通过后才触发 onSubmit，
  // 字段值经 FormData 读取（非受控，无需 useState 同步每个输入）。
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      await login(username, password);
      toast.success("登录成功，欢迎回来");
      if (redirectTo && isSafeRedirect(redirectTo)) {
        // 站内回跳（href 不受 to 的路由类型约束，SPA 内部导航）
        await router.navigate({ href: redirectTo });
      } else {
        await navigate({ to: "/" });
      }
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "登录失败，请重试");
    }
  };

  return (
    // 唯一高度容器：min-h-dvh + overflow-hidden 兜底入场动画溢出
    <div className="relative flex min-h-dvh w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="grid min-h-dvh w-full flex-1 grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
        {/* ============================================================
            左：品牌区（桌面 lg+ 与右栏等高；移动端作为顶部 Header）
            ============================================================ */}
        <aside
          className="
            sign-in-brand sign-in-fade-up
            relative flex w-full min-h-0 flex-col justify-between
            gap-6 p-6 sm:p-8 lg:p-12
          "
        >
          {/* 氛围光晕：2 个静态柔光球（不漂移，克制） */}
          <div
            aria-hidden
            className="sign-in-brand-glow sign-in-brand-glow--a"
          />
          <div
            aria-hidden
            className="sign-in-brand-glow sign-in-brand-glow--b"
          />

          {/* 顶部：品牌头（移动 + 桌面共用一行） */}
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
            <Description className="mt-4 max-w-md text-base">
              {ENV.appDesc} 用 React、Vue、Next.js、Nuxt 四种现代技术栈，
              共同构建一套统一的产品、UI 与业务逻辑。
            </Description>

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
            右：表单区
            ============================================================ */}
        <main className="relative flex min-h-0 w-full flex-col p-6 pt-14 sm:p-8 sm:pt-16 lg:p-12">
          {/* 偏好设置入口：浮在表单区右上角（桌面端 + 移动端均显示） */}
          <div className="absolute right-4 top-4 z-20">
            <ThemeSettingsDrawer />
          </div>

          {/* flex-1 撑满：把表单卡片垂直居中，版权贴底 */}
          <div className="flex flex-1 items-center justify-center">
            <Surface
              className="
                sign-in-fade-up w-full max-w-sm sm:max-w-md rounded-3xl
                border border-separator bg-surface/80 p-7 shadow-sm
                backdrop-blur sm:p-8
              "
            >
              {/* 标题区 */}
              <div className="mb-7 flex flex-col gap-1.5">
                <Typography
                  className="text-2xl font-bold tracking-tight"
                  type="h1"
                >
                  欢迎回来
                </Typography>
                <Description>请输入账号信息登录后台管理系统</Description>
              </div>

              {/* 登录表单 */}
              <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <TextField
                  isRequired
                  className="sign-in-field"
                  name="username"
                  validate={(value) => (value.trim() ? null : "请输入用户名")}
                >
                  <Label>用户名</Label>
                  <InputGroup variant="secondary">
                    <InputGroup.Prefix>
                      <User
                        aria-hidden
                        className="size-4 text-muted"
                        strokeWidth={1.75}
                      />
                    </InputGroup.Prefix>
                    <InputGroup.Input placeholder="请输入用户名 / 邮箱" />
                  </InputGroup>
                  <FieldError />
                </TextField>

                <TextField
                  isRequired
                  className="sign-in-field"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  validate={(value) => (value ? null : "请输入密码")}
                >
                  <Label>密码</Label>
                  <InputGroup variant="secondary">
                    <InputGroup.Prefix>
                      <Lock
                        aria-hidden
                        className="size-4 text-muted"
                        strokeWidth={1.75}
                      />
                    </InputGroup.Prefix>
                    <InputGroup.Input placeholder="请输入密码" />
                    <InputGroup.Suffix>
                      <Button
                        isIconOnly
                        aria-label={showPassword ? "隐藏密码" : "显示密码"}
                        size="sm"
                        type="button"
                        variant="ghost"
                        onPress={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          <EyeOff
                            aria-hidden
                            className="size-4 text-muted"
                            strokeWidth={1.75}
                          />
                        ) : (
                          <Eye
                            aria-hidden
                            className="size-4 text-muted"
                            strokeWidth={1.75}
                          />
                        )}
                      </Button>
                    </InputGroup.Suffix>
                  </InputGroup>
                  <FieldError />
                </TextField>

                {/* 辅助行：记住我 + 忘记密码（占位，未接真实流程） */}
                <div className="sign-in-field flex items-center justify-between text-sm">
                  <Checkbox
                    isSelected={remember}
                    name="remember"
                    onChange={setRemember}
                  >
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      记住我
                    </Checkbox.Content>
                  </Checkbox>
                </div>

                {/* 提交：isPending 时显示 Spinner（登录结果以 Toast 提示） */}
                <Button
                  fullWidth
                  className="sign-in-submit"
                  isPending={isLoading}
                  type="submit"
                  variant="primary"
                >
                  {({ isPending }) =>
                    isPending ? (
                      <>
                        <Spinner color="current" size="sm" />
                        登录中…
                      </>
                    ) : (
                      "登 录"
                    )
                  }
                </Button>

                {/* 分隔线：或（HeroUI Separator + 文字） */}
                <div className="sign-in-field mt-2 flex items-center gap-3 text-xs text-muted">
                  <Separator className="flex-1" />
                  <Description>Or</Description>
                  <Separator className="flex-1" />
                </div>

                {/* 第三方登录：GitHub + Google（占位，未接真实 OAuth） */}
                <div className="grid gap-3">
                  <Button
                    fullWidth
                    className="sign-in-field"
                    type="button"
                    variant="tertiary"
                    onPress={() => toast.info("GitHub 登录开发中")}
                  >
                    <GithubIcon aria-hidden className="size-4" />
                    GitHub
                  </Button>
                  <Button
                    fullWidth
                    className="sign-in-field"
                    type="button"
                    variant="tertiary"
                    onPress={() => toast.info("Google 登录开发中")}
                  >
                    <GoogleIcon aria-hidden className="size-4" />
                    Google
                  </Button>
                </div>
              </Form>
            </Surface>
          </div>

          {/* 版权：右侧区域底部（在 main 内部，不跨页） */}
          <p className="relative z-10 mt-4 text-center text-xs text-muted">
            © 2026 {ENV.appName}
          </p>
        </main>
      </div>
    </div>
  );
}

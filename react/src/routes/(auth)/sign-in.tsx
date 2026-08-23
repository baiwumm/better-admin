import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  Spinner,
  Surface,
  TextField,
  Typography,
  toast,
  useTheme,
} from "@heroui/react";

import { ROUTE_PATHS } from "@/lib/route-paths";
import { useAuthStore } from "@/stores/auth-store";

import logo from "/logo.svg";
import logoDark from "/logo-dark.svg";

type SignInSearch = {
  redirect?: string;
};

export const Route = createFileRoute("/(auth)/sign-in")({
  validateSearch: (search: Record<string, unknown>): SignInSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: ({ context }) => {
    // 已登录用户再访问登录页 → 直接回首页
    if (context.auth.getState().isAuthenticated) {
      throw redirect({ to: ROUTE_PATHS.dashboard });
    }
  },
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const { theme } = useTheme("system");
  const { redirect: redirectTo } = Route.useSearch();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

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
      if (redirectTo) {
        // 鉴权重定向目标可能是任意路径，整页跳转即可
        window.location.assign(redirectTo);
      } else {
        await navigate({ to: ROUTE_PATHS.dashboard });
      }
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "登录失败，请重试");
    }
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background p-4 text-foreground">
      {/* 登录卡片 */}
      <Surface className="w-full max-w-sm rounded-3xl border border-separator p-8 shadow-sm">
        {/* 品牌区 */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img
            alt="Better Admin"
            className="size-12 rounded-xl"
            src={theme === "dark" ? logoDark : logo}
          />
          <div className="grid gap-1">
            <Typography className="text-2xl font-bold tracking-tight" type="h1">
              欢迎回来
            </Typography>
            <Typography color="muted" type="body-sm">
              登录以继续访问 Better Admin 管理系统
            </Typography>
          </div>
        </div>

        {/* 登录表单 */}
        <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <TextField
            isRequired
            name="username"
            validate={(value) => (value.trim() ? null : "请输入用户名")}
          >
            <Label>用户名</Label>
            <Input placeholder="请输入用户名" variant="secondary" />
            <FieldError />
          </TextField>

          <TextField
            isRequired
            name="password"
            type="password"
            validate={(value) => (value ? null : "请输入密码")}
          >
            <Label>密码</Label>
            <Input placeholder="请输入密码" variant="secondary" />
            <FieldError />
          </TextField>

          {/* 提交：isPending 时显示 Spinner（登录结果以 Toast 提示） */}
          <Button
            fullWidth
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
        </Form>

        <p className="mt-8 text-center text-xs text-muted">
          © 2026 Better Admin
        </p>
      </Surface>
    </div>
  );
}

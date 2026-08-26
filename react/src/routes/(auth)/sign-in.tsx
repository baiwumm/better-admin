import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
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
  Description,
} from "@heroui/react";

import { useAuthStore } from "@/stores/auth-store";
import { useResolvedTheme } from "@/stores/design-theme-store";
import { ENV } from "@/lib/env";

import logo from "/logo.svg";
import logoDark from "/logo-dark.svg";

type SignInSearch = {
  redirect?: string;
};

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

function SignInPage() {
  const navigate = useNavigate();
  const router = useRouter();
  // 实际生效的明暗外观（来自 design-theme-store，跨组件一致）
  const theme = useResolvedTheme();
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
    <div className="flex min-h-dvh w-full items-center justify-center bg-background p-4 text-foreground">
      {/* 登录卡片 */}
      <Surface className="w-full max-w-sm rounded-3xl border border-separator p-8 shadow-sm">
        {/* 品牌区 */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex gap-3 items-center">
            <img
              alt={ENV.appName}
              className="size-10 rounded-xl"
              src={theme === "dark" ? logoDark : logo}
            />
            <Typography className="text-2xl font-bold tracking-tight" type="h1">
              {ENV.appName}
            </Typography>
          </div>
          <Description>{ENV.appDesc}</Description>
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
          © {new Date().getFullYear()} {ENV.appName}
        </p>
      </Surface>
    </div>
  );
}

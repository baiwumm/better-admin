"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Button,
  Checkbox,
  FieldError,
  Form,
  InputGroup,
  Label,
  Separator,
  Spinner,
  TextField,
  Typography,
  toast,
  Description,
  Surface,
} from "@heroui/react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useState } from "react";

import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/stores/auth-store";

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

/**
 * 登录页：仅卡片内部（标题区 + 表单）。
 * 页面外壳（格子背景 / 品牌区 / 版权）由 (auth)/layout.tsx 统一提供。
 * 移植自 React 版 (auth)/sign-in.tsx；导航与回跳改用 next/navigation。
 */
export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? undefined;
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { t } = useTranslation();

  // 本地 UI 态：密码显隐 + 记住我（记住我将随登录提交，控制长短会话 Cookie 档位）
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
      await login(username, password, remember);
      toast.success(
        remember ? t("auth.signIn.remembered") : t("auth.signIn.welcomeBack"),
      );

      if (redirectTo && isSafeRedirect(redirectTo)) {
        // 站内回跳（proxy 携带的 ?redirect= 原路径）
        router.push(redirectTo);
      } else {
        router.push("/");
      }
      // 登录后整站路由都需按新会话重新渲染，主动刷新一次确保 RSC 数据一致
      router.refresh();
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t("auth.signIn.failed"),
      );
    }
  };

  return (
    <Surface
      className="
                    sign-in-card w-full max-w-sm sm:max-w-md rounded-3xl
                    border border-separator bg-surface/80 p-6 shadow-sm
                    backdrop-blur sm:p-8
                  "
    >
      {/* 标题区 */}
      <div className="mb-7 flex flex-col gap-2">
        <Typography className="text-2xl font-bold tracking-tight" type="h1">
          {t("auth.signIn.welcome")}
        </Typography>
        <Description>{t("auth.signIn.subtitle")}</Description>
      </div>

      {/* 登录表单 */}
      <Form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          isRequired
          className="sign-in-field"
          name="username"
          validate={(value) =>
            value.trim() ? null : t("auth.signIn.usernameRequired")
          }
        >
          <Label>{t("auth.signIn.username")}</Label>
          <InputGroup className="sign-in-input-group" variant="secondary">
            <InputGroup.Prefix>
              <User
                aria-hidden
                className="size-4 text-muted"
                strokeWidth={1.75}
              />
            </InputGroup.Prefix>
            <InputGroup.Input
              placeholder={t("auth.signIn.usernamePlaceholder")}
            />
          </InputGroup>
          <FieldError />
        </TextField>

        <TextField
          isRequired
          className="sign-in-field"
          name="password"
          type={showPassword ? "text" : "password"}
          validate={(value) =>
            value ? null : t("auth.signIn.passwordRequired")
          }
        >
          <Label>{t("auth.signIn.password")}</Label>
          <InputGroup className="sign-in-input-group" variant="secondary">
            <InputGroup.Prefix>
              <Lock
                aria-hidden
                className="size-4 text-muted"
                strokeWidth={1.75}
              />
            </InputGroup.Prefix>
            <InputGroup.Input
              placeholder={t("auth.signIn.passwordPlaceholder")}
            />
            <InputGroup.Suffix>
              <Button
                isIconOnly
                aria-label={
                  showPassword
                    ? t("auth.signIn.hidePassword")
                    : t("auth.signIn.showPassword")
                }
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

        {/* 辅助行：记住我（随登录提交；勾选后服务端签发 30d 长效 Cookie） */}
        <div className="sign-in-field flex items-center text-sm">
          <Checkbox
            isSelected={remember}
            name="remember"
            variant="secondary"
            onChange={setRemember}
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {t("auth.signIn.rememberMe")}
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
                {t("auth.signIn.submitting")}
              </>
            ) : (
              t("auth.signIn.submit")
            )
          }
        </Button>

        {/* 分隔线：或（HeroUI Separator + 文字） */}
        <div className="sign-in-field mt-2 flex items-center gap-3 text-xs text-muted">
          <Separator className="flex-1" />
          <Description>{t("auth.signIn.or")}</Description>
          <Separator className="flex-1" />
        </div>

        {/* 第三方登录：GitHub + Google（单行排列；占位未接真实 OAuth） */}
        <div className="flex flex-col gap-3">
          <Button
            fullWidth
            className="sign-in-field sign-in-oauth"
            type="button"
            variant="tertiary"
            onPress={() => toast.info(t("auth.signIn.githubDeveloping"))}
          >
            <GithubIcon aria-hidden className="size-4" />
            GitHub
          </Button>
          <Button
            fullWidth
            className="sign-in-field sign-in-oauth"
            type="button"
            variant="tertiary"
            onPress={() => toast.info(t("auth.signIn.googleDeveloping"))}
          >
            <GoogleIcon aria-hidden className="size-4" />
            Google
          </Button>
        </div>
      </Form>
    </Surface>
  );
}

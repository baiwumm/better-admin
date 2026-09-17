"use client";

import type { DemoLoginKind } from "@/lib/api-types";

import { useSearchParams } from "next/navigation";
import { useRouter } from "@bprogress/next/app";
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
import { Eye, EyeOff, Lock, ShieldCheck, Dices, User } from "lucide-react";
import { useEffect, useState } from "react";

import { useTranslation } from "@/i18n";
import { ApiClientError } from "@/lib/api-client";
import { ENV } from "@/lib/env";
import { useAuthStore } from "@/stores/auth-store";
import { useLanguageStore } from "@/stores/language-store";

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
  const demoLogin = useAuthStore((s) => s.demoLogin);
  const isLoading = useAuthStore((s) => s.isLoading);
  const { t } = useTranslation();

  // 浏览器标签页标题：语言切换即时刷新（服务端 metadata 只在请求时计算，
  // 本页在 admin-shell 之外不经 usePageTitle）。key 与 sign-in layout 的
  // generateMetadata 同源，终态字符串一致。
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    document.title = `${t("auth.signIn.title")} - ${ENV.appName}`;
  }, [t, language]);

  // 本地 UI 态：密码显隐 + 记住我（记住我将随登录提交，控制长短会话 Cookie 档位）
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  // 正在进行的演示快捷登录种类（决定哪个按钮显示 pending；null = 非演示登录）
  const [demoKind, setDemoKind] = useState<DemoLoginKind | null>(null);

  /** 登录成功后的站内回跳 + 整站刷新（RSC 按新会话重渲染，与密码登录共用）。 */
  const finishSignIn = () => {
    if (redirectTo && isSafeRedirect(redirectTo)) {
      // 站内回跳（proxy 携带的 ?redirect= 原路径）
      router.push(redirectTo);
    } else {
      router.push("/");
    }
    // 登录后整站路由都需按新会话重新渲染，主动刷新一次确保 RSC 数据一致
    router.refresh();
  };

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
      finishSignIn();
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t("auth.signIn.failed"),
      );
    }
  };

  /**
   * 演示快捷登录（契约 v1.10.0 demo-login）：不接触密码，服务端随机签发演示账号。
   * 成功 toast 仅带姓名（计划 §3.3 拍板：roles 为角色 code，对访客无意义，不展示）；
   * 404 覆盖 DEMO_MODE 关闭（NOT_FOUND）与候选池为空（DEMO_USER_NOT_AVAILABLE），统一提示不可用。
   */
  const handleDemoLogin = async (kind: DemoLoginKind) => {
    setDemoKind(kind);
    try {
      const user = await demoLogin(kind);

      toast.success(t("auth.signIn.demoWelcome", { name: user.displayName }));
      finishSignIn();
    } catch (error) {
      const message =
        error instanceof ApiClientError && error.status === 404
          ? t("auth.signIn.demoUnavailable")
          : error instanceof Error
            ? error.message
            : t("auth.signIn.failed");

      toast.danger(message);
    } finally {
      setDemoKind(null);
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
              autoComplete="username"
              placeholder={t("auth.signIn.usernamePlaceholder")}
              spellCheck={false}
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
              autoComplete="current-password"
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

        {/* 提交：isPending 时显示 Spinner（登录结果以 Toast 提示）；演示登录进行中仅禁用 */}
        <Button
          fullWidth
          className="sign-in-submit"
          isDisabled={isLoading && demoKind !== null}
          isPending={isLoading && demoKind === null}
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

        {/* 演示快捷登录：管理员 / 随机用户（免密，DEMO_MODE 关闭时提示不可用） */}
        <div className="flex flex-col gap-3">
          <Button
            fullWidth
            className="sign-in-field sign-in-demo"
            isDisabled={isLoading && demoKind !== "admin"}
            isPending={demoKind === "admin"}
            type="button"
            variant="tertiary"
            onPress={() => handleDemoLogin("admin")}
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <ShieldCheck aria-hidden className="size-4" />
                )}
                {t("auth.signIn.demoAdmin")}
              </>
            )}
          </Button>
          <Button
            fullWidth
            className="sign-in-field sign-in-demo"
            isDisabled={isLoading && demoKind !== "random"}
            isPending={demoKind === "random"}
            type="button"
            variant="tertiary"
            onPress={() => handleDemoLogin("random")}
          >
            {({ isPending }) => (
              <>
                {isPending ? (
                  <Spinner color="current" size="sm" />
                ) : (
                  <Dices aria-hidden className="size-4" />
                )}
                {t("auth.signIn.demoRandom")}
              </>
            )}
          </Button>
        </div>
      </Form>
    </Surface>
  );
}

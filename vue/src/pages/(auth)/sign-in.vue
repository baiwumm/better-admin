<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "@nuxt/ui/composables";
import type { AuthFormField, FormSubmitEvent } from "@nuxt/ui";

import { getErrorMessage } from "@/i18n";
import { ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 登录页（对齐 React 端 sign-in：标题区 + 表单 + 记住我 + 第三方占位）。
 * 页面外壳（格子背景 / 品牌区 / 版权）由 AuthLayout 统一提供；
 * 表单使用 Nuxt UI UAuthForm（字段/校验/提交一体）。
 * - 校验：validate 函数（非空校验，与 React zod 规则一致；vee-validate 引入延后评审）
 * - 登录失败：Toast 提示（错误码本地化映射，与 React 端同款；5xx 已由
 *   AppShell 的统一请求错误桥 Toast，此处处理登录特有的 4xx 业务码）
 * - 第三方登录：lucide 无品牌图标，内联 SVG 自绘（与 React 端同款 path），
 *   点击以 Toast 提示占位（未接真实 OAuth）
 * - redirect 回跳：isSafeRedirect 校验防开放重定向
 * - rememberMe：服务端签发长效 refreshToken 且本地持久化（契约 v1.2）
 */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

const redirectTarget = computed(() => {
  const redirect = route.query.redirect;

  return typeof redirect === "string" ? redirect : undefined;
});

/** 登录回跳地址校验：仅允许站内绝对路径（以 / 开头且非协议相对 //）。 */
function isSafeRedirect(target: string): boolean {
  return target.startsWith("/") && !target.startsWith("//");
}

const fields = computed<AuthFormField[]>(() => [
  {
    name: "username",
    type: "text",
    label: t("auth.signIn.username"),
    placeholder: t("auth.signIn.usernamePlaceholder"),
    required: true,
    icon: "i-lucide-user",
    autocomplete: "username",
  },
  {
    name: "password",
    type: "password",
    label: t("auth.signIn.password"),
    placeholder: t("auth.signIn.passwordPlaceholder"),
    required: true,
    autocomplete: "current-password",
  },
  {
    name: "remember",
    type: "checkbox",
    label: t("auth.signIn.rememberMe"),
    defaultValue: true,
  },
]);

/** 第三方登录占位：仅用于驱动 UAuthForm 的「或」分隔线渲染（按钮由插槽自绘）。 */
const providers = computed(() => [{ label: "GitHub" }, { label: "Google" }]);

function oauthPlaceholder(key: "github" | "google") {
  toast.add({
    color: "info",
    duration: 3000,
    title: t(`auth.signIn.${key}Developing`),
  });
}

/** 非空校验（规则与 React zod schema 一一对应）。 */
function validate(state: Partial<{ username: string; password: string }>) {
  const errors: { name: string; message: string }[] = [];

  if (!state.username?.trim()) {
    errors.push({
      name: "username",
      message: t("auth.signIn.usernameRequired"),
    });
  }

  if (!state.password) {
    errors.push({
      name: "password",
      message: t("auth.signIn.passwordRequired"),
    });
  }

  return errors;
}

const submitButton = computed(() => ({
  label: auth.isLoading ? t("auth.signIn.submitting") : t("auth.signIn.submit"),
}));

async function onSubmit(
  event: FormSubmitEvent<{
    username: string;
    password: string;
    remember?: boolean;
  }>,
) {
  try {
    await auth.login(
      event.data.username.trim(),
      event.data.password,
      event.data.remember ?? false,
    );

    if (redirectTarget.value && isSafeRedirect(redirectTarget.value)) {
      await router.replace(redirectTarget.value);
    } else {
      await router.replace("/");
    }
  } catch (error) {
    // 登录失败以 Toast 呈现（错误码 → 本地化文案，与 React 端同款映射）
    const code = error instanceof ApiClientError ? error.code : undefined;
    const fallback = t("auth.signIn.failed");
    const message =
      code === "INVALID_CREDENTIALS"
        ? getErrorMessage("errors.auth.invalidCredentials", fallback)
        : code === "USER_DISABLED"
          ? getErrorMessage("errors.auth.userDisabled", fallback)
          : error instanceof Error
            ? error.message
            : fallback;

    toast.add({ color: "error", duration: 5000, title: message });
  }
}
</script>

<template>
  <UPageCard
    class="sign-in-card w-full max-w-sm rounded-3xl shadow-sm backdrop-blur sm:max-w-md"
    variant="outline"
  >
    <UAuthForm
      :fields="fields"
      :providers="providers"
      :separator="t('auth.signIn.or')"
      :submit="submitButton"
      :validate="validate"
      :loading="auth.isLoading"
      :title="t('auth.signIn.welcome')"
      :description="t('auth.signIn.subtitle')"
      @submit="onSubmit"
    >
      <!-- 第三方登录：lucide 无品牌图标，内联 SVG 自绘（与 React 端同款 path） -->
      <template #providers>
        <UButton
          block
          color="neutral"
          variant="outline"
          label="GitHub"
          @click="oauthPlaceholder('github')"
        >
          <template #leading>
            <svg
              aria-hidden
              class="size-4"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
              />
            </svg>
          </template>
        </UButton>
        <UButton
          block
          color="neutral"
          variant="outline"
          label="Google"
          @click="oauthPlaceholder('google')"
        >
          <template #leading>
            <svg
              aria-hidden
              class="size-4"
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
          </template>
        </UButton>
      </template>
    </UAuthForm>
  </UPageCard>
</template>

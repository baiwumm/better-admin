<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "@nuxt/ui/composables";
import type { AuthFormField, FormSubmitEvent } from "@nuxt/ui";

import { getErrorMessage } from "@/i18n";
import { ApiClientError } from "@/lib/api-client";
import type { DemoLoginKind } from "@/lib/api-types";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 登录页（对齐 React 端 sign-in：标题区 + 表单 + 记住我 + 演示快捷登录）。
 * 页面外壳（格子背景 / 品牌区 / 版权）由 AuthLayout 统一提供；
 * 表单使用 Nuxt UI UAuthForm（字段/校验/密码显隐一体）。
 * - 提交区（提交按钮 / 「或」分隔线 / 快捷登录按钮）通过 #submit 插槽自绘：
 *   UAuthForm 内置 providers 固定渲染在表单字段上方，与 React 基准
 *   （快捷登录按钮在表单下方）不一致，且该顺序不受 ui 属性控制；
 *   #submit 插槽渲染在 UForm 内部、字段之后，DOM 顺序（含 Tab 焦点顺序）
 *   与 React 端完全一致，字段进场 stagger 动画也因此可行（见 sign-in.css）
 * - 标题/副标题字号字重经 ui 覆盖对齐 React（text-2xl bold / text-xs muted）
 * - 校验：validate 函数（非空校验，与 React zod 规则一致；vee-validate 引入延后评审）
 * - 登录失败：Toast 提示（错误码本地化映射，与 React 端同款；5xx 已由
 *   AppShell 的统一请求错误桥 Toast，此处处理登录特有的 4xx 业务码）
 * - 演示快捷登录（契约 v1.10.0 demo-login）：「管理员」「随机用户」两按钮免密
 *   登录，固定短会话；成功 toast 仅带姓名（计划 §3.3 拍板：roles 为角色 code，不展示）；
 *   404 覆盖 DEMO_MODE 关闭与候选池为空，统一提示不可用
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

// 正在进行的演示快捷登录种类（决定哪个按钮 loading；null = 非演示登录）
const demoKind = ref<DemoLoginKind | null>(null);

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
    icon: "i-lucide-lock",
    autocomplete: "current-password",
  },
  {
    name: "remember",
    type: "checkbox",
    label: t("auth.signIn.rememberMe"),
    defaultValue: true,
  },
]);

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
  label:
    auth.isLoading && !demoKind.value
      ? t("auth.signIn.submitting")
      : t("auth.signIn.submit"),
}));

/** 登录成功后的站内回跳（与密码登录共用）。 */
async function finishSignIn() {
  if (redirectTarget.value && isSafeRedirect(redirectTarget.value)) {
    await router.replace(redirectTarget.value);
  } else {
    await router.replace("/");
  }
}

/**
 * 演示快捷登录（契约 v1.10.0 demo-login）：不接触密码，服务端随机签发演示账号。
 * 404 覆盖 DEMO_MODE 关闭（NOT_FOUND）与候选池为空（DEMO_USER_NOT_AVAILABLE），
 * 统一提示不可用；其余错误展示后端 message。
 */
async function handleDemoLogin(kind: DemoLoginKind) {
  demoKind.value = kind;

  try {
    const user = await auth.demoLogin(kind);

    toast.add({
      color: "success",
      title: t("auth.signIn.demoWelcome", { name: user.displayName }),
    });
    await finishSignIn();
  } catch (error) {
    const message =
      error instanceof ApiClientError && error.status === 404
        ? t("auth.signIn.demoUnavailable")
        : error instanceof Error
          ? error.message
          : t("auth.signIn.failed");

    toast.add({ color: "error", title: message });
  } finally {
    demoKind.value = null;
  }
}

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

    // 登录成功 Toast（对齐 React：勾选记住我 → remembered，否则 welcomeBack）
    toast.add({
      color: "success",
      title: event.data.remember
        ? t("auth.signIn.remembered")
        : t("auth.signIn.welcomeBack"),
    });

    await finishSignIn();
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

    toast.add({ color: "error", title: message });
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
      :validate="validate"
      :loading="auth.isLoading"
      :title="t('auth.signIn.welcome')"
      :description="t('auth.signIn.subtitle')"
      :ui="{
        // 标题区对齐 React：左对齐 + 标题间距 8px（覆盖默认 text-center / mt-1）
        header: 'gap-2 text-left',
        // 标题对齐 React Typography h1（覆盖默认 text-xl font-semibold）
        title: 'text-2xl font-bold tracking-tight',
        // 副标题对齐 HeroUI Description 默认（text-xs muted；覆盖默认 text-base）
        description: 'mt-0 text-xs',
        // 表单间距对齐 React Form gap-4（覆盖默认 space-y-5）
        form: 'flex flex-col',
      }"
      @submit="onSubmit"
    >
      <!-- 提交区（UForm 内部、字段之后，顺序与 React 一致） -->
      <template #submit>
        <!-- 提交：loading 时按钮内置 Spinner（登录结果以 Toast 提示）；演示登录进行中仅禁用 -->
        <UButton
          block
          class="sign-in-submit"
          :label="submitButton.label"
          :loading="auth.isLoading && !demoKind"
          :disabled="auth.isLoading && !!demoKind"
          type="submit"
        />

        <!-- 分隔线：或 -->
        <div class="sign-in-field">
          <USeparator
            :label="t('auth.signIn.or')"
            :ui="{ label: 'font-normal text-muted text-xs' }"
          />
        </div>

        <!-- 演示快捷登录：管理员 / 随机用户（免密，DEMO_MODE 关闭时提示不可用） -->
        <div class="flex flex-col gap-3">
          <UButton
            block
            class="sign-in-field sign-in-demo"
            color="neutral"
            variant="outline"
            :label="t('auth.signIn.demoAdmin')"
            icon="i-lucide-shield-check"
            :loading="demoKind === 'admin'"
            :disabled="auth.isLoading && demoKind !== 'admin'"
            @click="handleDemoLogin('admin')"
          />
          <UButton
            block
            class="sign-in-field sign-in-demo"
            color="neutral"
            variant="outline"
            :label="t('auth.signIn.demoRandom')"
            icon="i-lucide-dices"
            :loading="demoKind === 'random'"
            :disabled="auth.isLoading && demoKind !== 'random'"
            @click="handleDemoLogin('random')"
          />
        </div>
      </template>
    </UAuthForm>
  </UPageCard>
</template>

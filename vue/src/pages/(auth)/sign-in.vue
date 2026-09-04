<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "@nuxt/ui/composables";

import { useAuthStore } from "@/stores/auth-store";

/**
 * 登录页（对齐 React 端 sign-in 结构：标题区 + 受控表单 + 记住我 + 第三方占位）。
 * - 受控表单：本地 refs + 非空校验（M1 起统一 vee-validate + zod）
 * - redirect 回跳：isSafeRedirect 校验防开放重定向
 * - rememberMe：服务端签发长效 refreshToken 且本地持久化（契约 v1.2）
 */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const auth = useAuthStore();

const username = ref("");
const password = ref("");
const remember = ref(true);
const showPassword = ref(false);
const fieldErrors = ref({ username: "", password: "" });

const redirectTarget = computed(() => {
  const redirect = route.query.redirect;

  return typeof redirect === "string" ? redirect : undefined;
});

/** 登录回跳地址校验：仅允许站内绝对路径（以 / 开头且非协议相对 //）。 */
function isSafeRedirect(target: string): boolean {
  return target.startsWith("/") && !target.startsWith("//");
}

function toastInfo(title: string) {
  toast.add({ color: "info", duration: 3000, title });
}

async function onSubmit() {
  const errors = { username: "", password: "" };

  if (!username.value.trim()) {
    errors.username = t("auth.signIn.usernameRequired");
  }

  if (!password.value) {
    errors.password = t("auth.signIn.passwordRequired");
  }

  fieldErrors.value = errors;

  if (errors.username || errors.password) return;

  try {
    await auth.login(username.value, password.value, remember.value);

    toast.add({
      color: "success",
      duration: 3000,
      title: remember.value
        ? t("auth.signIn.remembered")
        : t("auth.signIn.welcomeBack"),
    });

    if (redirectTarget.value && isSafeRedirect(redirectTarget.value)) {
      await router.replace(redirectTarget.value);
    } else {
      await router.replace("/");
    }
  } catch (error) {
    toast.add({
      color: "error",
      duration: 5000,
      title: error instanceof Error ? error.message : t("auth.signIn.failed"),
    });
  }
}
</script>

<template>
  <div
    class="grid min-h-svh place-items-center bg-elevated/50 p-4 dark:bg-muted/25"
  >
    <UCard class="w-full max-w-sm sm:max-w-md" variant="subtle">
      <div class="mb-7 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <UIcon class="size-6 text-primary" name="i-lucide-layout-dashboard" />
          <h1 class="text-2xl font-bold tracking-tight">
            {{ t("auth.signIn.welcome") }}
          </h1>
        </div>
        <p class="text-muted text-sm">{{ t("auth.signIn.subtitle") }}</p>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
        <UFormField :error="fieldErrors.username || undefined">
          <UInput
            v-model="username"
            :placeholder="t('auth.signIn.usernamePlaceholder')"
            class="w-full"
            icon="i-lucide-user"
            name="username"
          />
        </UFormField>

        <UFormField :error="fieldErrors.password || undefined">
          <UInput
            v-model="password"
            :placeholder="t('auth.signIn.passwordPlaceholder')"
            class="w-full"
            icon="i-lucide-lock"
            :type="showPassword ? 'text' : 'password'"
            name="password"
          >
            <template #trailing>
              <UButton
                :aria-label="
                  showPassword
                    ? t('auth.signIn.hidePassword')
                    : t('auth.signIn.showPassword')
                "
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                color="neutral"
                size="xs"
                variant="ghost"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <UCheckbox v-model="remember" :label="t('auth.signIn.rememberMe')" />

        <UButton
          :label="
            auth.isLoading
              ? t('auth.signIn.submitting')
              : t('auth.signIn.submit')
          "
          :loading="auth.isLoading"
          block
          type="submit"
        />

        <div class="mt-2 flex items-center gap-3 text-muted text-xs">
          <USeparator class="flex-1" />
          {{ t("auth.signIn.or") }}
          <USeparator class="flex-1" />
        </div>

        <div class="flex flex-col gap-3">
          <UButton
            :label="`GitHub`"
            class="justify-center"
            color="neutral"
            icon="i-simple-icons-github"
            variant="subtle"
            @click="toastInfo(t('auth.signIn.githubDeveloping'))"
          />
          <UButton
            :label="`Google`"
            class="justify-center"
            color="neutral"
            icon="i-simple-icons-google"
            variant="subtle"
            @click="toastInfo(t('auth.signIn.googleDeveloping'))"
          />
        </div>
      </form>
    </UCard>
  </div>
</template>

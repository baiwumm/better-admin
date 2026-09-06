<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { usePreferredDark, useColorMode } from "@vueuse/core";

import { ENV } from "@/lib/env";
import LanguageSwitch from "@/components/layout/LanguageSwitch.vue";
import ThemeSwitch from "@/components/layout/ThemeSwitch.vue";

/**
 * 认证页统一布局（对应 React 端 (auth)/route.tsx 外壳）：
 * 整页格子背景 + 光晕、左栏品牌区（桌面）、右侧表单卡片区（RouterView 注入）、
 * 页脚版权。各认证页（登录 / 后续注册、忘记密码）只提供卡片内部内容。
 * 右上角入口组对齐 React：语言切换 + 主题切换。
 */
const { t } = useI18n();

// 实际生效的明暗外观（auto 跟随系统，与 <html> dark 类一致）
const colorMode = useColorMode();
const prefersDark = usePreferredDark();
const resolvedTheme = computed(() =>
  colorMode.value === "auto"
    ? prefersDark.value
      ? "dark"
      : "light"
    : colorMode.value,
);

const appName = computed(() => ENV.appName);
const slogan = computed(() => t("auth.brand.slogan"));

/** 品牌区 4 个特性 chip（多技术栈 + 关键能力；与 React 端 BRAND_CHIPS 一致） */
const BRAND_CHIPS = [
  "auth.brand.chip.stacks",
  "auth.brand.chip.rbac",
  "auth.brand.chip.storage",
  "auth.brand.chip.deploy",
] as const;
</script>

<script lang="ts">
export default { name: "AuthLayout" };
</script>

<template>
  <!-- 唯一高度容器：锁定 h-dvh（100dvh 不支持时回退 100vh）+ overflow-hidden，
       整页任何断点都不出现滚动条；页面级格子底纹由 .sign-in-page 统一绘制 -->
  <div
    class="sign-in-page bg-default text-default relative flex h-screen w-full flex-col overflow-hidden supports-[height:100dvh]:h-dvh"
  >
    <!-- 氛围光晕：2 个柔光球（缓慢呼吸漂移），基于整页绝对定位 -->
    <div aria-hidden class="sign-in-glow sign-in-glow--a" />
    <div aria-hidden class="sign-in-glow sign-in-glow--b" />

    <!-- 右上角入口组：语言切换 + 主题切换 -->
    <div class="absolute right-4 top-4 z-30 flex items-center gap-1">
      <LanguageSwitch />
      <ThemeSwitch />
    </div>

    <div
      class="grid min-h-0 w-full flex-1 grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1"
    >
      <!-- ============================================================
           左：品牌区（桌面 lg+ 与右栏等高；移动端仅作 Logo + 标题页头）
           ============================================================ -->
      <aside
        class="sign-in-fade-up relative flex w-full min-h-0 flex-col justify-between gap-6 p-6 sm:p-8 lg:p-12"
      >
        <!-- 顶部：品牌头 -->
        <div class="relative z-10 flex items-center gap-2.5">
          <img
            :key="resolvedTheme"
            :alt="appName"
            class="size-8 rounded-lg shadow-sm lg:size-9"
            :src="resolvedTheme === 'dark' ? '/logo-dark.svg' : '/logo.svg'"
          />
          <span class="text-base font-semibold tracking-tight">
            {{ appName }}
          </span>
        </div>

        <!-- 中部：Slogan + 描述 + Chip（仅桌面端展示） -->
        <div
          class="relative z-10 hidden flex-1 flex-col justify-center py-8 lg:flex"
        >
          <h1
            class="text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
          >
            {{ slogan }}
          </h1>
          <p class="text-muted mt-4 text-sm">
            {{ t("auth.brand.description") }}
          </p>
          <p class="text-muted mt-2 max-w-md text-sm">
            {{ t("auth.brand.sloganDetail") }}
          </p>

          <!-- 特性 Chip 行 -->
          <div class="mt-8 flex flex-wrap gap-2">
            <UBadge
              v-for="labelKey in BRAND_CHIPS"
              :key="labelKey"
              class="border-muted/60 bg-elevated/60 backdrop-blur"
              color="neutral"
              variant="outline"
              size="sm"
            >
              {{ t(labelKey) }}
            </UBadge>
          </div>
        </div>

        <!-- 底部：桌面端安全提示（移动端隐藏，避免撑高品牌区） -->
        <div
          class="text-muted relative z-10 hidden items-center gap-2 text-xs lg:flex"
        >
          <span>{{ t("auth.brand.security") }}</span>
        </div>
      </aside>

      <!-- ============================================================
           右：表单区（背景由页面级格子统一提供；
           极端矮屏内容超高时内部滚动消化，滚动条不可见）
           ============================================================ -->
      <main
        class="sign-in-scroll-area relative flex min-h-0 w-full flex-col p-6 sm:p-8 lg:p-12"
      >
        <!-- flex-1 撑满：把表单卡片垂直居中，版权贴底 -->
        <div class="relative z-10 flex flex-1 items-center justify-center">
          <RouterView />
        </div>

        <!-- 版权：右侧区域底部（仅桌面端；移动端由页面级 footer 接管） -->
        <p
          class="text-muted relative z-10 mt-4 hidden text-center text-xs lg:block"
        >
          © {{ new Date().getFullYear() }} by
          <a
            class="hover:text-default underline-offset-2 transition-colors hover:underline"
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

    <!-- 版权：页面级底部（仅移动端，位于表单区之下、整页贴底） -->
    <footer class="text-muted relative z-10 pb-4 text-center text-xs lg:hidden">
      © {{ new Date().getFullYear() }}
      <a
        class="underline-offset-2 transition-colors hover:underline"
        href="https://github.com/baiwumm"
        rel="noreferrer"
        target="_blank"
      >
        baiwumm
      </a>
      . All rights reserved.
    </footer>
  </div>
</template>

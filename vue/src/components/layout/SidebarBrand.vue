<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { usePreferredDark, useColorMode } from "@vueuse/core";
import type { DropdownMenuItem } from "@nuxt/ui";

import { ENV } from "@/lib/env";

/**
 * 侧边栏顶部品牌区（对齐 React 端 SidebarBrand）：
 * Logo + 品牌名 + 上下箭头，点击弹出技术栈入口下拉（新窗口跳转官网）；
 * 折叠态仅显示 Logo。实际生效的明暗外观决定 Logo 变体。
 */
defineProps<{
  /** 折叠态（侧边栏 icon 模式）只展示 Logo */
  collapsed?: boolean;
}>();

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

const brandItems = computed<DropdownMenuItem[][]>(() => [
  [
    // 分组标题（type: 'label' 原生渲染为弹层标题，对齐 React 端弹层头部）
    {
      label: t("layout.sidebar.techStack"),
      type: "label",
      icon: "i-lucide-code",
    } as DropdownMenuItem,
    {
      label: "Vue",
      to: "https://vuejs.org",
      icon: "i-logos-vue",
      target: "_blank",
    },
    {
      label: "Nuxt UI",
      to: "https://ui.nuxt.com",
      icon: "i-logos-nuxt-icon",
      target: "_blank",
    },
    {
      label: "TypeScript",
      to: "https://www.typescriptlang.org",
      icon: "i-logos-typescript-icon",
      target: "_blank",
    },
    {
      label: "Vite",
      to: "https://vite.dev",
      target: "_blank",
      icon: "i-logos-vite-icon-dark",
    },
    {
      label: "Tailwind CSS",
      to: "https://tailwindcss.com",
      icon: "i-logos-tailwindcss-icon",
      target: "_blank",
    },
  ],
]);
</script>

<script lang="ts">
export default { name: "SidebarBrand" };
</script>

<template>
  <UDropdownMenu
    :items="brandItems"
    arrow
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{
      content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)',
    }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed',
      }"
      :trailing-icon="collapsed ? undefined : 'i-lucide-chevrons-up-down'"
    >
      <div class="flex items-center gap-2 font-bold text-base">
        <img
          :key="resolvedTheme"
          :alt="appName"
          class="size-8 shrink-0 rounded-lg"
          :src="resolvedTheme === 'dark' ? '/logo-dark.svg' : '/logo.svg'"
        />
        <template v-if="!collapsed">
          <span>{{ appName }}</span>
        </template>
      </div>
    </UButton>
  </UDropdownMenu>
</template>

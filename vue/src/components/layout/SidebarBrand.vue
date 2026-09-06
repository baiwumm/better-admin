<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { usePreferredDark, useColorMode } from "@vueuse/core";
import type { DropdownMenuItem } from "@nuxt/ui/runtime/components/DropdownMenu.vue";

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

/** 技术栈入口（React 端 TECH_STACKS 的 Vue 端对应物），品牌 Logo + 新窗口跳转官网。 */
const techStacks = [
  { name: "Vue", url: "https://vuejs.org", icon: "i-simple-icons-vuedotjs" },
  {
    name: "Nuxt UI",
    url: "https://ui.nuxt.com",
    icon: "i-simple-icons-nuxt",
  },
  {
    name: "TypeScript",
    url: "https://www.typescriptlang.org",
    icon: "i-simple-icons-typescript",
  },
  { name: "Vite", url: "https://vite.dev", icon: "i-simple-icons-vite" },
  {
    name: "Tailwind CSS",
    url: "https://tailwindcss.com",
    icon: "i-simple-icons-tailwindcss",
  },
];

const brandItems = computed<DropdownMenuItem[][]>(() => [
  [
    // 分组标题（type: 'label' 原生渲染为弹层标题，对齐 React 端弹层头部）
    { label: t("layout.sidebar.techStack"), type: "label" } as DropdownMenuItem,
    ...techStacks.map((stack) => ({
      label: stack.name,
      icon: stack.icon,
      onSelect: () => {
        window.open(stack.url, "_blank", "noopener,noreferrer");
      },
    })),
  ],
]);
</script>

<script lang="ts">
export default { name: "SidebarBrand" };
</script>

<template>
  <UDropdownMenu
    :items="brandItems"
    :content="{ align: 'start' }"
    :ui="{ content: 'min-w-44' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      class="w-full"
      :class="collapsed ? 'justify-center px-2' : 'justify-start'"
      :aria-label="appName"
    >
      <img
        :key="resolvedTheme"
        :alt="appName"
        class="size-8 shrink-0 rounded-lg"
        :src="resolvedTheme === 'dark' ? '/logo-dark.svg' : '/logo.svg'"
      />
      <template v-if="!collapsed">
        <span class="min-w-0 flex-1 truncate text-left font-bold">
          {{ appName }}
        </span>
        <UIcon
          class="size-4 shrink-0 text-muted"
          name="i-lucide-chevrons-up-down"
        />
      </template>
    </UButton>
  </UDropdownMenu>
</template>

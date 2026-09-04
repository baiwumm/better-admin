<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { MenuNode } from "@/lib/api-types";
import { useAuthSync } from "@/composables/use-auth-sync";
import { useMenus } from "@/composables/use-menus";
import { filterHiddenMenus } from "@/lib/permission";
import AppLogo from "@/components/AppLogo.vue";
import ConfigDrawer from "@/components/layout/ConfigDrawer.vue";
import LanguageSwitch from "@/components/layout/LanguageSwitch.vue";
import ThemeSwitch from "@/components/layout/ThemeSwitch.vue";
import UserMenu from "@/components/layout/UserMenu.vue";

/**
 * 认证态布局（Nuxt UI Dashboard 套件，vue-plan v1.1 微调 4）：
 * - UDashboardGroup：布局容器 + 侧栏状态持久化（v3 UDashboardLayout 的 v4 对应组件）
 * - UDashboardSidebar：导航 items 注入；折叠 / 移动端抽屉由组件内置
 * - UDashboardPanel + UDashboardNavbar：顶部栏（Header 操作区顺序对齐 React：
 *   Search → ThemeSwitch → ConfigDrawer；Profile 在侧边栏底部）
 * - UDashboardSearch：命令面板（Cmd/Ctrl+K 内置，含明暗切换命令组）
 */
useAuthSync();

const { t } = useI18n();
const { data: menus } = useMenus();

interface NavLeaf {
  label: string;
  icon?: string;
  to?: string;
  defaultOpen?: boolean;
  children?: NavLeaf[];
}

function toNavLeaf(node: MenuNode): NavLeaf {
  return {
    label: node.i18nKey ? t(node.i18nKey) : node.label,
    icon: node.icon ? `i-lucide-${node.icon}` : undefined,
    to: node.to ?? undefined,
    defaultOpen: node.defaultOpen,
    children: node.children?.map(toNavLeaf),
  };
}

/**
 * 菜单树 → 侧边栏 items：
 * - 仅做 hideInMenu 过滤（权限过滤由后端 GET /menus 完成，见 menu-fetch.ts）
 * - 顶层叶子（控制台）合并为一组；每个顶层分组独立一组（collapsible 子菜单）
 */
const sidebarItems = computed<NavLeaf[][]>(() => {
  const visible = filterHiddenMenus(menus.value ?? []);
  const leaves = visible
    .filter((node) => !node.children?.length)
    .map(toNavLeaf);
  const groups = visible
    .filter((node) => node.children?.length)
    .map((node) => [toNavLeaf(node)]);
  const items: NavLeaf[][] = [];

  if (leaves.length) items.push(leaves);

  items.push(...groups);

  return items;
});

/** 命令面板：菜单叶子 → 可跳转项（明暗切换命令组由 UDashboardSearch 内置）。 */
const searchGroups = computed(() => {
  const flatten = (nodes: MenuNode[]): MenuNode[] =>
    nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);
  const leaves = flatten(filterHiddenMenus(menus.value ?? [])).filter(
    (node) => node.to,
  );

  return [
    {
      id: "menus",
      label: t("layout.command.search"),
      items: leaves.map((node) => ({
        label: node.i18nKey ? t(node.i18nKey) : node.label,
        icon: node.icon ? `i-lucide-${node.icon}` : undefined,
        to: node.to ?? undefined,
      })),
    },
  ];
});
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible>
      <template #header="{ collapsed }">
        <AppLogo :collapsed="collapsed" />
      </template>

      <template #default>
        <UNavigationMenu :items="sidebarItems" orientation="vertical" />
        <UDashboardSidebarCollapse />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="searchGroups" />

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar>
          <template #right>
            <UDashboardSearchButton />
            <ThemeSwitch />
            <LanguageSwitch />
            <ConfigDrawer />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <RouterView />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

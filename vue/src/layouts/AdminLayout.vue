<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import type { NavigationMenuItem } from "@nuxt/ui";

import type { MenuNode } from "@/lib/api-types";
import { useAuthSync } from "@/composables/use-auth-sync";
import { MENUS_QUERY_KEY, useMenus } from "@/composables/use-menus";
import { filterHiddenMenus } from "@/lib/permission";
import { findActivePath } from "@/lib/menu-utils";
import { ROUTE_TITLE_KEYS } from "@/lib/route-access";
import ConfigDrawer from "@/components/layout/ConfigDrawer.vue";
import FullscreenButton from "@/components/layout/FullscreenButton.vue";
import LanguageSwitch from "@/components/layout/LanguageSwitch.vue";
import SidebarBrand from "@/components/layout/SidebarBrand.vue";
import UserMenu from "@/components/layout/UserMenu.vue";

/**
 * Admin 双栏布局（Nuxt UI Dashboard 套件，结构对齐 React 端 admin-layout）：
 * - 侧边栏：品牌下拉（技术栈入口）+ 导航菜单（骨架屏 / 失败重试 / 折叠 tooltip
 *   + 悬浮子菜单）+ 底部快捷链接（GitHub / 博客）+ 用户菜单
 * - 顶栏：折叠按钮（leading，移动端为打开抽屉）+ 面包屑 + 右侧
 *   搜索 / 通知占位 / 全屏 / 语言 / 偏好抽屉
 * - 主体：全宽页面（架构图谱 / 我的公告）去内边距
 * - useAuthSync：挂载时 /auth/me 快照同步（mechanisms §6）
 */
useAuthSync();

const { t } = useI18n();
const route = useRoute();
const queryClient = useQueryClient();

const { data: menus, isLoading, error } = useMenus();

interface NavLeaf {
  label: string;
  icon?: string;
  to?: string;
  /** 精确匹配路由（叶子节点默认 true，避免 / 匹配所有路径） */
  exact?: boolean;
  defaultOpen?: boolean;
  children?: NavLeaf[];
}

function toNavLeaf(node: MenuNode): NavLeaf {
  return {
    label: node.i18nKey ? t(node.i18nKey) : node.label,
    icon: node.icon ? `i-lucide-${node.icon}` : undefined,
    to: node.to ?? undefined,
    // 叶子节点（具体页面）使用精确匹配，避免 / 前缀匹配所有路由
    exact: !node.children?.length,
    defaultOpen: node.defaultOpen,
    children: node.children?.map(toNavLeaf),
  };
}

/**
 * 菜单树 → 侧边栏 items：
 * - 仅做 hideInMenu 过滤（权限过滤由后端 GET /menus 完成，见 menu-fetch.ts）
 * - 保持一维数组结构，利用 children 属性嵌套，与 React 端 MenuNode[] 结构一致。
 * - UNavigationMenu 会自动处理 children 渲染和路由高亮。
 */
const sidebarItems = computed<NavLeaf[]>(() => {
  const visible = filterHiddenMenus(menus.value ?? []);
  return visible.map(toNavLeaf);
});

/** 菜单区底部快捷链接（对齐 React 端 SIDEBAR_LINKS，新窗口跳转）。 */
const quickLinks = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: t("layout.sidebar.github"),
      icon: "i-lucide-github",
      to: "https://github.com/baiwumm/better-admin",
      target: "_blank",
    },
    {
      label: t("layout.sidebar.blog"),
      icon: "i-lucide-house",
      to: "https://www.baiwumm.com",
      target: "_blank",
    },
  ],
]);

/** 面包屑：当前路由在可见菜单树中的「分组 → 页面」链；非菜单路由回退标题键。 */
const crumbs = computed(() => {
  const chain = findActivePath(
    filterHiddenMenus(menus.value ?? []),
    route.path,
  );

  if (chain.length > 0) {
    return chain.map((node) => ({
      label: node.i18nKey ? t(node.i18nKey) : node.label,
    }));
  }

  const titleKey = ROUTE_TITLE_KEYS[route.path];

  return titleKey ? [{ label: t(titleKey) }] : [];
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

/** 全宽页面白名单（主体区无内边距，对齐 React 端 FULL_WIDTH_ROUTES）。 */
const FULL_WIDTH_ROUTES = ["/org/chart", "/my-notices"];
const isFullWidthPage = computed(() => FULL_WIDTH_ROUTES.includes(route.path));

/** 菜单加载失败重试。 */
function retryMenus() {
  void queryClient.refetchQueries({
    queryKey: MENUS_QUERY_KEY,
    exact: true,
  });
}
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar collapsible>
      <template #header="{ collapsed }">
        <SidebarBrand :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <!-- 菜单加载骨架屏（图标方块 + 两行文字占位） -->
        <div v-if="isLoading" class="flex flex-col gap-1">
          <div
            v-for="index in 6"
            :key="index"
            class="flex items-center gap-3 rounded-lg px-3 py-2"
          >
            <USkeleton class="size-5 rounded-lg" />
            <USkeleton
              v-if="!collapsed"
              class="h-3.5 rounded-full"
              :style="{ width: `${55 + ((index * 13) % 35)}%` }"
            />
          </div>
        </div>

        <!-- 菜单加载失败：提示 + 重试（不误跳 403） -->
        <UAlert
          v-else-if="error"
          class="mt-2"
          color="error"
          variant="outline"
          icon="i-lucide-triangle-alert"
          :title="t('layout.overlay.permissionCheckFailed')"
          :actions="[
            {
              label: t('common.retry'),
              icon: 'i-lucide-refresh-cw',
              color: 'error',
              onClick: retryMenus,
            },
          ]"
        />

        <UNavigationMenu
          v-else
          :collapsed="collapsed"
          :items="sidebarItems"
          orientation="vertical"
          tooltip
          popover
          :ui="{ separator: 'hidden' }"
        />

        <!-- 底部快捷链接：菜单区与用户区之间（mt-auto 贴底） -->
        <UNavigationMenu
          :collapsed="collapsed"
          :items="quickLinks"
          orientation="vertical"
          tooltip
          class="mt-auto"
          :ui="{ separator: 'hidden' }"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="searchGroups" />

    <UDashboardPanel
      :ui="{ body: isFullWidthPage ? 'p-0! sm:p-0!' : undefined }"
    >
      <template #header>
        <UDashboardNavbar>
          <!-- 折叠按钮：桌面折叠/展开，移动端打开抽屉（组件内置行为） -->
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>

          <!-- 面包屑：分组 → 页面 -->
          <template #title>
            <UBreadcrumb :items="crumbs" />
          </template>

          <template #right>
            <div class="flex items-center gap-2">
              <UDashboardSearchButton />
              <!-- 通知铃铛占位（站内信模块随 M2+ 接入） -->
              <UButton
                :aria-label="t('layout.header.notifications')"
                color="neutral"
                icon="i-lucide-bell"
                variant="ghost"
                size="sm"
              />
              <FullscreenButton />
              <LanguageSwitch />
              <ConfigDrawer />
            </div>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <RouterView />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

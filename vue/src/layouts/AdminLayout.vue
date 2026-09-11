<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
  NavigationMenuItem,
} from "@nuxt/ui";

import type { MenuNode } from "@/lib/api-types";
import { useAuthSync } from "@/composables/use-auth-sync";
import { MENUS_QUERY_KEY, useMenus } from "@/composables/use-menus";
import { CONSOLE_MENU_NODE } from "@/lib/menu-fetch";
import { filterHiddenMenus } from "@/lib/permission";
import { findActivePath } from "@/lib/menu-utils";
import { resolveRouteTitleKey } from "@/lib/route-access";
import ConfigDrawer from "@/components/layout/ConfigDrawer.vue";
import FullscreenButton from "@/components/layout/FullscreenButton.vue";
import KeepAliveOutlet from "@/components/layout/KeepAliveOutlet.vue";
import LanguageSwitch from "@/components/layout/LanguageSwitch.vue";
import NoticeBell from "@/components/layout/NoticeBell.vue";
import SidebarBrand from "@/components/layout/SidebarBrand.vue";
import TagsBar from "@/components/layout/TagsBar.vue";
import UserMenu from "@/components/layout/UserMenu.vue";
import {
  type ThemeMode,
  useDesignThemeStore,
} from "@/stores/design-theme-store";

/**
 * Admin 双栏布局（Nuxt UI Dashboard 套件，结构对齐 React 端 admin-layout）：
 * - 侧边栏：品牌下拉（技术栈入口）+ 导航菜单（骨架屏 / 失败重试 / 折叠 tooltip
 *   + 悬浮子菜单）+ 底部快捷链接（GitHub / 博客）+ 用户菜单
 * - 顶栏：折叠按钮（leading，移动端为打开抽屉）+ 面包屑 + 右侧
 *   搜索 / 通知 / 全屏 / 语言 / 偏好抽屉；顶栏下方为多标签页栏（偏好可隐藏）
 * - 主体：KeepAliveOutlet（标签页联动的 KeepAlive 保活 + 刷新）；全宽页面
 *   （架构图谱 / 我的公告）去内边距
 * - useAuthSync：挂载时 /auth/me 快照同步（mechanisms §6）
 */
useAuthSync();

const { t } = useI18n();
const route = useRoute();
const queryClient = useQueryClient();
const designTheme = useDesignThemeStore();

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
 * - 接口加载失败时回退为仅「控制台」：该节点为前端固定注入（登录即可见，
 *   不依赖后端下发），不应因 /menus 失败而连控制台入口一起消失
 *   （对齐 React 端 app-sidebar；失败提示与重试放在主体区覆盖层）。
 */
const sidebarItems = computed<NavLeaf[]>(() => {
  const source = error.value ? [CONSOLE_MENU_NODE] : (menus.value ?? []);

  return filterHiddenMenus(source).map(toNavLeaf);
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

  const titleKey = resolveRouteTitleKey(route.path);

  return titleKey ? [{ label: t(titleKey) }] : [];
});

/** 菜单节点显示名（i18nKey 优先） */
function menuLabel(node: MenuNode): string {
  return node.i18nKey ? t(node.i18nKey) : node.label;
}

/** 命令面板条目：Nuxt UI CommandPaletteItem + 自定义过滤文本（fuse keys 追加 searchText） */
interface CommandItem extends CommandPaletteItem {
  label: string;
  /** 过滤文本：祖先链 + 自身名 + 分组名，搜「用户管理」或「系统管理」都能命中 */
  searchText: string;
}

/** 主题切换条目（labelKey 经 t() 取词；keywords 供英文关键字搜索） */
const THEME_COMMANDS: { mode: ThemeMode; icon: string; keywords: string }[] = [
  { mode: "light", icon: "i-lucide-sun", keywords: "light" },
  { mode: "dark", icon: "i-lucide-moon", keywords: "dark" },
  { mode: "system", icon: "i-lucide-monitor", keywords: "system auto" },
];

/**
 * 命令面板分组（对齐 React 端 command-menu 的 collectMenuSections）：
 * - 顶层分组节点 → 一节（标题为分组名），其下叶子递归拍平；多级时条目名显示「父级 › 页面」；
 * - 顶层叶子节点（如控制台）→ 无标题单条目节；
 * - 快捷链接组（外链新窗口）+ 主题组（经 design-theme-store 切换，带揭示动画；
 *   故关闭 UDashboardSearch 内置的 colorMode 组，避免绕过 store 无动画直改）。
 * 数据源与侧边栏同一份 hideInMenu 过滤后的菜单树。
 */
const searchGroups = computed<CommandPaletteGroup[]>(() => {
  const groups: CommandPaletteGroup[] = [];

  const walk = (
    nodes: MenuNode[],
    trail: string[],
    rootLabel: string,
    out: CommandItem[],
  ) => {
    for (const node of nodes) {
      const label = menuLabel(node);

      if (node.children?.length) {
        walk(node.children, [...trail, label], rootLabel, out);
        continue;
      }
      if (!node.to) continue;

      const parent = trail.at(-1);

      out.push({
        label: parent ? `${parent} › ${label}` : label,
        icon: node.icon ? `i-lucide-${node.icon}` : undefined,
        to: node.to,
        searchText: `${[...trail, label].join(" ")} ${rootLabel}`.trim(),
      });
    }
  };

  for (const node of filterHiddenMenus(menus.value ?? [])) {
    const rootLabel = menuLabel(node);

    if (node.children?.length) {
      const items: CommandItem[] = [];

      walk(node.children, [], rootLabel, items);
      if (items.length > 0) {
        groups.push({ id: `menu-${node.id}`, label: rootLabel, items });
      }
    } else if (node.to) {
      groups.push({
        id: `menu-${node.id}`,
        items: [
          {
            label: rootLabel,
            icon: node.icon ? `i-lucide-${node.icon}` : undefined,
            to: node.to,
            searchText: rootLabel,
          },
        ],
      });
    }
  }

  groups.push({
    id: "quickLinks",
    label: t("layout.command.quickLinks"),
    items: [
      {
        label: t("layout.sidebar.github"),
        icon: "i-lucide-github",
        to: "https://github.com/baiwumm/better-admin",
        target: "_blank",
        searchText: t("layout.sidebar.github"),
      },
      {
        label: t("layout.sidebar.blog"),
        icon: "i-lucide-house",
        to: "https://www.baiwumm.com",
        target: "_blank",
        searchText: t("layout.sidebar.blog"),
      },
    ],
  });

  groups.push({
    id: "theme",
    label: t("layout.command.themeGroup"),
    items: THEME_COMMANDS.map(({ mode, icon, keywords }) => {
      const label = t(`layout.prefs.themeMode.${mode}`);

      return {
        label,
        icon,
        active: designTheme.themeMode === mode,
        searchText: `${label} ${keywords}`,
        onSelect: () => designTheme.setThemeMode(mode),
      };
    }),
  });

  return groups;
});

/** 全宽页面白名单（主体区无内边距，对齐 React 端 FULL_WIDTH_ROUTES）。 */
const FULL_WIDTH_ROUTES = [
  "/org/chart",
  "/my-notices",
  "/exception/403",
  "/exception/404",
  "/exception/500",
];
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
        <UDashboardSearchButton
          :collapsed
          class="bg-transparent ring-default"
        />
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

        <!-- 菜单：加载失败时 sidebarItems 已回退为仅「控制台」，照常渲染 -->
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

    <!-- 命令面板（Cmd/Ctrl+K）：分组数据见 searchGroups；fuse 追加 searchText 键
         使祖先链 / 分组名 / 主题英文关键字可被搜索；主题组自建（关闭内置 colorMode 组）。
         title / description 必须显式传入：Nuxt UI 4.11.0 的 locale 包（zh_cn / en）
         该分组只提供 theme 键，组件回退 `t('dashboardSearch.title')` 会把原始键名
         直接渲染到面板顶部（上游缺键，非应用文案问题）。 -->
    <UDashboardSearch
      :color-mode="false"
      :fuse="{ fuseOptions: { keys: ['label', 'suffix', 'searchText'] } }"
      :groups="searchGroups"
      :title="t('layout.command.palette')"
      :description="t('layout.command.search')"
      :placeholder="t('layout.command.placeholder')"
    />

    <!-- 面板 body（滚动容器）绑定 route-vt-main：view-transition-name: main-content，
         路由过渡动画只作用于主体区（侧边栏 / 顶栏不参与，见 styles/route-transitions.css），
         主题切换 VT 期间由 theme-transition.css 临时摘名并入 root 组统一揭示 -->
    <UDashboardPanel
      :ui="{
        body: isFullWidthPage ? 'route-vt-main p-0! sm:p-0!' : 'route-vt-main',
      }"
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
              <NoticeBell />
              <FullscreenButton />
              <LanguageSwitch />
              <ConfigDrawer />
            </div>
          </template>
        </UDashboardNavbar>

        <!-- 多标签页栏：置于 UDashboardToolbar 内，边框由 toolbar 提供；覆盖其
             默认 min-h-[49px] / px-4 让高度与内边距由 TagsBar 自身决定（h-10 +
             px-2，对齐 React 端 40px 栏高）。偏好设置可隐藏（关闭仅隐藏 UI，
             不清空已打开标签）。 -->
        <UDashboardToolbar
          v-if="designTheme.showTabs"
          :ui="{ root: 'min-h-0 px-0 sm:px-0' }"
        >
          <TagsBar />
        </UDashboardToolbar>
      </template>

      <template #body>
        <!-- 菜单加载失败：主体区错误覆盖层（对齐 React 端 ErrorOverlay），
             不误跳 403；重试即重新拉取 /menus -->
        <div
          v-if="error"
          class="flex h-full min-h-[50vh] flex-col items-center justify-center gap-2 rounded-2xl border border-default bg-elevated/50 text-muted"
        >
          <UIcon
            aria-hidden
            class="size-10 text-error"
            name="i-lucide-triangle-alert"
          />
          <p class="font-medium text-default">
            {{ t("layout.overlay.permissionCheckFailed") }}
          </p>
          <p class="max-w-80 text-center text-sm">
            {{ t("layout.overlay.permissionCheckFailedDesc") }}
          </p>
          <UButton
            class="mt-2"
            :label="t('common.retry')"
            color="neutral"
            size="sm"
            variant="outline"
            @click="retryMenus"
          />
        </div>

        <!-- display:contents 包裹层：覆盖层显示期间以 v-show 隐藏而非卸载，
             KeepAliveOutlet 的保活实例池与路由 VT 守卫保持挂载，恢复后原页面
             状态无损（同 React 端 overlay 语义） -->
        <div v-show="!error" class="contents">
          <KeepAliveOutlet />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

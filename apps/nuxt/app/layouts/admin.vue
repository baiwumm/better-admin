<script setup lang="ts">
import { computed } from 'vue'
import { useQueryClient } from '@tanstack/vue-query'
import type {
  CommandPaletteGroup,
  CommandPaletteItem,
  NavigationMenuItem
} from '@nuxt/ui'

import type { MenuNode } from '@/lib/api-types'
import { useAuthSync } from '@/composables/use-auth-sync'
import { MENUS_QUERY_KEY, useMenus } from '@/composables/use-menus'
import { CONSOLE_MENU_NODE } from '@/lib/menu-fetch'
import { ENV } from '@/lib/env'
import { filterHiddenMenus } from '@/lib/permission'
import { findActivePath } from '@/lib/menu-utils'
import { resolveRouteTitleKey } from '@/lib/route-access'
import { type ThemeMode, useDesignThemeStore } from '@/stores/design-theme-store'
import ConfigDrawer from '@/components/layout/ConfigDrawer.vue'
import FullscreenButton from '@/components/layout/FullscreenButton.vue'
import LanguageSwitch from '@/components/layout/LanguageSwitch.vue'
import TagsBar from '@/components/layout/TagsBar.vue'
import SidebarBrand from '@/components/layout/SidebarBrand.vue'
import UserMenu from '@/components/layout/UserMenu.vue'

/**
 * Admin 双栏布局（Nuxt UI Dashboard 套件，平移自 vue/src/layouts/
 * AdminLayout.vue 并按 nuxt-plan.md M0 范围精简，结构对齐 React 端
 * admin-layout）：
 * - 侧边栏：品牌下拉（技术栈入口）+ 导航菜单（骨架屏 / 失败重试 / 折叠
 *   tooltip + 悬浮子菜单）+ 底部快捷链接（文档 / GitHub / 博客）+ 用户菜单
 * - 顶栏：折叠按钮（leading，移动端为打开抽屉）+ 面包屑 + 右侧
 *   站内信铃铛 / 全屏 / 语言 / 偏好抽屉（ConfigDrawer，主题切换收在其中，
 *   对齐 Vue 端 AdminLayout）
 * - 多标签页栏：TagsBar 置于 UDashboardToolbar（偏好可隐藏）
 * - 主体：slot（app.vue 的 KeepAliveOutlet > NuxtPage 提供保活与路由 VT）；
 *   全宽页面（架构图谱 / 我的公告 / exception）去内边距。
 */
useAuthSync()

const { t } = useI18n()
const route = useRoute()
const queryClient = useQueryClient()

const { data: menus, isLoading, error } = useMenus()

interface NavLeaf {
  label: string
  icon?: string
  to?: string
  /** 精确匹配路由（叶子节点默认 true，避免 / 匹配所有路径） */
  exact?: boolean
  defaultOpen?: boolean
  children?: NavLeaf[]
}

function toNavLeaf(node: MenuNode): NavLeaf {
  return {
    label: node.i18nKey ? t(node.i18nKey) : node.label,
    icon: node.icon ? `i-lucide-${node.icon}` : undefined,
    to: node.to ?? undefined,
    // 叶子节点（具体页面）使用精确匹配，避免 / 前缀匹配所有路由
    exact: !node.children?.length,
    defaultOpen: node.defaultOpen,
    children: node.children?.map(toNavLeaf)
  }
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
  const source = error.value ? [CONSOLE_MENU_NODE] : (menus.value ?? [])

  return filterHiddenMenus(source).map(toNavLeaf)
})

/**
 * 底部快捷链接数据源（对齐 React 端 SIDEBAR_LINKS）：侧边栏与命令面板共用一份，
 * 新增条目只改这里；地址全部来自 lib/env（仓库地址真源在 package.json）。
 */
const SIDEBAR_LINKS = [
  {
    href: ENV.docsUrl,
    icon: 'i-lucide-book-open',
    labelKey: 'layout.sidebar.docs'
  },
  {
    href: ENV.repoUrl,
    icon: 'i-lucide-github',
    labelKey: 'layout.sidebar.github'
  },
  {
    href: ENV.blogUrl,
    icon: 'i-lucide-house',
    labelKey: 'layout.sidebar.blog'
  }
]

/** 菜单区底部快捷链接（新窗口跳转）。 */
const quickLinks = computed<NavigationMenuItem[][]>(() => [
  SIDEBAR_LINKS.map(link => ({
    icon: link.icon,
    label: t(link.labelKey),
    target: '_blank',
    to: link.href
  }))
])

/**
 * 面包屑：当前路由在可见菜单树中的「分组 → 页面」链；非菜单路由回退
 * 路由静态标题键（tabs meta 快照回退分支随 M4 多标签页里程碑平移）。
 */
const crumbs = computed(() => {
  const chain = findActivePath(
    filterHiddenMenus(menus.value ?? []),
    route.path
  )

  if (chain.length > 0) {
    return chain.map(node => ({
      label: node.i18nKey ? t(node.i18nKey) : node.label
    }))
  }

  const titleKey = resolveRouteTitleKey(route.path)

  return titleKey ? [{ label: t(titleKey) }] : []
})

/** 菜单节点显示名（i18nKey 优先） */
function menuLabel(node: MenuNode): string {
  return node.i18nKey ? t(node.i18nKey) : node.label
}

/**
 * 主题切换条目（labelKey 经 t() 取词；keywords 供英文关键字搜索）。
 * M4 起经 design-theme-store 的 setThemeMode 切换（带主题揭示动画，
 * 对齐 Vue 端 AdminLayout；此前 M0 直切 @nuxtjs/color-mode 无动画）。
 */
const THEME_COMMANDS: {
  mode: ThemeMode
  icon: string
  keywords: string
}[] = [
  { mode: 'light', icon: 'i-lucide-sun', keywords: 'light' },
  { mode: 'dark', icon: 'i-lucide-moon', keywords: 'dark' },
  { mode: 'system', icon: 'i-lucide-monitor', keywords: 'system auto' }
]

const designTheme = useDesignThemeStore()

/**
 * 命令面板分组：保持菜单树形，不拍平——这点与 React 端 command-menu 的
 * collectMenuSections（「父级 › 页面」平铺）不同，UDashboardSearch 对 children
 * 有内置钻取交互（CommandPalette：带 children 的条目渲染 chevron，点击/回车
 * navigate 进入子级，Backspace 返回上级），无需外部展平。
 * - 顶层分组节点 → 一节（标题为分组名），children 树形直传；
 * - 顶层叶子节点（如控制台）→ 无标题单条目节；
 * - 快捷链接组（外链新窗口）+ 主题组（切换明暗三态）。
 * 数据源与侧边栏同一份 hideInMenu 过滤后的菜单树。
 */
function toCommandItem(node: MenuNode): CommandPaletteItem | null {
  const label = menuLabel(node)

  if (node.children?.length) {
    const children = node.children
      .map(toCommandItem)
      .filter((item): item is CommandPaletteItem => item !== null)

    return children.length > 0
      ? {
          label,
          icon: node.icon ? `i-lucide-${node.icon}` : undefined,
          children
        }
      : null
  }

  if (!node.to) return null

  return {
    label,
    icon: node.icon ? `i-lucide-${node.icon}` : undefined,
    to: node.to
  }
}

const searchGroups = computed<CommandPaletteGroup[]>(() => {
  const groups: CommandPaletteGroup[] = []

  for (const node of filterHiddenMenus(menus.value ?? [])) {
    const rootLabel = menuLabel(node)

    if (node.children?.length) {
      const items = node.children
        .map(toCommandItem)
        .filter((item): item is CommandPaletteItem => item !== null)

      if (items.length > 0) {
        groups.push({ id: `menu-${node.id}`, label: rootLabel, items })
      }
    } else if (node.to) {
      groups.push({
        id: `menu-${node.id}`,
        items: [
          {
            label: rootLabel,
            icon: node.icon ? `i-lucide-${node.icon}` : undefined,
            to: node.to
          }
        ]
      })
    }
  }

  groups.push({
    id: 'quickLinks',
    label: t('layout.command.quickLinks'),
    items: SIDEBAR_LINKS.map(link => ({
      icon: link.icon,
      label: t(link.labelKey),
      searchText: t(link.labelKey),
      target: '_blank',
      to: link.href
    }))
  })

  groups.push({
    id: 'theme',
    label: t('layout.command.themeGroup'),
    items: THEME_COMMANDS.map(({ mode, icon, keywords }) => {
      const label = t(`layout.prefs.themeMode.${mode}`)

      return {
        label,
        icon,
        active: designTheme.themeMode === mode,
        searchText: `${label} ${keywords}`,
        onSelect: () => {
          designTheme.setThemeMode(mode)
        }
      }
    })
  })

  return groups
})

/** 全宽页面白名单（主体区无内边距，对齐 React 端 FULL_WIDTH_ROUTES）。 */
const FULL_WIDTH_ROUTES = [
  '/org/chart',
  '/my-notices',
  '/exception/403',
  '/exception/404',
  '/exception/500'
]
const isFullWidthPage = computed(() => FULL_WIDTH_ROUTES.includes(route.path))

/** 菜单加载失败重试。 */
function retryMenus() {
  void queryClient.refetchQueries({
    queryKey: MENUS_QUERY_KEY,
    exact: true
  })
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
        <div
          v-if="isLoading"
          class="flex flex-col gap-1"
        >
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

    <!-- 命令面板（Cmd/Ctrl+K）：分组数据见 searchGroups（菜单树保持 children
         结构，钻取交互由组件内置）；fuse 追加 searchText 键使主题英文关键字可被
         搜索；主题组自建（关闭内置 colorMode 组）。
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

    <!-- 面板 body（滚动容器）：路由过渡动画（view-transition-name 绑定）随 M4 平移；
         全宽页面（架构图谱 / 我的公告 / exception）去内边距 -->
    <UDashboardPanel
      :ui="{
        body: isFullWidthPage ? 'route-vt-main p-0! sm:p-0!' : 'route-vt-main'
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
              <!-- 站内信铃铛（M3）：未读数 + 60s 轮询；右侧按钮顺序对齐
                   Vue 端 AdminLayout：铃铛 → 全屏 → 语言 → 配置抽屉 -->
              <NoticeBell />
              <FullscreenButton />
              <LanguageSwitch />
              <ConfigDrawer />
            </div>
          </template>
        </UDashboardNavbar>

        <!-- 多标签页栏（M4）：置于 UDashboardToolbar 内，边框由 toolbar 提供；
             覆盖其默认 min-h / px 让高度与内边距由 TagsBar 自身决定。
             偏好设置可隐藏（关闭仅隐藏 UI，不清空已打开标签）。 -->
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

        <!-- display:contents 包裹层：错误覆盖层显示期间以 hidden 隐藏而非卸载，
             app.vue 的 KeepAliveOutlet 保活实例池与路由 VT 守卫保持挂载，恢复后原页面状态无损 -->
        <div :class="error ? 'hidden' : 'contents'">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>

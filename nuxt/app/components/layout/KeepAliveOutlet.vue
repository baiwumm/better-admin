<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useMenus } from '@/composables/use-menus'
import { collectKeepAlivePaths, findActivePath } from '@/lib/menu-utils'
import { isAdminLayoutRoute } from '@/lib/route-access'
import { canRouteVt, startRouteVt } from '@/lib/route-vt'
import { useDesignThemeStore } from '@/stores/design-theme-store'
import { useTabsStore } from '@/stores/tabs-store'

/**
 * 路由呈现管理器（对齐 React 端 KeepAliveOutlet 与 Vue 端同名组件，Nuxt 内置
 * 机制适配，机制见 docs/mechanisms.md §2）：替代裸 NuxtPage 放在 AdminLayout
 * 主体区（app.vue slot 包装），同时承担 **组件状态保活** 与 **路由过渡动画**。
 *
 * == 保活（与 Vue 端 host 形态的关键差异）==
 * Vue 端用「按路径命名宿主组件 + KeepAlive include=path」；Nuxt 端页面由
 * NuxtPage 动态渲染，自建宿主包不住动态子树（停用实例会跟随路由重渲），
 * 故改用 **NuxtPage 内置 keepalive**（include 按页面组件名匹配）：
 * - include = 已打开标签的组件名集合 ∩ 菜单 keepAlive 路径的组件名
 *   （path → 组件名映射经 route.matched 实时记录并随 tabs 持久化于 sessionStorage）；
 * - 关闭标签 = 从 include 移除组件名 → KeepAlive 剪除对应缓存实例；
 *   已知近似：同名页面组件（如控制台 index 与 settings/index）关闭其一
 *   会一并剪除缓存（仅损失缓存，不影响正确性）；
 * - max 为保活实例上限（LRU）。
 *
 * == 过渡 ==
 * 与 Vue 端一致：路由 VT 在导航流程内编排（router.beforeResolve / afterEach，
 * 随本组件挂载注册）。beforeResolve 启动 VT，浏览器捕获真实旧帧后才放行导航；
 * 导航提交、NuxtPage 渲染新页并经 nextTick 落 DOM 后放行回调捕获新帧，播放
 * route-transitions.css 预设（data-route-transition 常驻 + data-route-vt 门控）。
 * 仅路径变化且目标仍在 AdminLayout 内的导航播放；方向感知按菜单树层级深度写入
 * html[data-rt-direction]（"back" 反转位移类动画）。
 *
 * == 刷新 ==
 * 标签「刷新」= pageKey 递增强制重挂载 + include 摘一拍剪除旧缓存后恢复；
 * 非激活页立即提交。
 *
 * == 滚动 ==
 * 由 UDashboardPanel 的 body 滚动；路由切换后显式回顶。
 */
const route = useRoute()
const router = useRouter()
const { data: menuTree } = useMenus()
const tabsStore = useTabsStore()
const designTheme = useDesignThemeStore()

/** 保活实例上限（与 React 端 MAX_POOL_SIZE 一致）。 */
const MAX_KEEP_ALIVE = 10

const COMPONENT_NAME_STORAGE_KEY = 'better-admin-tab-components'

/** path → 页面组件名映射（route.matched 实时记录；随 sessionStorage 持久化，
 * 刷新恢复后无需等页面再次访问即可重建 include）。 */
function readComponentNames(): Record<string, string> {
  try {
    return JSON.parse(
      sessionStorage.getItem(COMPONENT_NAME_STORAGE_KEY) ?? '{}'
    ) as Record<string, string>
  } catch {
    return {}
  }
}

const componentNameByPath = ref<Record<string, string>>(
  readComponentNames()
)

// 路由变化：记录当前页面组件名（保活 include 的派生源）
watch(
  () => route.matched,
  (matched) => {
    const component = matched[0]?.components?.default as
      | { __name?: string, name?: string }
      | undefined
    const name = component?.__name ?? component?.name

    if (name && componentNameByPath.value[route.path] !== name) {
      componentNameByPath.value = {
        ...componentNameByPath.value,
        [route.path]: name
      }

      try {
        sessionStorage.setItem(
          COMPONENT_NAME_STORAGE_KEY,
          JSON.stringify(componentNameByPath.value)
        )
      } catch {
        // 存储不可用时映射仅会话内存生效
      }
    }
  },
  { immediate: true }
)

// keepAlive 路径集合：由菜单数据派生
const keepAlivePaths = computed(() =>
  menuTree.value ? collectKeepAlivePaths(menuTree.value) : new Set<string>()
)

// 刷新中的路径：临时移出 include 以触发 KeepAlive 清理旧缓存实例
const refreshing = ref<string[]>([])

/** KeepAlive include（页面组件名）：已打开标签 ∩ keepAlive 菜单 ∖ 刷新中。 */
const cachedNames = computed(() => {
  const names = tabsStore.paths
    .filter(
      path =>
        keepAlivePaths.value.has(path) && !refreshing.value.includes(path)
    )
    .map(path => componentNameByPath.value[path])
    .filter((name): name is string => Boolean(name))

  return [...new Set(names)]
})

/** 页面 key：路径 + 已应用刷新序号（刷新递增强制重挂载）。 */
const pageKey = computed(
  () => `${route.path}#${appliedRefreshSeq.value[route.path] ?? 0}`
)

/** 是否播放路由过渡：偏好非「无」+ 浏览器支持 VT + 未开启减弱动态效果。 */
function shouldAnimate(): boolean {
  return designTheme.routeTransition !== 'none' && canRouteVt()
}

// ── 导航方向 ──

/** 菜单树中的层级深度（白名单等树外路径为 0）。 */
function menuDepthOf(path: string): number {
  return menuTree.value ? findActivePath(menuTree.value, path).length : 0
}

/** 目标深度更浅视为后退（供 CSS 反转位移类动画方向）。 */
function applyDirection(fromPath: string, toPath: string): void {
  const root = document.documentElement

  if (menuDepthOf(toPath) < menuDepthOf(fromPath)) {
    root.setAttribute('data-rt-direction', 'back')
  } else {
    root.removeAttribute('data-rt-direction')
  }
}

// ── 导航过渡编排 ──

/** afterEach 回调的路由位置类型（经回调签名推导，避免手写路由泛型） */
type AfterEachRoute = Parameters<Parameters<typeof router.afterEach>[0]>[0]

interface PendingNavigation {
  to: AfterEachRoute
  /** 新页 DOM 已提交 → 放行 VT 回调捕获新帧 */
  finish: () => void
}

let pendingNavigation: PendingNavigation | null = null

function renderTimeout(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 2000))
}

const removeBeforeResolve = router.beforeResolve(async (to, from) => {
  if (to.path === from.path || !isAdminLayoutRoute(to) || !shouldAnimate()) {
    return
  }

  applyDirection(from.path, to.path)

  let changeRoute!: () => void
  const ready = new Promise<void>((resolve) => {
    changeRoute = resolve
  })
  let finish!: () => void
  const rendered = new Promise<void>((resolve) => {
    finish = resolve
  })

  // 上一次导航尚未收尾即被本次覆盖（快速连续导航）：先放行其回调，
  // 其 VT 随后会被本次 startViewTransition 自动 skip
  pendingNavigation?.finish()
  pendingNavigation = { to, finish }

  startRouteVt(async () => {
    changeRoute()
    await Promise.race([rendered, renderTimeout()])
  })

  // 旧帧捕获完成、回调被调用后才继续导航（导航提交因此落在 VT 回调期间）
  await ready
})

const removeAfterEach = router.afterEach((to) => {
  const pending = pendingNavigation

  // 只处理本次登记的导航（守卫与 afterEach 收到同一 to 引用）；被取消的旧导航
  // 已在覆盖时放行。无论导航成功与否都放行，避免回调悬挂
  if (!pending || pending.to !== to) return

  pendingNavigation = null
  void nextTick().then(pending.finish)
})

onUnmounted(() => {
  removeBeforeResolve()
  removeAfterEach()
  pendingNavigation?.finish()
  pendingNavigation = null
})

// ── 刷新编排 ──

/**
 * 已应用的刷新序号（与 store 最新值分离）：激活页的刷新延迟到 VT 回调内提交，
 * 旧帧先被捕获；初始取 store 快照，避免挂载时把已有序号回退成 0 造成多余重挂载。
 */
const appliedRefreshSeq = ref<Record<string, number>>({
  ...tabsStore.refreshSeq
})

watch(
  () => tabsStore.refreshSeq,
  (seq) => {
    const pending = Object.keys(seq).filter(
      path => (seq[path] ?? 0) > (appliedRefreshSeq.value[path] ?? 0)
    )

    if (pending.length === 0) return

    // include 摘一拍（剪除旧缓存）后恢复；激活页在 VT 回调内提交（旧帧先捕获）
    const commitRefresh = async () => {
      refreshing.value = [...refreshing.value, ...pending]
      appliedRefreshSeq.value = { ...seq }
      await nextTick()
      refreshing.value = refreshing.value.filter(p => !pending.includes(p))
      await nextTick()

      if (pending.includes(route.path)) resetScroll()
    }

    if (shouldAnimate() && pending.includes(route.path)) {
      // 刷新不是导航：清除上次导航遗留的方向标记，避免位移类动画反向播放
      document.documentElement.removeAttribute('data-rt-direction')
      startRouteVt(commitRefresh)
    } else {
      void commitRefresh()
    }
  }
)

// ── 滚动回顶：面板 body 滚动容器（UDashboardPanel data-slot="body"）──

function resetScroll() {
  const scroller
    = document.querySelector<HTMLElement>('[data-slot="body"]')

  if (scroller) scroller.scrollTop = 0
}

// DOM 更新后回顶：VT 场景下发生在 update 回调内（新帧捕获前），重置对新帧即时生效
watch(
  () => route.path,
  () => resetScroll(),
  { flush: 'post' }
)
</script>

<template>
  <NuxtPage
    :keepalive="{ include: cachedNames, max: MAX_KEEP_ALIVE }"
    :page-key="pageKey"
  />
</template>

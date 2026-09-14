<script setup lang="ts">
import {
  type Component,
  computed,
  defineComponent,
  getCurrentInstance,
  h,
  nextTick,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { type RouteLocationNormalized, useRoute, useRouter } from "vue-router";

import { useMenus } from "@/composables/use-menus";
import { collectKeepAlivePaths, findActivePath } from "@/lib/menu-utils";
import { isAdminLayoutRoute } from "@/lib/route-access";
import { canRouteVt, startRouteVt } from "@/lib/route-vt";
import { useDesignThemeStore } from "@/stores/design-theme-store";
import { useTabsStore } from "@/stores/tabs-store";

/**
 * 路由呈现管理器（对齐 React 端 KeepAliveOutlet，Vue 原生 KeepAlive 简化实现，
 * 机制见 docs/mechanisms.md §2 Vue 条目）：替代裸 <RouterView/> 放在 AdminLayout 主体区，
 * 同时承担 **组件状态保活** 与 **路由过渡动画** 两项职责。
 *
 * == 保活 ==
 * `<KeepAlive :include :max="10">`：include = 已打开未关闭标签 ∩ 菜单 keepAlive 路径
 * （关闭标签即移出 include → KeepAlive 自动清除该缓存实例）；其余页面不进缓存，
 * 语义等同普通路由切换；max 为保活实例上限（LRU）。
 * KeepAlive 按组件 name 匹配 include，而页面组件名与路径无关（且 index.vue 等
 * 同名冲突），故每条路径经 pageHostFor 包一层 name = path 的宿主组件（按路径缓存，
 * 组件类型稳定，缓存键不漂移），真实页面组件以 prop 注入。
 *
 * == 过渡 ==
 * 路由 VT 在导航流程内编排（router.beforeResolve / afterEach，随本组件挂载注册、
 * 卸载注销——登录页等布局外场景天然无路由动画）：beforeResolve 里启动 VT，浏览器
 * 捕获真实旧帧后才放行导航（update 回调触发 = 旧帧已拍）；导航提交、RouterView
 * 渲染新页并经 nextTick 落到 DOM 后再 resolve update 回调，浏览器据此捕获新帧，
 * 随后播放 route-transitions.css 的预设动画（html[data-route-transition] +
 * startRouteVt 的 data-route-vt 门控）。仅路径变化且目标仍在 AdminLayout 内的
 * 导航播放动画；同路径 query 变化、跳登录页 / 全屏错误页不动画。
 * 导航方向感知：按新旧路径在菜单树中的层级深度判定前进 / 后退，写入
 * html[data-rt-direction]（"back" 时 CSS 反转位移类动画方向）。
 *
 * == 刷新 ==
 * 标签右键「刷新」= 实例销毁重建：key 含已应用的刷新序号（与 tabs-store 最新值分离，
 * 激活页的刷新延迟到 VT 回调内提交，旧帧先被捕获，静态页也有「重切一遍」的动画
 * 反馈），同时把该路径临时移出 include 一拍——KeepAlive 监听 include 变化会剪除
 * 不再匹配的缓存条目，否则旧实例（同 name、旧 key）会残留在缓存里直到 LRU 淘汰；
 * 非激活页 / 无动画时立即提交（语义不变）。
 *
 * == 滚动 ==
 * 统一由 UDashboardPanel 的 body（overflow-y-auto）滚动；页面位置不做保活——
 * 每次路由切换后显式回到顶部。
 */
const route = useRoute();
const router = useRouter();
const { data: menuTree } = useMenus();
const tabsStore = useTabsStore();
const designTheme = useDesignThemeStore();

/** 保活实例上限（与 React 端 MAX_POOL_SIZE 一致）。 */
const MAX_KEEP_ALIVE = 10;

/** 新页渲染等待上限：超时后无条件放行 VT 回调，避免极端情况下页面被快照层冻结。 */
const RENDER_TIMEOUT_MS = 2000;

// keepAlive 路径集合：由菜单数据派生
const keepAlivePaths = computed(() =>
  menuTree.value ? collectKeepAlivePaths(menuTree.value) : new Set<string>(),
);

// 刷新中的路径：临时移出 include 以触发 KeepAlive 清理旧缓存实例
const refreshing = ref<string[]>([]);

/** KeepAlive include：已打开标签 ∩ keepAlive 菜单 ∖ 刷新中。 */
const cachedNames = computed(() =>
  tabsStore.paths.filter(
    (path) =>
      keepAlivePaths.value.has(path) && !refreshing.value.includes(path),
  ),
);

/** 是否播放路由过渡：偏好非「无」+ 浏览器支持 VT + 未开启减弱动态效果。 */
function shouldAnimate(): boolean {
  return designTheme.routeTransition !== "none" && canRouteVt();
}

// ── 导航方向 ──

/** 菜单树中的层级深度（白名单等树外路径为 0）。 */
function menuDepthOf(path: string): number {
  return menuTree.value ? findActivePath(menuTree.value, path).length : 0;
}

/** 目标深度更浅视为后退（供 CSS 反转位移类动画方向）。 */
function applyDirection(fromPath: string, toPath: string): void {
  const root = document.documentElement;

  if (menuDepthOf(toPath) < menuDepthOf(fromPath)) {
    root.setAttribute("data-rt-direction", "back");
  } else {
    root.removeAttribute("data-rt-direction");
  }
}

// ── 导航过渡编排 ──

interface PendingNavigation {
  to: RouteLocationNormalized;
  /** 新页 DOM 已提交 → 放行 VT 回调捕获新帧 */
  finish: () => void;
}

let pendingNavigation: PendingNavigation | null = null;

function renderTimeout(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, RENDER_TIMEOUT_MS));
}

const removeBeforeResolve = router.beforeResolve(async (to, from) => {
  if (to.path === from.path || !isAdminLayoutRoute(to) || !shouldAnimate()) {
    return;
  }

  applyDirection(from.path, to.path);

  let changeRoute!: () => void;
  const ready = new Promise<void>((resolve) => {
    changeRoute = resolve;
  });
  let finish!: () => void;
  const rendered = new Promise<void>((resolve) => {
    finish = resolve;
  });

  // 上一次导航尚未收尾即被本次覆盖（快速连续导航）：先放行其回调，
  // 其 VT 随后会被本次 startViewTransition 自动 skip
  pendingNavigation?.finish();
  pendingNavigation = { to, finish };

  startRouteVt(async () => {
    changeRoute();
    await Promise.race([rendered, renderTimeout()]);
  });

  // 旧帧捕获完成、回调被调用后才继续导航（导航提交因此落在 VT 回调期间）
  await ready;
});

const removeAfterEach = router.afterEach((to) => {
  const pending = pendingNavigation;

  // 只处理本次登记的导航（守卫与 afterEach 收到同一 to 引用）；被取消的旧导航
  // 已在覆盖时放行。无论导航成功与否都放行，避免回调悬挂
  if (!pending || pending.to !== to) return;

  pendingNavigation = null;
  void nextTick().then(pending.finish);
});

onUnmounted(() => {
  removeBeforeResolve();
  removeAfterEach();
  pendingNavigation?.finish();
  pendingNavigation = null;
});

// ── 刷新编排 ──

/**
 * 已应用的刷新序号（与 store 最新值分离）：激活页的刷新延迟到 VT 回调内提交，
 * 旧帧先被捕获；初始取 store 快照，避免挂载时把已有序号回退成 0 造成多余重挂载。
 */
const appliedRefreshSeq = ref<Record<string, number>>({
  ...tabsStore.refreshSeq,
});

watch(
  () => tabsStore.refreshSeq,
  (seq) => {
    const pending = Object.keys(seq).filter(
      (path) => (seq[path] ?? 0) > (appliedRefreshSeq.value[path] ?? 0),
    );

    if (pending.length === 0) return;

    // key 递增重挂载 + 摘出 include 一拍（post-flush 剪除旧缓存）后恢复
    const commitRefresh = async () => {
      refreshing.value = [...refreshing.value, ...pending];
      appliedRefreshSeq.value = { ...seq };
      await nextTick();
      refreshing.value = refreshing.value.filter((p) => !pending.includes(p));
      await nextTick();

      if (pending.includes(route.path)) resetScroll();
    };

    if (shouldAnimate() && pending.includes(route.path)) {
      // 刷新不是导航：清除上次导航遗留的方向标记，避免位移类动画反向播放
      document.documentElement.removeAttribute("data-rt-direction");
      startRouteVt(commitRefresh);
    } else {
      void commitRefresh();
    }
  },
);

/**
 * 路径 → 宿主组件（name = path）缓存；组件类型按路径稳定，KeepAlive 缓存键不漂移。
 * RouterView 作用域插槽给出的 Component 是 VNode，经 h() 克隆渲染（不复用已挂载节点）。
 */
const hostCache = new Map<string, Component>();

function pageHostFor(path: string): Component {
  let host = hostCache.get(path);

  if (!host) {
    host = defineComponent({
      name: path,
      props: { page: { type: [Object, Function], required: true } },
      setup(props) {
        return () => h(props.page as Component);
      },
    });
    hostCache.set(path, host);
  }

  return host;
}

// ── 滚动回顶：本组件根为 fragment，$el 为首个锚点节点，其父级即面板 body 滚动容器 ──
const instance = getCurrentInstance();

function resetScroll() {
  const anchor = instance?.proxy?.$el as Node | null | undefined;
  const scroller =
    anchor?.parentElement?.closest<HTMLElement>('[data-slot="body"]') ??
    document.querySelector<HTMLElement>('[data-slot="body"]');

  if (scroller) scroller.scrollTop = 0;
}

// DOM 更新后回顶：VT 场景下发生在 update 回调内（新帧捕获前），重置对新帧即时生效
watch(
  () => route.path,
  () => resetScroll(),
  { flush: "post" },
);
</script>

<template>
  <RouterView v-slot="{ Component: pageVnode, route: viewRoute }">
    <KeepAlive :include="cachedNames" :max="MAX_KEEP_ALIVE">
      <component
        :is="pageHostFor(viewRoute.path)"
        :key="`${viewRoute.path}#${appliedRefreshSeq[viewRoute.path] ?? 0}`"
        :page="pageVnode"
      />
    </KeepAlive>
  </RouterView>
</template>

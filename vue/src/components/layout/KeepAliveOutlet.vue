<script setup lang="ts">
import {
  type Component,
  computed,
  defineComponent,
  getCurrentInstance,
  h,
  nextTick,
  ref,
  watch,
} from "vue";
import { useRoute } from "vue-router";

import { useMenus } from "@/composables/use-menus";
import { collectKeepAlivePaths } from "@/lib/menu-utils";
import { useTabsStore } from "@/stores/tabs-store";

/**
 * 路由呈现管理器（对齐 React 端 KeepAliveOutlet，Vue 原生 KeepAlive 简化实现，
 * 机制见 docs/mechanisms.md §2 Vue 条目）：替代裸 <RouterView/> 放在 AdminLayout 主体区。
 *
 * == 保活 ==
 * `<KeepAlive :include :max="10">`：include = 已打开未关闭标签 ∩ 菜单 keepAlive 路径
 * （关闭标签即移出 include → KeepAlive 自动清除该缓存实例）；其余页面不进缓存，
 * 语义等同普通路由切换；max 为保活实例上限（LRU）。
 * KeepAlive 按组件 name 匹配 include，而页面组件名与路径无关（且 index.vue 等
 * 同名冲突），故每条路径经 pageHostFor 包一层 name = path 的宿主组件（按路径缓存，
 * 组件类型稳定，缓存键不漂移），真实页面组件以 prop 注入。
 *
 * == 刷新 ==
 * 标签右键「刷新」= 实例销毁重建：key 含 tabs-store 的刷新序号（激活页重挂载），
 * 同时把该路径临时移出 include 一拍——KeepAlive 监听 include 变化会剪除不再匹配
 * 的缓存条目，否则旧实例（同 name、旧 key）会残留在缓存里直到 LRU 淘汰。
 *
 * == 滚动 ==
 * 统一由 UDashboardPanel 的 body（overflow-y-auto）滚动；页面位置不做保活——
 * 每次路由切换后显式回到顶部。
 */
const route = useRoute();
const { data: menuTree } = useMenus();
const tabsStore = useTabsStore();

/** 保活实例上限（与 React 端 MAX_POOL_SIZE 一致）。 */
const MAX_KEEP_ALIVE = 10;

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

// 刷新编排：序号递增的路径摘出 include 一拍（post-flush 剪除旧缓存）后恢复
watch(
  () => tabsStore.refreshSeq,
  async (seq, prev) => {
    const pending = Object.keys(seq).filter(
      (path) => (seq[path] ?? 0) > (prev?.[path] ?? 0),
    );

    if (pending.length === 0) return;

    refreshing.value = [...refreshing.value, ...pending];
    await nextTick();
    refreshing.value = refreshing.value.filter((p) => !pending.includes(p));

    if (pending.includes(route.path)) resetScroll();
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
        :key="`${viewRoute.path}#${tabsStore.refreshSeq[viewRoute.path] ?? 0}`"
        :page="pageVnode"
      />
    </KeepAlive>
  </RouterView>
</template>

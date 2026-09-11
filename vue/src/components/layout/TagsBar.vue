<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import type { ContextMenuItem } from "@nuxt/ui";

import type { MenuNode } from "@/lib/api-types";
import { useMenus } from "@/composables/use-menus";
import { collectMenuPaths, flattenLeafMenus } from "@/lib/menu-utils";
import {
  LOGIN_REQUIRED_PATHS,
  LOGIN_REQUIRED_PREFIXES,
  resolveRouteTitleKey,
} from "@/lib/route-access";
import { isPinnedTab } from "@/lib/tabs-model";
import { useTabsStore } from "@/stores/tabs-store";

/**
 * 多标签页栏（TagsView，对齐 React 端 tags-bar）：置于顶栏下方，记录路由访问轨迹。
 * - 控制台为固定标签：恒在首位、不可关闭（ensureHomeTab 保证至少一个标签），
 *   结构为「菜单图标 名称 Pin 图标」；普通标签尾部为关闭热区；
 * - 标签主体为 UButton（激活 primary subtle / 未激活 neutral outline），
 *   关闭热区为 Button 内的 span（阻止冒泡避免误触发切换）；中键关闭；
 * - 标签过多时横向滚动（mask 渐隐 + chevron + 滚轮横滚 + 鼠标按住拖拽平移，
 *   隐藏原生滚动条），激活标签自动滚动进可视区；新标签带进场动画（styles/tags-bar.css）；
 * - 右键菜单：UContextMenu 包裹标签列表，capture 阶段记录目标标签
 *   （非标签区域右键不弹出）；
 * - 标题优先取菜单实时数据，其次取 sessionStorage 快照（刷新后立即可渲染
 *   中文标题），两者皆无时显示骨架占位；
 * - 与 KeepAliveOutlet 联动：打开的标签集合约束 KeepAlive include，「关闭标签 = 销毁对应保活实例」。
 */
type TabMenuAction =
  | "refresh"
  | "close"
  | "close-left"
  | "close-right"
  | "close-others"
  | "close-all";

/** chevron 按钮单次滚动距离（px）。 */
const SCROLL_STEP = 160;
/** 判定为拖拽平移的位移阈值（px），避免误吞普通点击。 */
const DRAG_THRESHOLD = 6;

type ShadowState = "none" | "left" | "right" | "both";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { data: menuTree } = useMenus();
const tabsStore = useTabsStore();
const { paths, meta: cachedMeta } = storeToRefs(tabsStore);

// 路由变化 → 登记打开标签（去重追加；控制台恒在首位由 store 保证）
watch(
  () => route.path,
  (path) => tabsStore.openPath(path, path),
  { immediate: true },
);

// 路径 → 标题 / 图标实时映射（菜单数据源；标题经 i18nKey 取词，语言切换即更新）
const liveMetaByPath = computed(() => {
  const map = new Map<string, { title: string; icon?: string }>();

  for (const node of flattenLeafMenus((menuTree.value ?? []) as MenuNode[])) {
    if (node.to) {
      map.set(node.to, {
        title: node.i18nKey ? t(node.i18nKey) : node.label,
        icon: node.icon ? `i-lucide-${node.icon}` : undefined,
      });
    }
  }

  return map;
});

// 菜单就绪 → 权限治理（清理恢复 / 权限变更后不可达的残留标签；登录可达路径豁免）
// + 写入标题快照（新值覆盖旧值并持久化：刷新后无需等菜单接口）
watch(
  menuTree,
  (tree) => {
    if (!tree) return;

    tabsStore.pruneTabs(
      new Set([
        ...collectMenuPaths(tree as MenuNode[]),
        ...LOGIN_REQUIRED_PATHS,
      ]),
      LOGIN_REQUIRED_PREFIXES,
    );
  },
  { immediate: true },
);

watch(
  liveMetaByPath,
  (map) => {
    if (map.size > 0) tabsStore.syncMeta(Object.fromEntries(map));
  },
  { immediate: true },
);

/** 标签展示数据：标题（实时 → 快照 → 路由标题键 → 控制台 → null 骨架）+ 图标。 */
const tabs = computed(() =>
  paths.value.map((path) => {
    const live = liveMetaByPath.value.get(path);
    const cached = cachedMeta.value[path];
    const routeTitleKey = resolveRouteTitleKey(path);
    const title =
      live?.title ??
      cached?.title ??
      (routeTitleKey !== undefined
        ? t(routeTitleKey)
        : isPinnedTab(path)
          ? t("menu.pageTitle.console")
          : null);

    return {
      path,
      title,
      icon: live?.icon ?? cached?.icon,
      active: path === route.path,
      pinned: isPinnedTab(path),
    };
  }),
);

// ── 横向滚动：溢出检测 / 滚轮横滚 / 按住拖拽平移 ──
const scrollEl = useTemplateRef<HTMLDivElement>("scrollEl");
const listEl = useTemplateRef<HTMLUListElement>("listEl");
const shadow = ref<ShadowState>("none");
// 最近一次指针手势是否发生了拖拽平移（吞掉其后的 click，防误切换标签）
let dragMoved = false;
let drag: { startX: number; startScroll: number } | null = null;
let resizeObserver: ResizeObserver | null = null;

/** 由横向剩余滚动量推导 chevron 禁用态与渐隐阴影状态。 */
function updateShadow() {
  const el = scrollEl.value;

  if (!el) return;

  const max = el.scrollWidth - el.clientWidth;

  if (max <= 1) {
    shadow.value = "none";

    return;
  }

  const start = Math.abs(el.scrollLeft);

  if (start > 1 && start < max - 1) shadow.value = "both";
  else if (start > 1) shadow.value = "left";
  else shadow.value = "right";
}

// 滚轮纵向增量转横向滚动（Vue 默认非 passive 监听，允许 preventDefault）
function onWheel(event: WheelEvent) {
  const el = scrollEl.value;

  if (!el || event.deltaY === 0) return;

  event.preventDefault();
  el.scrollLeft += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
}

// 按住拖拽平移（仅鼠标左键）：位移超过阈值判定为拖动并捕获指针，
// 拖动中阻止选中文本；结束后的 click 一律吞掉防止误触发点击
function onPointerDown(event: PointerEvent) {
  if (event.pointerType !== "mouse" || event.button !== 0) return;

  drag = {
    startX: event.clientX,
    startScroll: scrollEl.value?.scrollLeft ?? 0,
  };
  dragMoved = false;
}

function onPointerMove(event: PointerEvent) {
  const el = scrollEl.value;

  if (!drag || !el) return;

  const dx = event.clientX - drag.startX;

  if (!dragMoved && Math.abs(dx) < DRAG_THRESHOLD) return;

  if (!dragMoved) {
    dragMoved = true;
    el.setPointerCapture(event.pointerId);
  }

  event.preventDefault();
  el.scrollLeft = drag.startScroll - dx;
}

function onPointerEnd() {
  drag = null;
}

function onClickCapture(event: MouseEvent) {
  if (!dragMoved) return;

  event.preventDefault();
  event.stopPropagation();
  dragMoved = false;
}

onMounted(() => {
  const el = scrollEl.value;

  if (!el) return;

  updateShadow();
  // 可见性自管理：隐藏原生滚动条后没有滚动条出现改变布局的信号，且新增
  // 标签只增加内容宽度、不改变容器尺寸，需同时观察容器与内容元素
  resizeObserver = new ResizeObserver(updateShadow);
  resizeObserver.observe(el);
  if (listEl.value) resizeObserver.observe(listEl.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

// 激活标签自动滚动进可视区
watch(
  () => [route.path, paths.value.length] as const,
  async () => {
    await nextTick();
    scrollEl.value
      ?.querySelector<HTMLElement>('[data-tab-active="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  },
  { immediate: true },
);

const canScrollLeft = computed(
  () => shadow.value === "left" || shadow.value === "both",
);
const canScrollRight = computed(
  () => shadow.value === "right" || shadow.value === "both",
);

/** chevron 定向平滑滚动。 */
function scrollByStep(direction: -1 | 1) {
  scrollEl.value?.scrollBy({
    left: direction * SCROLL_STEP,
    behavior: "smooth",
  });
}

// ── 标签交互 ──

/** 点击标签切换路由（刚发生拖拽平移时忽略，防误触）。 */
function handleSelect(path: string) {
  if (dragMoved || path === route.path) return;

  void router.push(path);
}

/** 关闭单个标签（关闭热区 / 中键共用）；关闭的是当前页则跟随 redirect。 */
function handleClose(path: string) {
  const redirect = tabsStore.closePath(path, route.path);

  if (redirect) void router.push(redirect);
}

/** 中键关闭（auxclick 的 button === 1）。 */
function handleAuxClick(event: MouseEvent, path: string, pinned: boolean) {
  if (event.button === 1 && !pinned) {
    event.preventDefault();
    handleClose(path);
  }
}

// ── 右键菜单：UContextMenu 包裹标签列表，capture 阶段记录目标标签 ──
const ctxTarget = ref<string | null>(null);

function onContextMenuCapture(event: MouseEvent) {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    "[data-tab-path]",
  );
  const path = target?.dataset.tabPath ?? null;

  if (!path) {
    // 非标签区域：不弹出自定义菜单（阻止 UContextMenu 的触发监听）
    event.stopPropagation();
    ctxTarget.value = null;

    return;
  }

  ctxTarget.value = path;
}

/** 各动作在当前目标上的可用性（驱动菜单项 disabled）。 */
const ctxAbility = computed(() => {
  const target = ctxTarget.value;

  if (!target || !paths.value.includes(target)) return null;

  if (isPinnedTab(target)) {
    return {
      refresh: true,
      close: false,
      left: false,
      right: false,
      others: false,
      all: false,
    };
  }

  const idx = paths.value.indexOf(target);

  return {
    refresh: true,
    close: true,
    left: paths.value.slice(0, idx).some((p) => !isPinnedTab(p)),
    right: paths.value.slice(idx + 1).some((p) => !isPinnedTab(p)),
    others: paths.value.some((p) => p !== target && !isPinnedTab(p)),
    all: true,
  };
});

/** 执行菜单动作：变更标签并按需导航（redirect 由 store 纯函数计算）。 */
function handleMenuAction(action: TabMenuAction) {
  const target = ctxTarget.value;

  if (!target) return;

  let redirect: string | null = null;

  switch (action) {
    case "refresh":
      tabsStore.refreshPath(target);
      break;
    case "close":
      redirect = tabsStore.closePath(target, route.path);
      break;
    case "close-left":
      redirect = tabsStore.closeLeft(target, route.path);
      break;
    case "close-right":
      redirect = tabsStore.closeRight(target, route.path);
      break;
    case "close-others":
      redirect = tabsStore.closeOthers(target, route.path);
      break;
    case "close-all":
      redirect = tabsStore.closeAll(route.path);
      break;
  }

  if (redirect) void router.push(redirect);
}

const ctxItems = computed<ContextMenuItem[][]>(() => {
  const ability = ctxAbility.value;

  return [
    [
      {
        label: t("layout.tags.refresh"),
        icon: "i-lucide-refresh-cw",
        disabled: !ability?.refresh,
        onSelect: () => handleMenuAction("refresh"),
      },
      {
        label: t("layout.tags.closeLeft"),
        icon: "i-lucide-arrow-left-to-line",
        disabled: !ability?.left,
        onSelect: () => handleMenuAction("close-left"),
      },
      {
        label: t("layout.tags.closeRight"),
        icon: "i-lucide-arrow-right-to-line",
        disabled: !ability?.right,
        onSelect: () => handleMenuAction("close-right"),
      },
      {
        label: t("layout.tags.closeOthers"),
        icon: "i-lucide-square-x",
        disabled: !ability?.others,
        onSelect: () => handleMenuAction("close-others"),
      },
      {
        label: t("layout.tags.closeAll"),
        icon: "i-lucide-circle-x",
        disabled: !ability?.all,
        onSelect: () => handleMenuAction("close-all"),
      },
    ],
    [
      {
        label: t("layout.tags.close"),
        icon: "i-lucide-x",
        color: "error",
        disabled: !ability?.close,
        onSelect: () => handleMenuAction("close"),
      },
    ],
  ];
});
</script>

<template>
  <nav
    class="flex h-10 shrink-0 items-center gap-1 border-b border-default bg-default px-2"
  >
    <!-- 左侧 chevron：仅当左方仍有未展示内容时可用 -->
    <UButton
      :aria-label="t('layout.tags.scrollLeft')"
      class="hidden md:flex"
      color="neutral"
      :disabled="!canScrollLeft"
      icon="i-lucide-chevron-left"
      size="xs"
      variant="ghost"
      @click="scrollByStep(-1)"
    />

    <UContextMenu :items="ctxItems" :ui="{ content: 'min-w-40' }">
      <!-- 手型光标仅在可滚动（溢出）时展示：无可平移内容时提示拖拽会误导 -->
      <div
        ref="scrollEl"
        class="tags-scroll min-w-0 flex-1 overflow-x-auto"
        :class="shadow === 'none' ? '' : 'cursor-grab active:cursor-grabbing'"
        :data-shadow="shadow"
        @scroll.passive="updateShadow"
        @wheel="onWheel"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerEnd"
        @pointercancel="onPointerEnd"
        @click.capture="onClickCapture"
        @contextmenu.capture="onContextMenuCapture"
      >
        <ul ref="listEl" class="flex w-max items-center gap-1 px-0.5 py-1.5">
          <li
            v-for="tab in tabs"
            :key="tab.path"
            class="flex shrink-0 items-center"
            data-tab-enter="true"
          >
            <!-- UButton 作为标签主体：图标 名称 尾部标识全部在 Button 内 -->
            <UButton
              :aria-current="tab.active ? 'page' : undefined"
              class="h-7 max-w-44 min-w-0 gap-1.5 px-3"
              :color="tab.active ? 'primary' : 'neutral'"
              :data-tab-active="tab.active"
              :data-tab-path="tab.path"
              size="sm"
              :variant="tab.active ? 'subtle' : 'outline'"
              :ui="{ base: tab.active ? '' : 'ring-default' }"
              @auxclick="handleAuxClick($event, tab.path, tab.pinned)"
              @click="handleSelect(tab.path)"
              @mousedown.middle.prevent
            >
              <UIcon
                v-if="tab.icon"
                :name="tab.icon"
                class="size-3.5 shrink-0"
              />
              <span v-if="tab.title !== null" class="truncate text-xs">
                {{ tab.title }}
              </span>
              <!-- 菜单未就绪且无快照：骨架占位（避免闪现原始路径） -->
              <USkeleton v-else class="h-3 w-14 rounded-full" />
              <UIcon
                v-if="tab.pinned"
                name="i-lucide-pin"
                class="size-3.5 shrink-0 text-muted"
              />
              <!-- 关闭热区：阻止指针 / 点击冒泡，避免触发标签自身的切换 -->
              <span
                v-else-if="tab.title !== null"
                :aria-label="t('layout.tags.closeNamed', { title: tab.title })"
                class="-mr-1 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-50 transition-opacity hover:bg-accented hover:opacity-100"
                role="button"
                tabindex="-1"
                @click.stop.prevent="handleClose(tab.path)"
                @pointerdown.stop
              >
                <UIcon name="i-lucide-x" class="size-3" />
              </span>
            </UButton>
          </li>
        </ul>
      </div>
    </UContextMenu>

    <!-- 右侧 chevron -->
    <UButton
      :aria-label="t('layout.tags.scrollRight')"
      class="hidden md:flex"
      color="neutral"
      :disabled="!canScrollRight"
      icon="i-lucide-chevron-right"
      size="xs"
      variant="ghost"
      @click="scrollByStep(1)"
    />
  </nav>
</template>

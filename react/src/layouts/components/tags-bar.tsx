import type { Key, MouseEvent as ReactMouseEvent } from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Dropdown,
  ScrollShadow,
  Separator,
  Skeleton,
  useOverlayState,
} from "@heroui/react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Pin,
  RefreshCw,
  SquareX,
  X,
} from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";

import { useMenus } from "@/hooks/use-menus";
import { type MenuNode } from "@/lib/api-types";
import { collectMenuPaths, flattenLeafMenus } from "@/lib/menu-utils";
import { isPinnedTab } from "@/lib/tabs-model";
import { useTabsStore } from "@/stores/tabs-store";

/** 右键菜单动作 id。 */
type TabMenuAction =
  | "refresh"
  | "close"
  | "close-left"
  | "close-right"
  | "close-others"
  | "close-all";

/** 鼠标中键按键值。 */
const MIDDLE_BUTTON = 1;

/** chevron 按钮单次滚动距离（px）。 */
const SCROLL_STEP = 160;

/** 滚动阴影可见性（含 horizontal 双侧态 leftRight）。 */
type ScrollState =
  | "auto"
  | "both"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "leftRight"
  | "none";

/**
 * 在捕获阶段截停指针 / 点击事件并向父级（HeroUI Button）隔离，
 * 使「Button 内部的关闭热区」不会误触 Button 自身的 press 导航；
 * click 由本 hook 直接执行关闭回调（React 合成事件已被一并截停）。
 */
function useIsolatedClick(onClose: () => void) {
  const ref = useRef<HTMLSpanElement>(null);
  const onCloseRef = useRef(onClose);

  onCloseRef.current = onClose;

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    const handle = (event: Event) => {
      event.stopPropagation();

      if (event.type === "click") {
        event.preventDefault();
        onCloseRef.current();
      }
    };

    el.addEventListener("pointerdown", handle, true);
    el.addEventListener("pointerup", handle, true);
    el.addEventListener("click", handle, true);

    return () => {
      el.removeEventListener("pointerdown", handle, true);
      el.removeEventListener("pointerup", handle, true);
      el.removeEventListener("click", handle, true);
    };
  }, []);

  return ref;
}

/**
 * 多标签页栏（TagsView）：置于顶栏下方，记录路由访问轨迹。
 * - 控制台为固定标签：恒在首位、不可关闭（ensureHomeTab 保证至少一个标签），
 *   结构为「菜单图标 名称 Pin 图标」；普通标签尾部为关闭热区；
 * - 标签主体为 HeroUI Button（未激活 outline / 激活 tertiary 原生样式），
 *   关闭热区位于 Button 内部（useIsolatedClick 隔离 press）；
 * - 标签过多时横向滚动（ScrollShadow 渐隐阴影 + chevron + 滚轮横滚），
 *   激活标签自动滚动进可视区；新标签带进场动画（styles/tags-bar.css）；
 * - 标题优先取菜单实时数据，其次取 sessionStorage 快照（刷新后立即可渲染
 *   中文标题），两者皆无时显示骨架占位；
 * - 与 KeepAliveOutlet 联动：打开的标签集合约束保活实例池，
 *   「关闭标签 = 销毁对应保活实例」。
 */
export function TagsBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: menuTree } = useMenus();

  const paths = useTabsStore((s) => s.paths);
  const cachedMeta = useTabsStore((s) => s.meta);
  const openPath = useTabsStore((s) => s.openPath);
  const closePathAction = useTabsStore((s) => s.closePath);
  const closeOthers = useTabsStore((s) => s.closeOthers);
  const closeLeft = useTabsStore((s) => s.closeLeft);
  const closeRight = useTabsStore((s) => s.closeRight);
  const closeAll = useTabsStore((s) => s.closeAll);
  const refreshPath = useTabsStore((s) => s.refreshPath);
  const syncMeta = useTabsStore((s) => s.syncMeta);
  const pruneTabs = useTabsStore((s) => s.pruneTabs);

  // 路由变化 → 登记打开标签（去重追加；控制台恒在首位由 store 保证）。
  useEffect(() => {
    openPath(pathname, pathname);
  }, [pathname, openPath]);

  // 菜单就绪 → 权限治理：清理恢复 / 权限变更后不可达的残留标签。
  useEffect(() => {
    if (!menuTree) return;

    pruneTabs(collectMenuPaths(menuTree as MenuNode[]));
  }, [menuTree, pruneTabs]);

  // 路径 → 标题 / 图标实时映射（菜单数据源）。
  const liveMetaByPath = useMemo(() => {
    const map = new Map<string, { title: string; icon?: string }>();

    for (const node of flattenLeafMenus(menuTree ?? [])) {
      if (node.to) map.set(node.to, { title: node.label, icon: node.icon });
    }

    return map;
  }, [menuTree]);

  // 菜单就绪 → 写入快照（新值覆盖旧值并持久化：刷新后无需等菜单接口）。
  useEffect(() => {
    if (liveMetaByPath.size === 0) return;

    syncMeta(Object.fromEntries(liveMetaByPath));
  }, [liveMetaByPath, syncMeta]);

  // ── 横向滚动 ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibility, setVisibility] = useState<ScrollState>("none");

  // 标签数量变化后重新挂载 wheel 监听。
  useEffect(() => {
    const el = scrollRef.current;

    if (!el) return;

    // 滚轮纵向增量转横向滚动（wheel 需 non-passive 才能 preventDefault）。
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;

      event.preventDefault();
      el.scrollLeft += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => el.removeEventListener("wheel", onWheel);
  }, [paths.length]);

  // 激活标签自动滚动进可视区。
  useEffect(() => {
    const active = scrollRef.current?.querySelector<HTMLElement>(
      '[data-tab-active="true"]',
    );

    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname, paths.length]);

  const canScrollLeft = visibility === "left" || visibility === "leftRight";
  const canScrollRight = visibility === "right" || visibility === "leftRight";

  /** chevron 定向平滑滚动。 */
  const scrollByStep = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({
      left: direction * SCROLL_STEP,
      behavior: "smooth",
    });
  };

  // ── 右键菜单：HeroUI Dropdown 受控（useOverlayState 管开合）+ 虚拟锚点定位 ──
  const ctxMenu = useOverlayState();
  const [ctxTarget, setCtxTarget] = useState<string | null>(null);
  const [ctxPos, setCtxPos] = useState({ x: 0, y: 0 });

  /** 各动作在当前目标上的可用性（驱动 disabledKeys）。 */
  const ctxAbility = useMemo(() => {
    if (!ctxTarget || !paths.includes(ctxTarget)) return null;

    if (isPinnedTab(ctxTarget)) {
      return {
        refresh: true,
        close: false,
        left: false,
        right: false,
        others: false,
        all: false,
      };
    }

    const idx = paths.indexOf(ctxTarget);

    return {
      refresh: true,
      close: true,
      left: paths.slice(0, idx).some((p) => !isPinnedTab(p)),
      right: paths.slice(idx + 1).some((p) => !isPinnedTab(p)),
      others: paths.some((p) => p !== ctxTarget && !isPinnedTab(p)),
      all: true,
    };
  }, [ctxTarget, paths]);

  const disabledKeys = useMemo<string[]>(() => {
    if (!ctxAbility) return [];

    return (
      [
        ["refresh", ctxAbility.refresh],
        ["close", ctxAbility.close],
        ["close-left", ctxAbility.left],
        ["close-right", ctxAbility.right],
        ["close-others", ctxAbility.others],
        ["close-all", ctxAbility.all],
      ] as const
    )
      .filter(([, enabled]) => !enabled)
      .map(([key]) => key);
  }, [ctxAbility]);

  /** 打开右键菜单：记录鼠标坐标与目标标签。 */
  const openContextMenu = (event: ReactMouseEvent, path: string) => {
    event.preventDefault();
    setCtxTarget(path);
    setCtxPos({ x: event.clientX, y: event.clientY });
    ctxMenu.open();
  };

  /** 执行菜单动作：变更标签并按需导航（redirect 由 store 纯函数计算）。 */
  const handleMenuAction = (key: Key) => {
    const target = ctxTarget;

    if (!target) return;

    let redirect: string | null = null;

    switch (key as TabMenuAction) {
      case "refresh":
        refreshPath(target);

        break;
      case "close":
        redirect = closePathAction(target, pathname);

        break;
      case "close-left":
        redirect = closeLeft(target, pathname);

        break;
      case "close-right":
        redirect = closeRight(target, pathname);

        break;
      case "close-others":
        redirect = closeOthers(target, pathname);

        break;
      case "close-all":
        redirect = closeAll(pathname);

        break;
    }

    if (redirect) void navigate({ href: redirect });
  };

  /** 点击标签切换路由。 */
  const handleSelect = (path: string) => {
    if (path !== pathname) void navigate({ href: path });
  };

  /** 关闭单个标签（关闭热区 / 中键共用）；关闭的是当前页则跟随 redirect。 */
  const handleClose = (path: string) => {
    const redirect = closePathAction(path, pathname);

    if (redirect) void navigate({ href: redirect });
  };

  return (
    <nav className="flex h-10 shrink-0 items-center gap-1 border-b border-separator bg-surface px-2">
      {/* 左侧 chevron：仅当左方仍有未展示内容时可用 */}
      <Button
        isIconOnly
        aria-label="向左滚动标签"
        className="hidden size-6 min-w-6 md:flex"
        isDisabled={!canScrollLeft}
        size="sm"
        variant="ghost"
        onPress={() => scrollByStep(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>

      <ScrollShadow
        ref={scrollRef}
        className="min-w-0 flex-1"
        orientation="horizontal"
        size={24}
        onVisibilityChange={setVisibility}
      >
        <ul className="flex w-max items-center gap-1 px-0.5 py-1.5">
          {paths.map((path) => {
            const live = liveMetaByPath.get(path);
            const cached = cachedMeta[path];
            const title =
              live?.title ??
              cached?.title ??
              (isPinnedTab(path) ? "控制台" : null);
            const icon = live?.icon ?? cached?.icon;
            const active = path === pathname;
            const pinned = isPinnedTab(path);

            return (
              <li
                key={path}
                className="flex shrink-0 items-center"
                data-tab-enter="true"
              >
                {/* HeroUI Button 作为标签主体：图标 名称 尾部标识全部在 Button 内 */}
                <Button
                  aria-current={active ? "page" : undefined}
                  className="h-7 min-w-0 max-w-44 gap-1.5 px-3"
                  data-tab-active={active}
                  size="sm"
                  variant={active ? "tertiary" : "outline"}
                  onAuxClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                    if (event.button === MIDDLE_BUTTON && !pinned) {
                      // 阻止中键默认行为（自动滚动 / 链接新开）
                      event.preventDefault();
                      handleClose(path);
                    }
                  }}
                  onContextMenu={(event) => openContextMenu(event, path)}
                  onPress={() => handleSelect(path)}
                >
                  {icon && (
                    <DynamicIcon
                      className="shrink-0 size-3.5"
                      name={icon as IconName}
                    />
                  )}
                  {title !== null ? (
                    <span className="truncate text-xs">{title}</span>
                  ) : (
                    /* 菜单未就绪且无快照：骨架占位（避免闪现原始路径） */
                    <Skeleton className="h-3 w-14 rounded-full" />
                  )}
                  {pinned ? (
                    <Pin className="shrink-0 text-muted" size={14} />
                  ) : (
                    title !== null && (
                      <TabCloseTrigger
                        title={title}
                        onClose={() => handleClose(path)}
                      />
                    )
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      </ScrollShadow>

      {/* 右侧 chevron */}
      <Button
        isIconOnly
        aria-label="向右滚动标签"
        className="hidden size-6 min-w-6 md:flex"
        isDisabled={!canScrollRight}
        size="sm"
        variant="ghost"
        onPress={() => scrollByStep(1)}
      >
        <ChevronRight className="size-4" />
      </Button>

      {/* 全局共享的右键菜单：虚拟锚点（1px fixed 按钮）移到鼠标坐标，
          Popover 以 bottom start 对齐锚点，实现 context menu 体验。
          受控流遵循 HeroUI 官方写法：isOpen/onOpenChange 挂最外层 Overlay。 */}
      <Dropdown.Root isOpen={ctxMenu.isOpen} onOpenChange={ctxMenu.setOpen}>
        <Dropdown.Trigger
          aria-hidden="true"
          className="fixed m-0 border-0 bg-transparent p-0 opacity-0 outline-none"
          style={{ left: ctxPos.x, top: ctxPos.y, width: 1, height: 1 }}
        />
        <Dropdown.Popover className="min-w-40" placement="bottom start">
          <Dropdown.Menu
            disabledKeys={disabledKeys}
            onAction={handleMenuAction}
          >
            <Dropdown.Item id="refresh" textValue="刷新页面">
              <RefreshCw className="size-4 shrink-0 text-muted" />
              刷新页面
            </Dropdown.Item>
            <Dropdown.Item id="close-left" textValue="关闭左侧">
              <ArrowLeftToLine className="size-4 shrink-0 text-muted" />
              关闭左侧
            </Dropdown.Item>
            <Dropdown.Item id="close-right" textValue="关闭右侧">
              <ArrowRightToLine className="size-4 shrink-0 text-muted" />
              关闭右侧
            </Dropdown.Item>
            <Dropdown.Item id="close-others" textValue="关闭其他">
              <SquareX className="size-4 shrink-0 text-muted" />
              关闭其他
            </Dropdown.Item>
            <Dropdown.Item id="close-all" textValue="全部关闭">
              <CircleX className="size-4 shrink-0 text-muted" />
              全部关闭
            </Dropdown.Item>

            <Separator />

            <Dropdown.Item id="close" textValue="关闭" variant="danger">
              <X className="size-4 shrink-0 text-danger" />
              关闭
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>
    </nav>
  );
}

/** 标签尾部关闭热区：X 图标 span（位于 Button 内部），经 useIsolatedClick
 * 在捕获阶段截停指针事件（RAC press 与 React 合成 click 均不再触发），
 * 由 hook 直接执行关闭；键盘可达性暂以鼠标为主（后续可加速捷键）。 */
function TabCloseTrigger({
  onClose,
  title,
}: {
  onClose: () => void;
  title: string;
}) {
  const ref = useIsolatedClick(onClose);

  return (
    <span
      ref={ref}
      aria-label={`关闭 ${title}`}
      className="-mr-1 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-50 transition-opacity hover:bg-default hover:opacity-100"
      role="button"
    >
      <X className="size-3" />
    </span>
  );
}

import type { Key, MouseEvent as ReactMouseEvent } from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Button,
  Dropdown,
  ScrollShadow,
  Separator,
  Skeleton,
  useOverlayState,
} from "@heroui/react";
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

import { useTranslation } from "@/i18n";
import { getMenuLabel } from "@/lib/menu-i18n";
import { type MenuNode } from "@/lib/api-types";
import { collectMenuPaths, flattenLeafMenus } from "@/lib/menu-utils";
import { LOGIN_REQUIRED_PATHS } from "@/lib/route-access";
import { routeTitleKeyByPath } from "@/lib/route-title";
import { isPinnedTab } from "@/lib/tabs-model";
import { useTabsStore } from "@/stores/tabs-store";

type TagsBarProps = {
  /** 服务端注入的可见菜单树（与侧边栏同源，用于标题/图标与权限治理） */
  menuTree: MenuNode[];
};

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

/** 鼠标左键按键值。 */
const MAIN_BUTTON = 0;

/** chevron 按钮单次滚动距离（px）。 */
const SCROLL_STEP = 160;

/** 判定为拖拽平移的位移阈值（px），避免误吞普通点击。 */
const DRAG_THRESHOLD = 6;

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
 * - 标签过多时横向滚动（ScrollShadow 渐隐阴影 + chevron + 滚轮横滚 +
 *   鼠标按住拖拽平移，隐藏原生滚动条避免占用固定栏高挤压标签），
 *   激活标签自动滚动进可视区；新标签带进场动画（styles/tags-bar.css）；
 * - 标题优先取菜单实时数据，其次取 sessionStorage 快照（刷新后立即可渲染
 *   中文标题），两者皆无时显示骨架占位；
 * - 「刷新」语义的 Next 适配：App Router 无 KeepAlive 实例池可重挂载，
 *   仅对当前激活标签提供刷新（router.refresh() 重取该路由 RSC 数据），
 *   后台标签的刷新项禁用（原语义依赖 KeepAlive，已记录为已知差异）。
 */
export function TagsBar({ menuTree }: TagsBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();

  const paths = useTabsStore((s) => s.paths);
  const cachedMeta = useTabsStore((s) => s.meta);
  const openPath = useTabsStore((s) => s.openPath);
  const closePathAction = useTabsStore((s) => s.closePath);
  const closeOthers = useTabsStore((s) => s.closeOthers);
  const closeLeft = useTabsStore((s) => s.closeLeft);
  const closeRight = useTabsStore((s) => s.closeRight);
  const closeAll = useTabsStore((s) => s.closeAll);
  const syncMeta = useTabsStore((s) => s.syncMeta);
  const pruneTabs = useTabsStore((s) => s.pruneTabs);

  // 路由变化 → 登记打开标签（去重追加；控制台恒在首位由 store 保证）。
  useEffect(() => {
    openPath(pathname, pathname);
  }, [pathname, openPath]);

  // 菜单就绪 → 权限治理：清理恢复 / 权限变更后不可达的残留标签。
  // 登录白名单路径（/ 与 /account）不属于菜单权限体系，登录即可达，
  // 用户显式打开的标签不应被菜单加载后的治理误删。
  useEffect(() => {
    pruneTabs(
      new Set([...collectMenuPaths(menuTree), ...LOGIN_REQUIRED_PATHS]),
    );
  }, [menuTree, pruneTabs]);

  // 路径 → 标题 / 图标实时映射（菜单数据源；标题经 i18nKey 取词，语言切换即更新）。
  const liveMetaByPath = useMemo(() => {
    const map = new Map<string, { title: string; icon?: string }>();

    for (const node of flattenLeafMenus(menuTree)) {
      if (node.to) {
        map.set(node.to, { title: getMenuLabel(node, t), icon: node.icon });
      }
    }

    return map;
  }, [menuTree, t]);

  // 菜单就绪 → 写入快照（新值覆盖旧值并持久化：刷新后无需等菜单接口）。
  useEffect(() => {
    if (liveMetaByPath.size === 0) return;

    syncMeta(Object.fromEntries(liveMetaByPath));
  }, [liveMetaByPath, syncMeta]);

  // ── 横向滚动 ──
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibility, setVisibility] = useState<ScrollState>("none");
  // 最近一次指针手势是否发生了拖拽平移（吞掉其后的 click，防误切换标签）。
  const dragMovedRef = useRef(false);

  // 溢出检测 / 滚轮横滚 / 按住拖拽平移：统一挂在滚动容器上（一次性挂载）。
  // 可见性必须自管理——隐藏原生滚动条后不再有「滚动条出现改变容器
  // content-box」的信号；且新增标签只增加内容宽度、不改变容器尺寸，
  // 需同时用 ResizeObserver 观察内容元素。
  useEffect(() => {
    const el = scrollRef.current;

    if (!el) return;

    /** 由横向剩余滚动量推导 chevron 禁用态与渐隐阴影状态。 */
    const updateVisibility = () => {
      const max = el.scrollWidth - el.clientWidth;

      if (max <= 1) {
        setVisibility("none");

        return;
      }

      const start = Math.abs(el.scrollLeft);

      if (start > 1 && start < max - 1) {
        setVisibility("leftRight");
      } else if (start > 1) {
        setVisibility("left");
      } else {
        setVisibility("right");
      }
    };

    updateVisibility();

    el.addEventListener("scroll", updateVisibility, { passive: true });

    const resizeObserver = new ResizeObserver(updateVisibility);

    resizeObserver.observe(el);

    if (el.firstElementChild) resizeObserver.observe(el.firstElementChild);

    // 滚轮纵向增量转横向滚动（wheel 需 non-passive 才能 preventDefault）。
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;

      event.preventDefault();
      el.scrollLeft += event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    };

    // 按住拖拽平移（仅鼠标左键）：位移超过阈值判定为拖动并捕获指针，
    // 拖动中阻止选中文本；结束后的 click 一律吞掉防止误触发点击。
    let drag: { startX: number; startScroll: number } | null = null;

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== MAIN_BUTTON) return;

      drag = { startX: event.clientX, startScroll: el.scrollLeft };
      dragMovedRef.current = false;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag) return;

      const dx = event.clientX - drag.startX;

      if (!dragMovedRef.current && Math.abs(dx) < DRAG_THRESHOLD) return;

      if (!dragMovedRef.current) {
        dragMovedRef.current = true;
        el.setPointerCapture(event.pointerId);
      }

      event.preventDefault();
      el.scrollLeft = drag.startScroll - dx;
    };

    const onPointerEnd = () => {
      drag = null;
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!dragMovedRef.current) return;

      event.preventDefault();
      event.stopPropagation();
      dragMovedRef.current = false;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerEnd);
    el.addEventListener("pointercancel", onPointerEnd);
    el.addEventListener("click", onClickCapture, true);

    return () => {
      el.removeEventListener("scroll", updateVisibility);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerEnd);
      el.removeEventListener("pointercancel", onPointerEnd);
      el.removeEventListener("click", onClickCapture, true);
      resizeObserver.disconnect();
    };
  }, []);

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
        // 固定标签（控制台）可刷新：router.refresh 重取首页 RSC 数据
        refresh: ctxTarget === pathname,
        close: false,
        left: false,
        right: false,
        others: false,
        all: false,
      };
    }

    const idx = paths.indexOf(ctxTarget);

    return {
      // 仅当前激活标签可刷新（App Router 无后台标签实例，见组件头注）
      refresh: ctxTarget === pathname,
      close: true,
      left: paths.slice(0, idx).some((p) => !isPinnedTab(p)),
      right: paths.slice(idx + 1).some((p) => !isPinnedTab(p)),
      others: paths.some((p) => p !== ctxTarget && !isPinnedTab(p)),
      all: true,
    };
  }, [ctxTarget, paths, pathname]);

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
        // 刷新 = 重取当前路由的服务端数据（RSC），等价 React 版实例重挂载
        router.refresh();

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

    if (redirect) router.push(redirect);
  };

  /** 点击标签切换路由（刚发生拖拽平移时忽略，防误触）。 */
  const handleSelect = (path: string) => {
    if (dragMovedRef.current || path === pathname) return;

    router.push(path);
  };

  /** 关闭单个标签（关闭热区 / 中键共用）；关闭的是当前页则跟随 redirect。 */
  const handleClose = (path: string) => {
    const redirect = closePathAction(path, pathname);

    if (redirect) router.push(redirect);
  };

  return (
    <nav className="flex h-10 shrink-0 items-center gap-1 border-b border-separator bg-surface px-2">
      {/* 左侧 chevron：仅当左方仍有未展示内容时可用 */}
      <Button
        isIconOnly
        aria-label={t("layout.tags.scrollLeft")}
        className="hidden size-6 min-w-6 md:flex"
        isDisabled={!canScrollLeft}
        size="sm"
        variant="ghost"
        onPress={() => scrollByStep(-1)}
      >
        <ChevronLeft size={16} />
      </Button>

      <ScrollShadow
        ref={scrollRef}
        hideScrollBar
        // 手型光标仅在可滚动（溢出）时展示：无可平移内容时提示拖拽会误导。
        className={`min-w-0 flex-1 ${
          visibility === "none" ? "" : "cursor-grab active:cursor-grabbing"
        }`}
        orientation="horizontal"
        size={24}
        visibility={visibility === "leftRight" ? "both" : visibility}
      >
        <ul className="flex w-max items-center gap-1 px-0.5 py-1.5">
          {paths.map((path) => {
            const live = liveMetaByPath.get(path);
            const cached = cachedMeta[path];
            const routeTitleKey = routeTitleKeyByPath.get(path);
            const title =
              live?.title ??
              cached?.title ??
              (routeTitleKey !== undefined
                ? t(routeTitleKey)
                : isPinnedTab(path)
                  ? t("menu.pageTitle.console")
                  : null);
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
        aria-label={t("layout.tags.scrollRight")}
        className="hidden size-6 min-w-6 md:flex"
        isDisabled={!canScrollRight}
        size="sm"
        variant="ghost"
        onPress={() => scrollByStep(1)}
      >
        <ChevronRight size={16} />
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
            <Dropdown.Item id="refresh" textValue={t("layout.tags.refresh")}>
              <RefreshCw className="size-4 shrink-0 text-muted" />
              {t("layout.tags.refresh")}
            </Dropdown.Item>
            <Dropdown.Item
              id="close-left"
              textValue={t("layout.tags.closeLeft")}
            >
              <ArrowLeftToLine className="size-4 shrink-0 text-muted" />
              {t("layout.tags.closeLeft")}
            </Dropdown.Item>
            <Dropdown.Item
              id="close-right"
              textValue={t("layout.tags.closeRight")}
            >
              <ArrowRightToLine className="size-4 shrink-0 text-muted" />
              {t("layout.tags.closeRight")}
            </Dropdown.Item>
            <Dropdown.Item
              id="close-others"
              textValue={t("layout.tags.closeOthers")}
            >
              <SquareX className="size-4 shrink-0 text-muted" />
              {t("layout.tags.closeOthers")}
            </Dropdown.Item>
            <Dropdown.Item id="close-all" textValue={t("layout.tags.closeAll")}>
              <CircleX className="size-4 shrink-0 text-muted" />
              {t("layout.tags.closeAll")}
            </Dropdown.Item>

            <Separator />

            <Dropdown.Item
              id="close"
              textValue={t("layout.tags.close")}
              variant="danger"
            >
              <X className="size-4 shrink-0 text-danger" />
              {t("layout.tags.close")}
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
  const { t } = useTranslation();

  return (
    <span
      ref={ref}
      aria-label={t("layout.tags.closeNamed", { title })}
      className="-mr-1 flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full opacity-50 transition-opacity hover:bg-default hover:opacity-100"
      role="button"
    >
      <X className="size-3" />
    </span>
  );
}

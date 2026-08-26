import { create } from "zustand";

import { THEME_PALETTES } from "@/themes/color-palettes";
import {
  runViewTransition,
  type TransitionDirection,
} from "@/themes/transition-direction";
import {
  isRouteTransition,
  type RouteTransitionId,
} from "@/themes/route-transitions";
import {
  isRouteTransitionSpeed,
  type RouteTransitionSpeedId,
} from "@/themes/route-transitions";

const STORAGE_KEY = "better-admin-design-theme";
const DIRECTION_KEY = "better-admin-transition-direction";
const ROUTE_TRANSITION_KEY = "better-admin-route-transition";
const ROUTE_TRANSITION_SPEED_KEY = "better-admin-route-transition-speed";
const SHOW_TABS_KEY = "better-admin-show-tabs";

// ── DOM 操作（纯函数，不依赖 React） ──

function applyThemeToDOM(themeId: string): void {
  const root = document.documentElement;

  if (themeId === "default" || !THEME_PALETTES.some((p) => p.id === themeId)) {
    root.removeAttribute("data-design-theme");
  } else {
    root.setAttribute("data-design-theme", themeId);
  }
}

function readThemeFromStorage(): string {
  if (typeof window === "undefined") return "default";

  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored && THEME_PALETTES.some((p) => p.id === stored)) {
    return stored;
  }

  return "default";
}

function writeThemeToStorage(themeId: string): void {
  localStorage.setItem(STORAGE_KEY, themeId);
}

function readDirectionFromStorage(): TransitionDirection {
  if (typeof window === "undefined") return "ltr";

  const stored = localStorage.getItem(DIRECTION_KEY);

  if (
    stored === "ltr" ||
    stored === "rtl" ||
    stored === "ttb" ||
    stored === "btt"
  ) {
    return stored;
  }

  return "ltr";
}

function writeDirectionToStorage(direction: TransitionDirection): void {
  localStorage.setItem(DIRECTION_KEY, direction);
}

function readRouteTransitionFromStorage(): RouteTransitionId {
  if (typeof window === "undefined") return "none";

  const stored = localStorage.getItem(ROUTE_TRANSITION_KEY);

  if (stored && isRouteTransition(stored)) return stored;

  return "none";
}

function writeRouteTransitionToStorage(id: RouteTransitionId): void {
  localStorage.setItem(ROUTE_TRANSITION_KEY, id);
}

function readSpeedFromStorage(): RouteTransitionSpeedId {
  if (typeof window === "undefined") return "normal";

  const stored = localStorage.getItem(ROUTE_TRANSITION_SPEED_KEY);

  if (stored && isRouteTransitionSpeed(stored)) return stored;

  return "normal";
}

function writeSpeedToStorage(speed: RouteTransitionSpeedId): void {
  localStorage.setItem(ROUTE_TRANSITION_SPEED_KEY, speed);
}

function readShowTabsFromStorage(): boolean {
  if (typeof window === "undefined") return true;

  return localStorage.getItem(SHOW_TABS_KEY) !== "0";
}

function writeShowTabsToStorage(show: boolean): void {
  localStorage.setItem(SHOW_TABS_KEY, show ? "1" : "0");
}

/** 把路由过渡速度档位应用到 <html> 的 data-rt-speed 属性（供 CSS 倍率生效）。 */
export function applyRouteTransitionSpeedToDOM(
  speed: RouteTransitionSpeedId,
): void {
  const root = document.documentElement;

  if (speed === "normal") {
    root.removeAttribute("data-rt-speed");
  } else {
    root.setAttribute("data-rt-speed", speed);
  }
}

/** 把路由过渡动画 id 应用到 <html> 的 data-route-transition 属性（供 CSS 选择器启用动画）。 */
export function applyRouteTransitionToDOM(id: RouteTransitionId): void {
  const root = document.documentElement;

  if (id === "none") {
    root.removeAttribute("data-route-transition");
  } else {
    root.setAttribute("data-route-transition", id);
  }
}

// ── Zustand Store ──

interface DesignThemeState {
  /** 当前激活的主题色 ID */
  designThemeId: string;
  /** 当前动画方向 */
  transitionDirection: TransitionDirection;
  /** 路由过渡动画（页面切换；'none' 表示关闭） */
  routeTransition: RouteTransitionId;
  /** 路由过渡播放速度档位 */
  routeTransitionSpeed: RouteTransitionSpeedId;
  /** 是否显示多标签页栏（仅隐藏 UI，不清空已打开的标签数据） */
  showTabs: boolean;
  /** 切换主题色（带 ViewTransition 动画 + DOM + localStorage） */
  setDesignTheme: (id: string) => void;
  /** 设置动画方向 */
  setTransitionDirection: (direction: TransitionDirection) => void;
  /** 设置路由过渡动画（写 store + DOM + localStorage） */
  setRouteTransition: (id: RouteTransitionId) => void;
  /** 设置路由过渡速度（写 store + DOM + localStorage） */
  setRouteTransitionSpeed: (speed: RouteTransitionSpeedId) => void;
  /** 设置是否显示多标签页（写 store + localStorage） */
  setShowTabs: (show: boolean) => void;
}

export const useDesignThemeStore = create<DesignThemeState>((set) => ({
  designThemeId: "default",
  transitionDirection: "ltr",
  routeTransition: "none",
  routeTransitionSpeed: "normal",
  showTabs: true,

  setDesignTheme: (id) => {
    const validId =
      id === "default" || THEME_PALETTES.some((p) => p.id === id)
        ? id
        : "default";

    // 读取当前方向用于本次动画
    const direction = useDesignThemeStore.getState().transitionDirection;

    void runViewTransition(() => {
      set({ designThemeId: validId });
      applyThemeToDOM(validId);
      writeThemeToStorage(validId);
    }, direction);
  },

  setTransitionDirection: (direction) => {
    set({ transitionDirection: direction });
    writeDirectionToStorage(direction);
  },

  setRouteTransition: (id) => {
    const validId = isRouteTransition(id) ? id : "none";

    set({ routeTransition: validId });
    applyRouteTransitionToDOM(validId);
    writeRouteTransitionToStorage(validId);
  },

  setRouteTransitionSpeed: (speed) => {
    const validSpeed = isRouteTransitionSpeed(speed) ? speed : "normal";

    set({ routeTransitionSpeed: validSpeed });
    applyRouteTransitionSpeedToDOM(validSpeed);
    writeSpeedToStorage(validSpeed);
  },

  setShowTabs: (show) => {
    set({ showTabs: show });
    writeShowTabsToStorage(show);
  },
}));

/**
 * 初始化主题色（在 React 渲染前调用，防止闪烁）。
 * 从 localStorage 读取 → 应用到 DOM → 同步 store 状态。
 */
export function initDesignTheme(): void {
  const stored = readThemeFromStorage();
  const direction = readDirectionFromStorage();
  const routeTransition = readRouteTransitionFromStorage();
  const routeTransitionSpeed = readSpeedFromStorage();
  const showTabs = readShowTabsFromStorage();

  applyThemeToDOM(stored);
  applyRouteTransitionToDOM(routeTransition);
  applyRouteTransitionSpeedToDOM(routeTransitionSpeed);

  useDesignThemeStore.setState({
    designThemeId: stored,
    transitionDirection: direction,
    routeTransition,
    routeTransitionSpeed,
    showTabs,
  });
}

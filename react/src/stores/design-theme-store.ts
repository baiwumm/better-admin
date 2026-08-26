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
const THEME_MODE_KEY = "better-admin-theme-mode";

/** 主题模式：跟随系统 / 浅色 / 深色 */
export type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

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

function readThemeModeFromStorage(): ThemeMode {
  if (typeof window === "undefined") return "system";

  const stored = localStorage.getItem(THEME_MODE_KEY);

  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }

  return "system";
}

function writeThemeModeToStorage(mode: ThemeMode): void {
  localStorage.setItem(THEME_MODE_KEY, mode);
}

/** 读取系统明暗偏好（无 matchMedia 环境回退 light）。 */
export function getSystemPreference(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * 把已解析的主题模式应用到 <html>（classList + data-theme）。
 * 行为对齐 HeroUI applyThemeToDOM：移除旧的明暗 class、加新的、设 data-theme。
 */
function applyThemeModeToDOM(resolved: ResolvedTheme): void {
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  root.setAttribute("data-theme", resolved);
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

/** 偏好设置初始状态（重置按钮的目标状态；store 初始值与 reset 共用此单一来源） */
const DEFAULT_PREFERENCES = {
  designThemeId: "default",
  transitionDirection: "ltr",
  routeTransition: "none",
  routeTransitionSpeed: "normal",
  showTabs: true,
  themeMode: "system",
} as const;

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
  /** 主题模式意图（system / light / dark） */
  themeMode: ThemeMode;
  /** 系统明暗偏好快照（themeMode 为 system 时跟随；由 matchMedia 监听维护） */
  systemPreference: ResolvedTheme;
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
  /**
   * 设置主题模式（写 store + DOM class/data-theme + localStorage；
   * resolved 实际变化时带揭示动画）。非法值收窄为 system。
   */
  setThemeMode: (mode: ThemeMode) => void;
  /**
   * 一键恢复全部偏好设置为初始状态（state + DOM + localStorage，带一次揭示动画）。
   * Promise 在揭示动画完全结束后 resolve（调用方可据此错峰后续 UI 操作，
   * 避免 HeroUI Toast 自带的 startViewTransition 与本 VT 并发互踩）。
   */
  resetPreferences: () => Promise<void>;
}

export const useDesignThemeStore = create<DesignThemeState>((set) => ({
  ...DEFAULT_PREFERENCES,
  systemPreference: getSystemPreference(),

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

  setThemeMode: (mode) => {
    // 收窄为合法主题模式
    const validMode =
      mode === "light" || mode === "dark" || mode === "system"
        ? mode
        : "system";

    const { themeMode, transitionDirection } = useDesignThemeStore.getState();

    if (validMode === themeMode) return;

    const targetResolved: ResolvedTheme =
      validMode === "system"
        ? getSystemPreference()
        : (validMode as ResolvedTheme);
    // 以 DOM 实际生效的明暗为当前值（init 时已应用）
    const currentResolved: ResolvedTheme =
      document.documentElement.classList.contains("dark") ? "dark" : "light";

    if (targetResolved === currentResolved) {
      // 仅意图变化（如 system 已匹配当前外观），无需动画
      set({ themeMode: validMode });
      writeThemeModeToStorage(validMode);

      return;
    }

    void runViewTransition(() => {
      set({ themeMode: validMode });
      applyThemeModeToDOM(targetResolved);
      writeThemeModeToStorage(validMode);
    }, transitionDirection);
  },

  resetPreferences: (): Promise<void> => {
    // 取重置前的方向用于本次揭示动画（方向本身也会被重置为 ltr）
    const { transitionDirection, systemPreference } =
      useDesignThemeStore.getState();

    // runViewTransition 结束时会把「启动前临时移除的 data-route-transition」
    // 还原回旧值；而本次 mutate 可能已把它重置为 none，故结束后再按 store
    // 终态校正一次，保证 DOM 与 store 一致
    return runViewTransition(() => {
      set({ ...DEFAULT_PREFERENCES });
      applyThemeToDOM(DEFAULT_PREFERENCES.designThemeId);
      applyRouteTransitionToDOM(DEFAULT_PREFERENCES.routeTransition);
      applyRouteTransitionSpeedToDOM(DEFAULT_PREFERENCES.routeTransitionSpeed);
      writeThemeToStorage(DEFAULT_PREFERENCES.designThemeId);
      writeDirectionToStorage(DEFAULT_PREFERENCES.transitionDirection);
      writeRouteTransitionToStorage(DEFAULT_PREFERENCES.routeTransition);
      writeSpeedToStorage(DEFAULT_PREFERENCES.routeTransitionSpeed);
      writeShowTabsToStorage(DEFAULT_PREFERENCES.showTabs);

      // 主题模式回「跟随系统」并同步 DOM（resolved 幂等，仅意图/存储变化）
      applyThemeModeToDOM(systemPreference);
      writeThemeModeToStorage(DEFAULT_PREFERENCES.themeMode);
    }, transitionDirection).then(() => {
      applyRouteTransitionToDOM(useDesignThemeStore.getState().routeTransition);
    });
  },
}));

/**
 * 初始化全部偏好（在 React 渲染前调用，防止闪烁）。
 * 从 localStorage 读取 → 应用到 DOM → 同步 store 状态；
 * 并注册系统明暗偏好监听（themeMode 为 system 时跟随切换，无动画直接生效）。
 */
export function initDesignTheme(): void {
  const stored = readThemeFromStorage();
  const direction = readDirectionFromStorage();
  const routeTransition = readRouteTransitionFromStorage();
  const routeTransitionSpeed = readSpeedFromStorage();
  const showTabs = readShowTabsFromStorage();
  const themeMode = readThemeModeFromStorage();
  const systemPreference = getSystemPreference();

  applyThemeToDOM(stored);
  applyRouteTransitionToDOM(routeTransition);
  applyRouteTransitionSpeedToDOM(routeTransitionSpeed);
  applyThemeModeToDOM(themeMode === "system" ? systemPreference : themeMode);

  useDesignThemeStore.setState({
    designThemeId: stored,
    transitionDirection: direction,
    routeTransition,
    routeTransitionSpeed,
    showTabs,
    themeMode,
    systemPreference,
  });

  // 系统明暗偏好变化：意图为 system 时跟随切换（与 HeroUI 原行为一致：直切无动画）
  if (typeof window !== "undefined" && window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (e) => {
        const next: ResolvedTheme = e.matches ? "dark" : "light";

        useDesignThemeStore.setState({ systemPreference: next });

        if (useDesignThemeStore.getState().themeMode === "system") {
          applyThemeModeToDOM(next);
        }
      });
  }
}

/**
 * 当前实际生效的明暗外观（themeMode 为 system 时取系统偏好）。
 * 原子 selector 组合，供 Logo 明暗切换等只关心 resolved 值的场景使用。
 */
export function useResolvedTheme(): ResolvedTheme {
  const themeMode = useDesignThemeStore((s) => s.themeMode);
  const systemPreference = useDesignThemeStore((s) => s.systemPreference);

  return themeMode === "system" ? systemPreference : themeMode;
}

import { create } from "zustand";

import { THEME_PALETTES } from "@/themes/color-palettes";
import {
  runViewTransition,
  type TransitionDirection,
} from "@/themes/transition-direction";

const STORAGE_KEY = "better-admin-design-theme";
const DIRECTION_KEY = "better-admin-transition-direction";

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

// ── Zustand Store ──

interface DesignThemeState {
  /** 当前激活的主题色 ID */
  designThemeId: string;
  /** 当前动画方向 */
  transitionDirection: TransitionDirection;
  /** 切换主题色（带 ViewTransition 动画 + DOM + localStorage） */
  setDesignTheme: (id: string) => void;
  /** 设置动画方向 */
  setTransitionDirection: (direction: TransitionDirection) => void;
}

export const useDesignThemeStore = create<DesignThemeState>((set) => ({
  designThemeId: "default",
  transitionDirection: "ltr",

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
}));

/**
 * 初始化主题色（在 React 渲染前调用，防止闪烁）。
 * 从 localStorage 读取 → 应用到 DOM → 同步 store 状态。
 */
export function initDesignTheme(): void {
  const stored = readThemeFromStorage();
  const direction = readDirectionFromStorage();

  applyThemeToDOM(stored);

  useDesignThemeStore.setState({
    designThemeId: stored,
    transitionDirection: direction,
  });
}

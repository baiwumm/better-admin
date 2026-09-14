import { useCallback } from "react";

import {
  useDesignThemeStore,
  type ThemeMode,
} from "@/stores/design-theme-store";

/**
 * 主题模式切换 hook（带 ViewTransition 揭示动画）。
 *
 * 主题模式意图的真源是 design-theme-store（zustand 单例）：
 * HeroUI 的 useTheme() 为每个调用点独立的 useState（无 Provider context 共享），
 * 多组件各自读写会互不同步（曾在「重置偏好」时因过期意图误判短路导致不生效），
 * 故全部收敛至 store；DOM class / data-theme / localStorage 均由 store action 维护。
 */
export function useThemeModeTransition() {
  const theme = useDesignThemeStore((s) => s.themeMode);
  const setThemeMode = useDesignThemeStore((s) => s.setThemeMode);

  // RadioGroup onChange 上报 string，此处仅做类型收窄；非法值由 action 兜底为 system
  const switchThemeMode = useCallback(
    (mode: string) => {
      setThemeMode(mode as ThemeMode);
    },
    [setThemeMode],
  );

  return { theme, switchThemeMode };
}

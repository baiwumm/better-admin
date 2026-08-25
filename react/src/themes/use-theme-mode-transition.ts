import { useCallback } from "react";
import { useTheme } from "@heroui/react";

import { useDesignThemeStore } from "@/stores/design-theme-store";
import {
  runViewTransition,
  type TransitionDirection,
} from "@/themes/transition-direction";

/**
 * 主题模式切换（带 ViewTransition 动画）
 *
 * HeroUI 的 useTheme().setTheme 只在 React state 中记录意图，
 * 真正的 dark class / data-theme 切换发生在 layout effect（异步于 setState）。
 * 为了让 ViewTransition 快照正确捕获旧→新两帧，这里在 transition 回调中
 * 同步手动切换 DOM（与 HeroUI applyThemeToDOM 行为一致：toggle class + 设 data-theme），
 * 同时调用 HeroUI setTheme 保持 store 状态一致。
 */
export function useThemeModeTransition() {
  const { theme, setTheme } = useTheme("system");
  const transitionDirection = useDesignThemeStore((s) => s.transitionDirection);

  const switchThemeMode = useCallback(
    async (mode: string) => {
      // 收窄为合法主题模式
      const nextMode = (
        mode === "light" || mode === "dark" || mode === "system"
          ? mode
          : "system"
      ) as "system" | "light" | "dark";

      if (nextMode === theme) return;

      // 解析目标 resolved（system 跟随系统）
      const resolved: "light" | "dark" =
        nextMode === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : nextMode;

      // 当前 resolved
      const current: "light" | "dark" =
        document.documentElement.classList.contains("dark") ? "dark" : "light";

      if (resolved === current) {
        // 仅意图变化（如 system 已匹配当前），无需动画
        setTheme(nextMode);

        return;
      }

      const direction: TransitionDirection =
        useDesignThemeStore.getState().transitionDirection;

      await runViewTransition(() => {
        // 同步切换 DOM（与 HeroUI applyThemeToDOM 一致）
        document.documentElement.classList.remove(current);
        document.documentElement.classList.add(resolved);
        document.documentElement.setAttribute("data-theme", resolved);

        // 同步 HeroUI store 意图
        setTheme(nextMode);
      }, direction);
    },
    [theme, setTheme, transitionDirection],
  );

  return { theme, switchThemeMode };
}

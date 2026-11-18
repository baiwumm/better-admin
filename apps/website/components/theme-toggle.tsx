"use client";

import { Button } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  ThemeAnimationType,
  useThemeAnimation,
} from "theme-switch-animation/react";

/**
 * 顶部主题切换
 *
 * 外观与顶栏其它图标按钮（文档 / 演示 / GitHub）一致：HeroUI `Button isIconOnly`
 * + `variant="outline"` + `size="sm"`，由按钮自身的 base 样式统一尺寸与描边。
 *
 * 切换动作走 `theme-switch-animation` 的 view transition 动画：
 * 以这颗按钮为圆心做「圆形模糊扩散」，新主题从按钮位置晕开覆盖整屏；
 * 浏览器不支持 View Transitions、或用户开了 `prefers-reduced-motion` 时，
 * 库内部会自动降级为直接切换，状态照常更新。
 *
 * 受控模式（`isDark` + `onChange` 同时提供）：库不碰 localStorage、不自己改 class，
 * 只负责注入动画样式 + 在转场回调里等 next-themes 真正把 `dark` class 写到 `<html>` 上，
 * 因此主题的单一事实源仍然是 next-themes（RootProvider 里配置）。
 * 注意 `disableTransitionOnChange: true` 必须保留——它保证截图前后 DOM 颜色不处于
 * 过渡中间态，否则动画末帧可能露出半透明的旧配色。
 *
 * ref 必须是真实 DOM 节点：库要拿它的 `getBoundingClientRect()` 算圆形扩散圆心，
 * HeroUI 的 Button 会把 ref 透传到内部 `<button>`，所以直接挂上去即可。
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const { ref, toggleTheme } = useThemeAnimation<HTMLButtonElement>({
    animationType: ThemeAnimationType.CIRCLE_BLUR,
    isDark,
    onChange: (next) => setTheme(next ? "dark" : "light"),
  });

  return (
    <Button
      ref={ref}
      isIconOnly
      aria-label={isDark ? "切换到浅色主题" : "切换到深色主题"}
      size="sm"
      variant="outline"
      onPress={toggleTheme}
    >
      {/* 图标表示「点下去会切到哪一档」：亮色显示月亮，暗色显示太阳 */}
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

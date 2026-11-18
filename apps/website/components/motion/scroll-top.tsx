"use client";

/**
 * 回到顶部（2026-11-18 重做）
 *
 * 旧版在一个 48px 圆里同时放「进度环 + 百分比」，且百分比常驻、悬停才换成箭头：
 * 触屏没有 hover，永远只看到一个百分数，看不出这是个按钮；百分比每 1% 重渲染
 * 还会让数字跳动，进度环本身也没有过渡（滚动时是跳格的）。
 *
 * 现在的分工：
 * 1. 箭头常驻 —— 一眼能读出「点了会回到顶部」，这是按钮的主信息；
 * 2. 进度环退到边缘做次要信息 —— HeroUI `ProgressCircle` 画 2px 环，其
 *    `stroke-dashoffset` 自带 300ms 过渡（且内置 motion-reduce 处理），
 *    滚动时环是连续滑动而不是跳变；百分比只留在 aria-label 里给读屏；
 * 3. 入场 / 离场用弹簧（stiffness 420 / damping 30）：浮钮从下往上轻微
 *    「弹」出来，比线性 tween 更像实体按钮；`prefers-reduced-motion` 时
 *    直接取消动画并禁用按压缩放。
 *
 * 取的是 motion 的 `useScroll`（站点已依赖 motion，文档页滚动的是 window，
 * 实测无内层滚动容器）。没有引入 beui/smooth-scroll：它带 lenis，会把全站
 * 滚轮接管成惯性感滚动，也会和 fumadocs 的 sticky 导航/侧边栏产生冲突面。
 */

import { cn, ProgressCircle } from "@heroui/react";
import { ArrowUp } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import { useState } from "react";

/** 滚动超过这个像素才出现，避免刚进页面就被一个浮钮占住右下角 */
const SHOW_AFTER = 480;

export function ScrollTop({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();
  const [pct, setPct] = useState(0);
  const [visible, setVisible] = useState(false);

  // 只在整数百分比变化时重渲染，滚动过程中不被 setState 拖住
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.round(p * 100);

    setPct((prev) => (prev === next ? prev : next));
  });
  useMotionValueEvent(scrollY, "change", (y) => {
    const next = y > SHOW_AFTER;

    setVisible((prev) => (prev === next ? prev : next));
  });

  const toTop = () =>
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          animate={{ opacity: 1, scale: 1, y: 0 }}
          aria-label="回到顶部"
          className={cn(
            "group fixed end-6 bottom-6 z-50 grid size-11 place-items-center rounded-full",
            "border border-border bg-background/80 text-muted backdrop-blur-md",
            "shadow-lg shadow-black/5 transition-colors",
            "hover:border-accent/40 hover:text-accent",
            className,
          )}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={
            reduce
              ? { duration: 0 }
              : { damping: 30, mass: 0.8, stiffness: 420, type: "spring" }
          }
          type="button"
          whileTap={reduce ? undefined : { scale: 0.94 }}
          onClick={toTop}
        >
          {/* 进度环：内缩 3px 贴在按钮内侧，不压 border；value 变化由组件自带的
              stroke-dashoffset 过渡平滑，百分比通过 aria 暴露 */}
          <ProgressCircle
            aria-label={`阅读进度 ${pct}%`}
            className="pointer-events-none absolute inset-[3px]"
            color="accent"
            value={pct}
          >
            <ProgressCircle.Track className="size-full">
              <ProgressCircle.TrackCircle strokeWidth={2} />
              <ProgressCircle.FillCircle strokeWidth={2} />
            </ProgressCircle.Track>
          </ProgressCircle>

          <ArrowUp
            aria-hidden
            className="relative size-4 transition-transform duration-200 ease-out group-hover:-translate-y-0.5"
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

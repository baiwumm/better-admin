"use client";

/**
 * 回到顶部：外圈是滚动进度环，圆心显示百分比，悬停换成向上箭头，点击平滑回到顶部。
 *
 * 取的是 motion 的 `useScroll`（站点已依赖 motion，且文档页滚动的是 window，实测无内层滚动容器）。
 * 没有引入 beui/smooth-scroll：它带 lenis，会把全站滚轮接管成惯性感滚动，
 * 那是整站手感的改动，也和 fumadocs 的 sticky 导航/侧边栏有冲突面，需要单独评估。
 */

import { ArrowUp } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const RADIUS = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** 滚动超过这个像素才出现，避免刚进页面就被一个浮钮占住右下角 */
const SHOW_AFTER = 480;

export function ScrollTop({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const { scrollY, scrollYProgress } = useScroll();
  const [pct, setPct] = useState(0);
  const [visible, setVisible] = useState(false);
  const dashOffset = useTransform(
    scrollYProgress,
    (p) => CIRCUMFERENCE * (1 - p),
  );

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
          type="button"
          onClick={toTop}
          aria-label={`回到顶部（已滚动 ${pct}%）`}
          initial={{ opacity: 0, scale: 0.86, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.86, y: 12 }}
          transition={{ duration: reduce ? 0 : 0.22 }}
          className={cn(
            "group fixed end-6 bottom-6 z-50 grid size-12 place-items-center rounded-full border bg-background/85 shadow-lg backdrop-blur",
            "text-muted-foreground transition-colors hover:text-foreground",
            className,
          )}
        >
          <svg
            viewBox="0 0 48 48"
            aria-hidden
            className="absolute inset-0 size-full -rotate-90"
          >
            <circle
              cx="24"
              cy="24"
              r={RADIUS}
              fill="none"
              strokeWidth="2"
              className="stroke-border"
            />
            <motion.circle
              cx="24"
              cy="24"
              r={RADIUS}
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              className="stroke-primary"
              style={{ strokeDashoffset: dashOffset }}
            />
          </svg>
          <span className="relative grid place-items-center">
            {/* 平时看进度，悬停换成箭头：一个圆里放两个信息会挤 */}
            <span className="text-[11px] leading-none font-medium tabular-nums transition-opacity group-hover:opacity-0">
              {pct}%
            </span>
            <ArrowUp className="absolute size-4 opacity-0 transition-opacity group-hover:opacity-100" />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

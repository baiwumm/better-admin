import type { RefObject } from "react";

import { useLayoutEffect, useRef } from "react";

const FLIP_DURATION_MS = 200;

/**
 * 列表重排 FLIP 动画（First-Invert-Play）：依赖 key（如顺序 join 结果）
 * 变化后，对容器内带 `data-flip-id` 的行做垂直位移过渡。
 *
 * - 仅在 `animateRef` 置真的那次顺序变化时播放（程序性重排，如「重置」）；
 *   拖拽结束的重排由 dnd-kit 自身的落下动画处理，不走 FLIP（拖拽中元素
 *   是靠 transform 视觉移位的，FLIP 会按布局位置算位移导致先弹回再滑动）；
 * - 用 Web Animations API 播放（不写行内样式），避免与 dnd-kit 管理的
 *   transform / transition 行内样式互相覆盖；
 * - 位置以容器顶部为基准存储，面板内滚动不影响位移计算；
 * - 尊重系统「减少动态效果」偏好（prefers-reduced-motion）。
 */
export function useFlipReorder(
  depKey: string,
  animateRef: RefObject<boolean>,
): RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevTopsRef = useRef<Map<string, number> | null>(null);
  const animationsRef = useRef<Animation[]>([]);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const rows = container.querySelectorAll<HTMLElement>("[data-flip-id]");
    const containerTop = container.getBoundingClientRect().top;
    const tops = new Map<string, number>();

    for (const row of rows) {
      const id = row.dataset.flipId;

      if (id) tops.set(id, row.getBoundingClientRect().top - containerTop);
    }

    const prevTops = prevTopsRef.current;

    prevTopsRef.current = tops;

    const shouldAnimate = animateRef.current;

    animateRef.current = false;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!prevTops || !shouldAnimate || reducedMotion) return;

    for (const animation of animationsRef.current) {
      animation.cancel();
    }
    animationsRef.current = [];

    for (const row of rows) {
      const id = row.dataset.flipId;

      if (!id) continue;

      const prevTop = prevTops.get(id);
      const top = tops.get(id);

      if (prevTop === undefined || top === undefined) continue;

      const dy = prevTop - top;

      if (dy === 0) continue;

      animationsRef.current.push(
        row.animate(
          [
            { transform: `translateY(${dy}px)` },
            { transform: "translateY(0px)" },
          ],
          { duration: FLIP_DURATION_MS, easing: "ease-out" },
        ),
      );
    }
  }, [depKey]);

  return containerRef;
}

import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { useProgress } from "@bprogress/react";

/**
 * 路由导航进度条 Hook。
 *
 * 监听 TanStack Router 的 pathname 变化，在路由切换时自动 start/stop 进度条。
 *
 * 实现原理：
 * - useLocation() 订阅路由状态，pathname 变化时 start()。
 * - 路由变化后，用 requestAnimationFrame + 短延迟 stop()，确保页面渲染完成后才结束。
 * - disableSameURL 配置已在 ProgressProvider 中开启，相同 URL 不会重复触发。
 */
export function useRouteProgress() {
  const location = useLocation();
  const { start, stop } = useProgress();
  const prevPathnameRef = useRef(location.pathname);

  useEffect(() => {
    const { pathname } = location;

    // 仅在 pathname 实际变化时触发
    if (pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = pathname;
      start();

      // 用 rAF + 短延迟确保页面渲染完成后才停止
      const raf = requestAnimationFrame(() => {
        const timer = setTimeout(() => {
          stop();
        }, 50);

        return () => clearTimeout(timer);
      });

      return () => {
        cancelAnimationFrame(raf);
        stop();
      };
    }

    // pathname 未变化时不需要清理（组件未卸载、路由未切换）
    return undefined;
  }, [location.pathname]);
}

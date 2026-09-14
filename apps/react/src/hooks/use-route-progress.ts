import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";

import { progressRouteBegin } from "@/lib/progress";

/**
 * 路由导航进度条 Hook。
 *
 * 监听 TanStack Router 的 pathname 变化，在路由切换时开启「路由过渡段」：
 * - 过渡段与 api-client 的请求引用计数共用同一个进度条状态机（progress.ts），
 *   过渡段结束条件是「新页面渲染完成（rAF + 短延迟）」，且请求仍在飞行时
 *   进度条会持续到全部请求结束，不会提前消失。
 * - 计时器由 progress.ts 模块级管理（重复触发自动取消旧的），本 Hook
 *   无需在 cleanup 里 stop——清理动作会与页面并发请求的计数互相干扰。
 * - 相同 URL 不重复触发（pathname 未变化时直接跳过）。
 */
export function useRouteProgress() {
  const location = useLocation();
  const prevPathnameRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathnameRef.current) {
      prevPathnameRef.current = location.pathname;
      progressRouteBegin();
    }
  }, [location.pathname]);
}

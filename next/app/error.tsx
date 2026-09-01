"use client";

import { useEffect } from "react";

import { GeneralErrorPage } from "@/components/common/error-pages/general-error";

/**
 * 段级错误边界（客户端组件必须）。
 * React 版将出错 URL 携带至 /500 展示；Next 的边界内联渲染同款
 * GeneralErrorPage（retry 为整页刷新兜底，无 from 参数），避免白屏。
 */
export default function SegmentError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 上报错误到控制台（与 React 版根路由 errorComponent 的日志行为一致）
    /* eslint-disable no-console */
    console.error(error);
  }, [error]);

  return <GeneralErrorPage />;
}

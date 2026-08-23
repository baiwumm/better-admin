import { TriangleAlert } from "lucide-react";

import { ErrorPageShell } from "./error-page-shell";

/**
 * 通用错误兜底（全屏），用作根路由 errorComponent：
 * 页面渲染期间抛出未捕获错误时展示，避免白屏。
 */
export function GeneralErrorPage() {
  return (
    <ErrorPageShell
      description="页面出错了，请刷新重试；若问题持续存在，请联系管理员。"
      icon={<TriangleAlert className="size-7" />}
      status="500"
      title="出错了"
    />
  );
}

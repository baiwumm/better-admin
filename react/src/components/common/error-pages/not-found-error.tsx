import { FileQuestion } from "lucide-react";

import { ErrorPageShell } from "./error-page-shell";

/** 404 页面不存在（全屏），用作根路由 notFoundComponent 与 /404 路由。 */
export function NotFoundErrorPage() {
  return (
    <ErrorPageShell
      description="你访问的页面不存在或已被移除，请检查地址是否正确。"
      icon={<FileQuestion className="size-7" />}
      status="404"
      title="页面不存在"
    />
  );
}

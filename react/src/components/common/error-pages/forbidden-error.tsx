import { Ban } from "lucide-react";

import { ErrorPageShell } from "./error-page-shell";

/** 403 无权限（全屏）。 */
export function ForbiddenErrorPage() {
  return (
    <ErrorPageShell
      description="你没有执行该操作的权限，如有疑问请联系管理员。"
      icon={<Ban className="size-7" />}
      status="403"
      title="禁止访问"
    />
  );
}

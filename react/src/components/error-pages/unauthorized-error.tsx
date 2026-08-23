import { ShieldX } from "lucide-react";

import { ErrorPageShell } from "./error-page-shell";

/** 401 未登录 / 无访问权（全屏），菜单路由守卫的跳转目标。 */
export function UnauthorizedErrorPage() {
  return (
    <ErrorPageShell
      description="你尚未登录或没有访问该页面的权限，请先登录后重试。"
      icon={<ShieldX className="size-7" />}
      status="401"
      title="未授权访问"
    />
  );
}

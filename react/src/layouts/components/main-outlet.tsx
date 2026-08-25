import { Outlet } from "@tanstack/react-router";

/**
 * 主体内容出口组件。
 *
 * 当前为裸 Outlet 透传。原 KeepAlive 路由缓存功能已移除（TanStack Router 1.168
 * 无公开 API 支持组件实例级保活，业界第三方库 tanstack-router-keepalive 依赖的
 * getRouterContext 在该版本已移除，不兼容）。
 *
 * 后续若需路由缓存，可在此处扩展（如接入新的 TanStack 官方 API 或替代方案）。
 */
export function MainOutlet() {
  return <Outlet />;
}

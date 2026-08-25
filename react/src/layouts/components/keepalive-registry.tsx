import type { ComponentType } from "react";

import { UsersPage } from "@/features/users/users-page";

/**
 * keepAlive 路由组件注册表：路径 → 页面组件（手动覆盖入口，可选）。
 *
 * 组件解析顺序：本注册表优先 → `lib/route-component.ts` 从 routeTree
 * 按 fullPath 动态解析叶子组件（全量兜底，通常无需登记）。
 * 是否参与保活由菜单数据 `keepAlive` 字段动态决定；
 * 仅当 routeTree 解析不满足需求时（如同一挂载多个组件、特殊包装），
 * 才需要在此显式登记，路径须与菜单 `to` 完全一致。
 */
export const KEEPALIVE_COMPONENTS: Record<string, ComponentType> = {
  "/settings/users": UsersPage,
};

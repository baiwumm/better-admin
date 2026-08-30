import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchApi } from "@/lib/api-client";
import { type AuthUser } from "@/lib/api-types";
import { AUTH_ME_QUERY_KEY, useAuthStore } from "@/stores/auth-store";

/**
 * 当前用户快照同步（权限变更「刷新页面生效」语义的载体）：
 *
 * - user.permissions 仅在登录时计算并持久化（zustand persist），之后不会
 *   自行更新；管理员修改角色授权 / 角色绑定后，其他在线用户的前端快照是旧的。
 * - 本 hook 在 AdminLayout 挂载时请求 GET /auth/me（后端每请求实时聚合），
 *   用返回值覆盖 auth-store 的 user：F5 / 首次进入即拿到最新权限。
 * - 生效语义：刷新页面生效。SPA 会话内（不刷新）快照保持登录时的值，
 *   管理员改授权不影响已打开的页面，属接受的权衡（会话内不额外发请求）。
 *
 * 安全边界：前端快照只影响渲染（按钮显隐 / 菜单树），服务端每请求按实时
 * 聚合位鉴权（PermissionsGuard），快照过期不会造成越权，仅 UI 展示滞后。
 */
export function useAuthSync() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);

  const query = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: () => fetchApi<AuthUser>("/auth/me"),
    enabled: isAuthenticated,
    staleTime: 30_000,
    retry: false,
  });

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
    }
  }, [query.data, setUser]);

  return query;
}

import type { AuthUser } from "@/lib/api-types";

import { watch } from "vue";
import { useQuery } from "@tanstack/vue-query";

import { fetchApi } from "@/lib/api-client";
import { AUTH_ME_QUERY_KEY, useAuthStore } from "@/stores/auth-store";

/**
 * 当前用户快照同步（权限变更「刷新页面生效」语义的载体，mechanisms §6）：
 *
 * - user.permissions 仅在登录时计算并持久化，之后不会自行更新；
 *   管理员修改角色授权 / 角色绑定后，其他在线用户的前端快照是旧的。
 * - 本 composable 在 AdminLayout 挂载时请求 GET /auth/me（后端每请求实时聚合），
 *   用返回值覆盖 auth-store 的 user：F5 / 首次进入即拿到最新权限。
 * - 生效语义：刷新页面生效。SPA 会话内快照保持登录时的值，属接受的权衡。
 *
 * 安全边界：前端快照只影响渲染（按钮显隐 / 菜单树），服务端每请求按实时
 * 聚合位鉴权，快照过期不会造成越权，仅 UI 展示滞后。
 */
export function useAuthSync() {
  const auth = useAuthStore();

  const query = useQuery({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: () => fetchApi<AuthUser>("/auth/me"),
    enabled: auth.isAuthenticated,
    staleTime: 30_000,
    retry: false,
  });

  watch(
    () => query.data.value,
    (data) => {
      if (data) auth.setUser(data);
    },
  );

  return query;
}

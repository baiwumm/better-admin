import { useQuery } from "@tanstack/react-query";

import { fetchMenus } from "@/lib/menu-fetch";

/** 菜单查询的 queryKey（登录后 prefetch 与 useMenus 共用，保证同步读取一致）。 */
export const MENUS_QUERY_KEY = ["menus"] as const;

/**
 * 获取「当前用户可见」的菜单树（权限过滤后，供侧边栏与菜单路由守卫使用）。
 *
 * 数据来源：后端 GET /api/menus（返回 MenuNode[]，含 userPermissions）。
 * 前端合并固定「控制台」节点到最前（保证每个登录用户都有、不受接口控制）。
 * 登录成功后由 auth-store 预取该缓存，使 beforeLoad 可同步判定权限。
 */
export function useMenus() {
  return useQuery({
    queryKey: MENUS_QUERY_KEY,
    queryFn: fetchMenus,
    staleTime: 60_000,
  });
}

import { useQuery } from "@tanstack/react-query";

import { mockMenus } from "@/data/menus";
import { type MenuNode } from "@/lib/api-types";
import { filterAccessibleMenus } from "@/lib/permission";

/**
 * 获取「当前用户可见」的菜单树（权限过滤后，供侧边栏与菜单路由守卫使用）。
 *
 * 当前为 Mock 数据（结构与后端 GET /api/menus 的 MenuNode 一致）；
 * 接入后端后仅需将 queryFn 改为请求 GET /menus 并保持权限过滤即可。
 */
export function useMenus() {
  return useQuery({
    queryKey: ["menus"],
    queryFn: async (): Promise<MenuNode[]> => filterAccessibleMenus(mockMenus),
    staleTime: 60_000,
  });
}

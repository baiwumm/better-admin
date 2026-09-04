"use client";

import type { PermissionItem } from "@/lib/api-types";

import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

import { fetchApi } from "@/lib/api-client";
import { flattenLeafMenus } from "@/lib/menu-utils";
import { hasPermission } from "@/lib/permission";
import { useMenuStore } from "@/stores/menu-store";

/* ---------------------------------------------------------------------------
 * 权限点数据源
 * ------------------------------------------------------------------------- */

/**
 * 权限点数据 hook：权限位定义由后端 GET /permissions 唯一下发，
 * 前端不硬编码位掩码（与 lib/permission.ts 的位运算判定配合使用）。
 */
const PERMISSIONS_QUERY_KEY = ["permissions"] as const;

async function fetchPermissions() {
  return fetchApi<PermissionItem[]>("/permissions");
}

/** 权限点列表缓存（长 staleTime：权限点枚举为编译期固定值，会话内基本不变） */
export function usePermissions() {
  return useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: fetchPermissions,
    staleTime: 5 * 60_000,
  });
}

/* ---------------------------------------------------------------------------
 * 当前菜单权限位（内部工具 hook）
 * ------------------------------------------------------------------------- */

/**
 * 获取当前路由对应菜单的 userPermissions 位掩码。
 *
 * 用于 DataTableSearchReset 等组件精确判断菜单级权限，
 * 而非使用用户全局权限（可能包含其他菜单的权限位）。
 *
 * @returns 当前菜单的 userPermissions 字符串，未匹配时返回 null
 */
function useCurrentMenuPermissions(): string | null {
  const pathname = usePathname();
  const menus = useMenuStore((s) => s.menus);

  return useMemo(() => {
    if (!menus) return null;

    const leafMenus = flattenLeafMenus(menus);
    const currentMenu = leafMenus.find((m) => m.to === pathname);

    return currentMenu?.userPermissions ?? null;
  }, [menus, pathname]);
}

/* ---------------------------------------------------------------------------
 * 权限判断 hooks
 * ------------------------------------------------------------------------- */

/**
 * 获取当前菜单的所有常用权限判断。
 *
 * 权限位从 /api/permissions 接口动态获取，不再硬编码。
 * 使用当前菜单的 userPermissions（精确到菜单）。
 *
 * @example
 * const { canAdd, canEdit, canDelete, canExport } = useMenuPermissions();
 */
export function useMenuPermissions() {
  const menuPermissions = useCurrentMenuPermissions();
  const { data } = usePermissions();

  // 从接口数据动态构建权限位映射（value → bigint bits）
  const bitsMap = useMemo(() => {
    const map = new Map<string, bigint>();

    data?.forEach((item) => map.set(item.value, BigInt(item.bits)));

    return map;
  }, [data]);

  // 没有菜单权限时全部返回 false
  if (!menuPermissions || bitsMap.size === 0) {
    return {
      canSearch: false,
      canAdd: false,
      canEdit: false,
      canDelete: false,
      canBatchDelete: false,
      canAddChild: false,
      canReset: false,
      canResetPassword: false,
      canGrant: false,
      canExport: false,
    };
  }

  // menuPermissions 是字符串，Next.js 端 hasPermission 接受 string | number
  return {
    canSearch: hasPermission(menuPermissions, bitsMap.get("SEARCH") ?? 0n),
    canAdd: hasPermission(menuPermissions, bitsMap.get("ADD") ?? 0n),
    canEdit: hasPermission(menuPermissions, bitsMap.get("EDIT") ?? 0n),
    canDelete: hasPermission(menuPermissions, bitsMap.get("DELETE") ?? 0n),
    canBatchDelete: hasPermission(
      menuPermissions,
      bitsMap.get("BATCH_DELETE") ?? 0n,
    ),
    canAddChild: hasPermission(menuPermissions, bitsMap.get("ADD_CHILD") ?? 0n),
    canReset: hasPermission(menuPermissions, bitsMap.get("RESET") ?? 0n),
    canResetPassword: hasPermission(
      menuPermissions,
      bitsMap.get("RESET_PASSWORD") ?? 0n,
    ),
    canGrant: hasPermission(menuPermissions, bitsMap.get("GRANT") ?? 0n),
    canExport: hasPermission(menuPermissions, bitsMap.get("EXPORT") ?? 0n),
  };
}

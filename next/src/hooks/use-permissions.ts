"use client";

import type { PermissionItem } from "@/lib/api-types";

import { useQuery } from "@tanstack/react-query";

import { fetchApi } from "@/lib/api-client";
import { hasPermission } from "@/lib/permission";
import { useAuthStore } from "@/stores/auth-store";

/**
 * 权限点数据 hook：权限位定义由后端 GET /permissions 唯一下发，
 * 前端不硬编码位掩码（与 lib/permission.ts 的位运算判定配合使用）。
 */
export const PERMISSIONS_QUERY_KEY = ["permissions"] as const;

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

/**
 * 按权限点 value 判定当前用户是否具备该权限位（按钮级门控）。
 * - permissionKey 为空 → 不做门控（返回 true）；
 * - 权限点数据未加载 / 未找到该权限点 → 视为无权限（安全默认，返回 false）。
 *
 * @example const canAdd = useHasPermissionKey("ADD");
 */
export function useHasPermissionKey(
  permissionKey: string | undefined | null,
): boolean {
  const userBits = useAuthStore((state) => state.user?.permissions);
  const { data } = usePermissions();

  if (!permissionKey) return true;

  const bits = data?.find((item) => item.value === permissionKey)?.bits;

  if (bits === undefined) return false;

  return hasPermission(userBits, BigInt(bits));
}

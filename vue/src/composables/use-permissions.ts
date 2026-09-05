import type { PermissionItem } from "@/lib/api-types";

import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useRoute } from "vue-router";

import { fetchApi } from "@/lib/api-client";
import { flattenLeafMenus } from "@/lib/menu-utils";
import { hasPermission } from "@/lib/permission";
import { useMenus } from "@/composables/use-menus";

/* ---------------------------------------------------------------------------
 * 权限点数据源（与 React 端 use-permissions.ts 同构平移）
 * ------------------------------------------------------------------------- */

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

/**
 * 获取当前路由对应菜单的 userPermissions 位掩码（精确到菜单，
 * 而非用户全局权限）。未匹配时为 null。
 */
function useCurrentMenuPermissions() {
  const route = useRoute();
  const { data: menuTree } = useMenus();

  return computed(() => {
    const tree = menuTree.value;

    if (!tree) return null;

    const leafMenus = flattenLeafMenus(tree);
    const currentMenu = leafMenus.find((m) => m.to === route.path);

    return currentMenu?.userPermissions ?? null;
  });
}

/**
 * 获取当前菜单的所有常用权限判断。
 * 权限位从 /api/permissions 接口动态获取（value → bigint 映射），
 * 使用当前菜单的 userPermissions（精确到菜单）。
 *
 * @example
 * const { canAdd, canEdit, canDelete, canResetPassword } = useMenuPermissions();
 */
export function useMenuPermissions() {
  const menuPermissions = useCurrentMenuPermissions();
  const { data } = usePermissions();

  // 从接口数据动态构建权限位映射（value → bigint bits）
  const bitsMap = computed(() => {
    const map = new Map<string, bigint>();

    data.value?.forEach((item) => map.set(item.value, BigInt(item.bits)));

    return map;
  });

  const bits = computed(() => {
    const raw = menuPermissions.value;

    if (!raw || bitsMap.value.size === 0) return null;

    return BigInt(raw);
  });

  const check = (value: string) =>
    hasPermission(bits.value, bitsMap.value.get(value) ?? 0n);

  // 直接返回普通对象：权限位判定在读取时求值（模板/渲染上下文追踪响应）
  const disabled = bits.value === null;

  return {
    canSearch: !disabled && check("SEARCH"),
    canAdd: !disabled && check("ADD"),
    canEdit: !disabled && check("EDIT"),
    canDelete: !disabled && check("DELETE"),
    canBatchDelete: !disabled && check("BATCH_DELETE"),
    canAddChild: !disabled && check("ADD_CHILD"),
    canReset: !disabled && check("RESET"),
    canResetPassword: !disabled && check("RESET_PASSWORD"),
    canGrant: !disabled && check("GRANT"),
    canExport: !disabled && check("EXPORT"),
  };
}

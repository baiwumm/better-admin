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

  // 返回 computed ref：权限查询是页面挂载后的异步请求，一次性求值会让
  // 「首帧时权限未就绪」的页面按钮/操作永远消失。模板中顶层 ref 自动
  // 解包；script（columns computed / 回调）中读取需 .value。
  return {
    canSearch: computed(() => bits.value !== null && check("SEARCH")),
    canAdd: computed(() => bits.value !== null && check("ADD")),
    canEdit: computed(() => bits.value !== null && check("EDIT")),
    canDelete: computed(() => bits.value !== null && check("DELETE")),
    canBatchDelete: computed(
      () => bits.value !== null && check("BATCH_DELETE"),
    ),
    canAddChild: computed(() => bits.value !== null && check("ADD_CHILD")),
    canReset: computed(() => bits.value !== null && check("RESET")),
    canResetPassword: computed(
      () => bits.value !== null && check("RESET_PASSWORD"),
    ),
    canGrant: computed(() => bits.value !== null && check("GRANT")),
    canExport: computed(() => bits.value !== null && check("EXPORT")),
  };
}

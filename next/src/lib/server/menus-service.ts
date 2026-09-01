import "server-only";

import type { AuthUser, MenuNode } from "@/lib/api-types";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { menus, roleMenus, userRoles } from "@/db/schema";
import {
  normalizePermissionBits,
  SUPER_ADMIN_BITS_POSITIVE,
} from "@/lib/server/permissions";

/**
 * 菜单服务（与 nest/src/modules/menus/menus.service.ts 的 findTree 一一对齐）。
 *
 * 本文件同时服务两个入口：
 * - app/api/menus/route.ts（契约 GET /api/menus，供客户端 React Query 使用）；
 * - (authenticated) 布局 RSC（服务端直取菜单树并过滤后注入客户端，方案修正二：
 *   菜单权限过滤在服务端完成，客户端只渲染，不二次过滤）。
 */

/**
 * 一次性查询当前用户所有角色的 role_menus，聚合为 Map<menuId, permissions>。
 * 仅 1 次查询，严格禁止 N+1（database-design.md §1.5）。
 */
async function buildPermissionMap(
  userId: string,
): Promise<Map<string, bigint>> {
  const rows = await db
    .select({ menuId: roleMenus.menuId, bits: roleMenus.permissions })
    .from(roleMenus)
    .innerJoin(userRoles, eq(roleMenus.roleId, userRoles.roleId))
    .where(eq(userRoles.userId, userId));

  const map = new Map<string, bigint>();

  for (const r of rows) {
    map.set(r.menuId, (map.get(r.menuId) ?? 0n) | r.bits);
  }

  return map;
}

/**
 * 计算当前用户可访问的菜单 id 集合（含祖先链）。
 *
 * - super_admin（permissions = 全量掩码）：返回 null 表示「全量可见」；
 * - 普通用户：取 role_menus 直接授权的 menu_id 集合，再向上追溯 parent_id
 *   将祖先节点纳入可见范围（保证树形结构完整）。
 */
async function buildAllowedMenuIds(
  user: AuthUser,
): Promise<Set<string> | null> {
  // super_admin 免过滤：聚合权限位为全量掩码（对外正数表示）
  if (BigInt(user.permissions) === SUPER_ADMIN_BITS_POSITIVE) {
    return null;
  }

  // 直接授权集合：用户所有角色在 role_menus 中关联的 menu_id（去重）
  const directRows = await db
    .selectDistinct({ menuId: roleMenus.menuId })
    .from(roleMenus)
    .innerJoin(userRoles, eq(roleMenus.roleId, userRoles.roleId))
    .where(eq(userRoles.userId, user.id));

  const directIds = new Set(directRows.map((r) => r.menuId));

  if (directIds.size === 0) {
    // 未授权任何菜单 → 返回空集合（侧边栏无菜单）
    return directIds;
  }

  // 一次性取全量菜单用于追溯祖先链（常数次查询，无 N+1）
  const allRows = await db.select().from(menus);
  const byId = new Map(allRows.map((m) => [m.id, m]));

  const allowed = new Set(directIds);

  for (const id of directIds) {
    let cur = byId.get(id);

    while (cur && cur.parentId) {
      if (allowed.has(cur.parentId)) break;
      allowed.add(cur.parentId);
      cur = byId.get(cur.parentId);
    }
  }

  return allowed;
}

function rowToBase(row: typeof menus.$inferSelect) {
  return {
    id: row.id,
    label: row.label,
    i18nKey: row.i18nKey,
    icon: row.icon,
    to: row.to,
    parentId: row.parentId,
    sort: row.sort,
    keepAlive: row.keepAlive,
    hideInMenu: row.hideInMenu,
    enabled: row.enabled,
    defaultOpen: row.defaultOpen,
    permissions: row.permissions.toString(),
  };
}

/** 将扁平菜单列表在内存中递归组装成树（children 按 sort 升序）。 */
function buildTree(
  rows: (typeof menus.$inferSelect)[],
  permMap: Map<string, bigint>,
): MenuNode[] {
  const nodes = new Map<string, MenuNode>();

  for (const row of rows) {
    nodes.set(row.id, {
      ...rowToBase(row),
      userPermissions: permMap.has(row.id)
        ? normalizePermissionBits(permMap.get(row.id) ?? 0n).toString()
        : null,
      children: [],
    });
  }

  const roots: MenuNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;

    if (node.parentId && parent) {
      parent.children!.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRec = (list: MenuNode[]) => {
    list.sort((a, b) => a.sort - b.sort);
    for (const n of list) sortRec(n.children ?? []);
  };

  sortRec(roots);

  return roots;
}

/**
 * GET /api/menus — 当前用户可见菜单树（含 userPermissions 实际授权位）。
 *
 * 可见性由角色关联决定（database-design.md §1.5）：
 * - 未登录：返回空数组（防御性兜底，正常由 proxy 拦截）；
 * - super_admin：返回完整菜单树；
 * - 普通用户：仅返回其角色关联菜单（含祖先链）组成的树。
 */
export async function findMenuTree(user: AuthUser | null): Promise<MenuNode[]> {
  if (!user) {
    return [];
  }

  const allowedIds = await buildAllowedMenuIds(user);
  const rows = await db
    .select()
    .from(menus)
    .orderBy(menus.sort, menus.createdAt);

  const filteredRows =
    allowedIds === null ? rows : rows.filter((r) => allowedIds.has(r.id));

  const permMap = await buildPermissionMap(user.id);

  return buildTree(filteredRows, permMap);
}

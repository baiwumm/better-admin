import "server-only";

import type { AuthUser, MenuNode } from "@/lib/api-types";

import { eq, ilike, or } from "drizzle-orm";
import { count } from "drizzle-orm";

import { db } from "@/db/client";
import { logs, menus, roleMenus, userRoles } from "@/db/schema";
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
  order: "asc" | "desc" = "asc",
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
    list.sort((a, b) => (order === "desc" ? b.sort - a.sort : a.sort - b.sort));
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

/**
 * GET /api/menus/tree — 管理用全量菜单树（契约 v1.3 新增）。
 *
 * 与 findMenuTree 的区别：不做角色可见性过滤——包含 enabled=false / hideInMenu
 * 的全部节点，供菜单管理页与角色授权抽屉使用；userPermissions 仍按当前用户
 * 下发，供前端操作按钮门控。控制器层要求菜单 SEARCH 位。
 */
export async function findManageMenuTree(
  user: AuthUser | null,
  search?: string,
  order: "asc" | "desc" = "asc",
): Promise<MenuNode[]> {
  const allRows = await db.select().from(menus);

  let rows = allRows;
  const normalized = search?.trim();

  if (normalized) {
    const pattern = `%${normalized}%`;
    // 后端模糊搜索：label / i18n_key / to 命中即保留，并回溯祖先链保证树完整
    const matched = await db
      .select({ id: menus.id })
      .from(menus)
      .where(
        or(
          ilike(menus.label, pattern),
          ilike(menus.i18nKey, pattern),
          ilike(menus.to, pattern),
        ),
      );
    const matchedIds = new Set(matched.map((r) => r.id));

    if (matchedIds.size > 0) {
      const byId = new Map(allRows.map((m) => [m.id, m]));
      const allowed = new Set(matchedIds);

      for (const id of matchedIds) {
        let cur = byId.get(id);

        while (cur?.parentId) {
          if (allowed.has(cur.parentId)) break;
          allowed.add(cur.parentId);
          cur = byId.get(cur.parentId);
        }
      }
      rows = allRows.filter((r) => allowed.has(r.id));
    } else {
      rows = [];
    }
  }

  const permMap = user
    ? await buildPermissionMap(user.id)
    : new Map<string, bigint>();

  return buildTree(rows, permMap, order);
}

/* ---------------------------------------------------------------------------
 * 菜单管理（N3c）：findOne / create / addChild / update / remove
 * 与 nest/src/modules/menus/menus.service.ts 的对应方法一一对齐。
 * ------------------------------------------------------------------------- */

import { generateRecordId } from "@/lib/server/ids";
import { ServerApiError } from "@/lib/server/http";

export interface MenuSaveInput {
  /** 更新时可缺省（保留旧值）；创建/新增子菜单由路由层校验必填 */
  label?: string;
  i18nKey?: string | null;
  /** 更新时可缺省（保留旧值）；创建/新增子菜单由路由层校验必填 */
  icon?: string;
  to?: string | null;
  parentId?: string | null;
  sort?: number;
  keepAlive?: boolean;
  hideInMenu?: boolean;
  enabled?: boolean;
  defaultOpen?: boolean;
  /** bigint 位掩码字符串（勾选权限位的 OR） */
  permissions?: string;
}

/** to 非空时校验格式：必须以 / 或 https:// 开头（契约 v1.3） */
function assertValidTo(to: string | null | undefined): void {
  if (!to) return;

  if (!to.startsWith("/") && !to.startsWith("https://")) {
    throw new ServerApiError(
      400,
      "MENU_TO_INVALID",
      "路由路径必须以 / 或 https:// 开头",
    );
  }
}

/** to 非空时全局唯一（update 场景排除自身），部分唯一索引兜底（契约 v1.3） */
async function assertToUnique(
  to: string | null | undefined,
  excludeId?: string,
): Promise<void> {
  if (!to) return;

  const rows = await db
    .select({ id: menus.id })
    .from(menus)
    .where(eq(menus.to, to));

  if (rows.some((r) => r.id !== excludeId)) {
    throw new ServerApiError(409, "MENU_TO_EXISTS", "路由路径已存在");
  }
}

async function writeMenuLog(
  action: string,
  operatorId: string | null,
  detail?: unknown,
): Promise<void> {
  try {
    await db.insert(logs).values({
      id: generateRecordId(),
      type: "operation",
      userId: operatorId,
      action,
      detail: detail === undefined ? null : detail,
    });
  } catch (err) {
    console.error("[menus] 写入日志失败:", err);
  }
}

async function createMenuRow(
  dto: MenuSaveInput,
  operatorId: string | null,
  parentId?: string,
): Promise<MenuNode> {
  assertValidTo(dto.to);
  await assertToUnique(dto.to ?? null);

  if (BigInt(dto.permissions ?? "0") < 0n) {
    throw new ServerApiError(
      400,
      "INVALID_OPERATION",
      "permissions 包含非法权限位",
    );
  }

  const [row] = await db
    .insert(menus)
    .values({
      id: generateRecordId(),
      // label/icon 创建场景由路由层校验必填（类型上兼容部分更新语义）
      label: dto.label ?? "",
      i18nKey: dto.i18nKey ?? null,
      icon: dto.icon ?? "circle",
      to: dto.to ?? null,
      parentId: parentId ?? dto.parentId ?? null,
      sort: dto.sort ?? 0,
      keepAlive: dto.keepAlive ?? false,
      hideInMenu: dto.hideInMenu ?? false,
      enabled: dto.enabled ?? true,
      defaultOpen: dto.defaultOpen ?? false,
      permissions: BigInt(dto.permissions ?? "0"),
    })
    .returning();

  await writeMenuLog("menu.create", operatorId, { id: row.id });

  const tree = buildTree([row], new Map());

  return tree[0]!;
}

/** POST /api/menus — 创建顶级/指定父级菜单。 */
export async function createMenu(
  dto: MenuSaveInput,
  operatorId: string | null,
): Promise<MenuNode> {
  return createMenuRow(dto, operatorId);
}

/** POST /api/menus/:id/add-child — 新增子菜单（父菜单必须存在）。 */
export async function addChildMenu(
  parentId: string,
  dto: MenuSaveInput,
  operatorId: string | null,
): Promise<MenuNode> {
  const parent = await db.query.menus.findFirst({
    where: eq(menus.id, parentId),
  });

  if (!parent) {
    throw new ServerApiError(404, "MENU_NOT_FOUND", "父菜单不存在");
  }

  return createMenuRow(dto, operatorId, parentId);
}

/** GET /api/menus/:id — 单菜单详情（含子树与 userPermissions）。 */
export async function findMenu(
  id: string,
  user: AuthUser | null,
): Promise<MenuNode> {
  const row = await db.query.menus.findFirst({ where: eq(menus.id, id) });

  if (!row) {
    throw new ServerApiError(404, "MENU_NOT_FOUND", "菜单不存在");
  }

  const permMap = user
    ? await buildPermissionMap(user.id)
    : new Map<string, bigint>();

  return buildTree([row], permMap)[0]!;
}

/** PUT /api/menus/:id — 更新（to 传 null 表示清空路由，转为目录节点）。 */
export async function updateMenu(
  id: string,
  dto: MenuSaveInput,
  operatorId: string | null,
): Promise<MenuNode> {
  const existing = await db.query.menus.findFirst({ where: eq(menus.id, id) });

  if (!existing) {
    throw new ServerApiError(404, "MENU_NOT_FOUND", "菜单不存在");
  }

  // UpdateMenuDto 部分更新语义：to 用 === undefined 判断（允许显式 null 清空）
  const effectiveTo =
    (dto as { to?: string | null }).to === undefined
      ? existing.to
      : (dto.to ?? null);

  assertValidTo(effectiveTo);
  await assertToUnique(effectiveTo, id);

  if (BigInt(dto.permissions ?? existing.permissions.toString()) < 0n) {
    throw new ServerApiError(
      400,
      "INVALID_OPERATION",
      "permissions 包含非法权限位",
    );
  }

  const [row] = await db
    .update(menus)
    .set({
      label: dto.label ?? existing.label,
      i18nKey:
        dto.i18nKey === undefined ? existing.i18nKey : (dto.i18nKey ?? null),
      icon: dto.icon ?? existing.icon,
      to: effectiveTo,
      parentId: dto.parentId === undefined ? existing.parentId : dto.parentId,
      sort: dto.sort ?? existing.sort,
      keepAlive: dto.keepAlive ?? existing.keepAlive,
      hideInMenu: dto.hideInMenu ?? existing.hideInMenu,
      enabled: dto.enabled ?? existing.enabled,
      defaultOpen: dto.defaultOpen ?? existing.defaultOpen,
      permissions:
        dto.permissions === undefined
          ? existing.permissions
          : BigInt(dto.permissions),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(menus.id, id))
    .returning();

  await writeMenuLog("menu.update", operatorId, { id });

  const tree = buildTree([row], new Map());

  return tree[0]!;
}

/** DELETE /api/menus/:id — 有子菜单则禁止删除（409 MENU_HAS_CHILDREN）。 */
export async function removeMenu(
  id: string,
  operatorId: string | null,
): Promise<null> {
  const existing = await db.query.menus.findFirst({ where: eq(menus.id, id) });

  if (!existing) {
    throw new ServerApiError(404, "MENU_NOT_FOUND", "菜单不存在");
  }

  const [{ count: childCount }] = await db
    .select({ count: count() })
    .from(menus)
    .where(eq(menus.parentId, id));

  if (childCount > 0) {
    throw new ServerApiError(
      409,
      "MENU_HAS_CHILDREN",
      "该菜单存在子菜单，无法删除",
    );
  }

  await db.delete(menus).where(eq(menus.id, id));

  await writeMenuLog("menu.delete", operatorId, { id });

  return null;
}

/** 全量菜单可达路径集合（不分用户；供 proxy 区分「真实路由但无权」与「不存在的路由」）。 */
export async function getAllMenuPaths(): Promise<Set<string>> {
  // menus 无软删列（Nest 端为硬删除），无需过滤
  const rows = await db.select({ to: menus.to }).from(menus);

  const paths = new Set<string>();

  for (const r of rows) {
    if (r.to) paths.add(r.to);
  }

  return paths;
}

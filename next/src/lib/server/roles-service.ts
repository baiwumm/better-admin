import "server-only";

import type { RoleMenuGrant, RoleMenusPayload } from "@/lib/api-types";

import { and, asc, count, eq, ilike, inArray, or } from "drizzle-orm";

import { db } from "@/db/client";
import { logs, menus, roleMenus, roles, userRoles } from "@/db/schema";
import {
  Permissions,
  SUPER_ADMIN_BITS,
  SUPER_ADMIN_BITS_POSITIVE,
  SUPER_ADMIN_ROLE_CODE,
  normalizePermissionBits,
} from "@/lib/server/permissions";
import { ServerApiError } from "@/lib/server/http";
import { generateRecordId } from "@/lib/server/ids";

/**
 * 角色管理服务（与 nest/src/modules/roles/roles.service.ts 一一对齐）。
 * 完整 CRUD + 菜单授权（GRANT 位独立控制）+ super_admin 内置角色保护。
 */

export interface RoleView {
  id: string;
  name: string;
  code: string;
  description: string | null;
  enabled: boolean;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

/** 所有合法权限位的 OR 聚合（用于校验传入的位掩码是否越界） */
const ALL_PERMISSION_BITS = (
  Object.values(Permissions) as { bits: bigint }[]
).reduce((acc, p) => acc | p.bits, 0n);

function toView(row: typeof roles.$inferSelect): RoleView {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    enabled: row.enabled,
    sort: row.sort,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** 校验位掩码：必须是合法权限位的组合（或全量位 -1n / 正数 2^63-1） */
function assertValidBits(raw: string): void {
  let bits: bigint;

  try {
    bits = BigInt(raw);
  } catch {
    throw new ServerApiError(
      400,
      "INVALID_OPERATION",
      "permissions 不是合法的位掩码",
    );
  }

  if (bits === SUPER_ADMIN_BITS || bits === SUPER_ADMIN_BITS_POSITIVE) return;

  if (bits < 0n || (bits & ~ALL_PERMISSION_BITS) !== 0n) {
    throw new ServerApiError(
      400,
      "INVALID_OPERATION",
      "permissions 包含非法权限位",
    );
  }
}

/**
 * 系统内置角色保护：super_admin 的 role_menus 授权是全量权限的载体
 * （登录/每请求实时 OR 聚合，seed 写入 -1n 全量位），修改其授权或删除
 * 角色会让绑定用户立即失去全部权限且无自助恢复手段，故一律 403 拦截。
 */
function assertNotSuperAdmin(role: { code: string }): void {
  if (role.code === SUPER_ADMIN_ROLE_CODE) {
    throw new ServerApiError(
      403,
      "SUPER_ADMIN_ROLE_PROTECTED",
      "超级管理员为系统内置角色，其授权不可修改",
    );
  }
}

/** 角色 code/name 唯一冲突 → 409。
 * drizzle 会把 pg 错误包装为 DrizzleQueryError，原始错误的 constraint
 * 挂在对象（或其 cause）上，message 未必包含索引名——与 Nest 端同款判别。 */
function handleUniqueError(error: unknown): never {
  const err = error as {
    constraint_name?: string;
    constraint?: string;
    cause?: { constraint?: string; constraint_name?: string };
  };
  const constraint =
    err?.constraint_name ??
    err?.constraint ??
    err?.cause?.constraint_name ??
    "";

  if (constraint.includes("code")) {
    throw new ServerApiError(409, "ROLE_CODE_EXISTS", "角色 code 已存在");
  }
  if (constraint.includes("name")) {
    throw new ServerApiError(409, "ROLE_NAME_EXISTS", "角色名称已存在");
  }

  throw new ServerApiError(500, "INTERNAL_ERROR", "服务器内部错误");
}

async function writeLog(
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
    console.error("[roles] 写入日志失败:", err);
  }
}

const PAGE_SIZES = [10, 20, 30, 40, 50];

/** GET /roles — 分页列表（search 匹配 name/code；enabled 筛选；固定 sort+createdAt 排序）。 */
export async function listRoles(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  enabled?: string;
}): Promise<{
  data: RoleView[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 10)
    ? (params.pageSize ?? 10)
    : 10;

  const conditions = [];
  const normalizedSearch = params.search?.trim();

  if (normalizedSearch) {
    const pattern = `%${normalizedSearch}%`;

    conditions.push(
      or(ilike(roles.name, pattern), ilike(roles.code, pattern))!,
    );
  }

  if (params.enabled === "true" || params.enabled === "false") {
    conditions.push(eq(roles.enabled, params.enabled === "true"));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(roles)
    .where(where);

  const rows = await db
    .select()
    .from(roles)
    .where(where)
    .orderBy(asc(roles.sort), asc(roles.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    data: rows.map(toView),
    pagination: { page, pageSize, total },
  };
}

/** GET /roles/:id — 详情。 */
export async function findRole(id: string): Promise<RoleView> {
  const row = await db.query.roles.findFirst({ where: eq(roles.id, id) });

  if (!row) {
    throw new ServerApiError(404, "ROLE_NOT_FOUND", "角色不存在");
  }

  return toView(row);
}

export interface CreateRoleInput {
  name: string;
  code: string;
  description?: string;
  enabled?: boolean;
  sort?: number;
}

/** POST /roles — 创建（code 全局唯一，创建后不可改）。 */
export async function createRole(
  dto: CreateRoleInput,
  operatorId: string | null,
): Promise<RoleView> {
  let row: typeof roles.$inferSelect;

  try {
    const inserted = await db
      .insert(roles)
      .values({
        id: generateRecordId(),
        name: dto.name,
        code: dto.code,
        description: dto.description ?? null,
        enabled: dto.enabled ?? true,
        sort: dto.sort ?? 0,
      })
      .returning();

    row = inserted[0]!;
  } catch (error) {
    handleUniqueError(error);
  }

  await writeLog("role.create", operatorId, { id: row.id, code: row.code });

  return toView(row);
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  enabled?: boolean;
  sort?: number;
}

/** PUT /roles/:id — 更新（code 锁定不可改）。 */
export async function updateRole(
  id: string,
  dto: UpdateRoleInput,
  operatorId: string | null,
): Promise<RoleView> {
  const existing = await db.query.roles.findFirst({ where: eq(roles.id, id) });

  if (!existing) {
    throw new ServerApiError(404, "ROLE_NOT_FOUND", "角色不存在");
  }

  let row: typeof roles.$inferSelect;

  try {
    const updated = await db
      .update(roles)
      .set({
        name: dto.name ?? existing.name,
        // description：undefined 保留旧值，显式 null 清空
        description:
          dto.description === undefined
            ? existing.description
            : dto.description,
        enabled: dto.enabled ?? existing.enabled,
        sort: dto.sort ?? existing.sort,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(roles.id, id))
      .returning();

    row = updated[0]!;
  } catch (error) {
    handleUniqueError(error);
  }

  await writeLog("role.update", operatorId, { id });

  return toView(row);
}

/** DELETE /roles/:id — 删除（super_admin 保护；有关联用户 409 ROLE_IN_USE）。 */
export async function removeRole(
  id: string,
  operatorId: string | null,
): Promise<null> {
  const existing = await db.query.roles.findFirst({ where: eq(roles.id, id) });

  if (!existing) {
    throw new ServerApiError(404, "ROLE_NOT_FOUND", "角色不存在");
  }

  assertNotSuperAdmin(existing);

  // 检查是否有关联用户，存在则禁止删除
  const [{ count: linked }] = await db
    .select({ count: count() })
    .from(userRoles)
    .where(eq(userRoles.roleId, id));

  if (linked > 0) {
    throw new ServerApiError(409, "ROLE_IN_USE", "该角色已关联用户，无法删除");
  }

  await db.delete(roles).where(eq(roles.id, id));

  await writeLog("role.delete", operatorId, { id });

  return null;
}

/** GET /roles/:id/menus — 该角色当前菜单授权列表（有记录即可见，含 permissions="0"）。 */
export async function getRoleMenus(id: string): Promise<RoleMenusPayload> {
  const existing = await db.query.roles.findFirst({ where: eq(roles.id, id) });

  if (!existing) {
    throw new ServerApiError(404, "ROLE_NOT_FOUND", "角色不存在");
  }

  const rows = await db
    .select({ menuId: roleMenus.menuId, permissions: roleMenus.permissions })
    .from(roleMenus)
    .where(eq(roleMenus.roleId, id));

  const menuGrants: RoleMenuGrant[] = rows.map((r) => ({
    menuId: r.menuId,
    permissions: normalizePermissionBits(r.permissions).toString(),
  }));

  return { roleId: id, menus: menuGrants };
}

/**
 * PUT /roles/:id/menus — 全量替换角色菜单授权（GRANT 位独立控制，不复用 EDIT）。
 * 校验：menuId 全部存在、每个 permissions 位掩码合法；事务内先删后插。
 */
export async function updateRoleMenus(
  id: string,
  menusPayload: RoleMenuGrant[],
  operatorId: string | null,
): Promise<RoleMenusPayload> {
  const existing = await db.query.roles.findFirst({ where: eq(roles.id, id) });

  if (!existing) {
    throw new ServerApiError(404, "ROLE_NOT_FOUND", "角色不存在");
  }

  assertNotSuperAdmin(existing);

  // 校验 menuId 全部存在
  const menuIds = menusPayload.map((m) => m.menuId);

  if (menuIds.length > 0) {
    const found = await db
      .select({ id: menus.id })
      .from(menus)
      .where(inArray(menus.id, menuIds));
    const foundSet = new Set(found.map((m) => m.id));
    const invalid = menuIds.filter((mid) => !foundSet.has(mid));

    if (invalid.length > 0) {
      throw new ServerApiError(400, "INVALID_OPERATION", "部分 menuId 不存在");
    }
  }

  // 校验每个 permissions 位掩码合法
  for (const m of menusPayload) {
    assertValidBits(m.permissions);
  }

  // 全量替换：先删后插（事务）
  await db.transaction(async (tx) => {
    await tx.delete(roleMenus).where(eq(roleMenus.roleId, id));

    if (menusPayload.length > 0) {
      await tx.insert(roleMenus).values(
        menusPayload.map((m) => ({
          roleId: id,
          menuId: m.menuId,
          permissions: BigInt(m.permissions),
        })),
      );
    }
  });

  await writeLog("role.menus_update", operatorId, {
    id,
    count: menusPayload.length,
  });

  return getRoleMenus(id);
}

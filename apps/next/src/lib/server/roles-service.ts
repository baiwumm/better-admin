import "server-only";

import type { RoleMenuGrant, RoleMenusPayload } from "@/lib/api-types";
import type { DirectoryEntryView } from "@/lib/server/posts-service";

import { and, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { logs, menus, roleMenus, roles, userRoles, users } from "@/db/schema";
import {
  ALL_PERMISSION_BITS,
  SUPER_ADMIN_BITS,
  SUPER_ADMIN_BITS_POSITIVE,
  SUPER_ADMIN_ROLE_CODE,
  normalizePermissionBits,
} from "@/lib/server/permissions";
import {
  employedUserFilter,
  loadDirectoryExtras,
  toDirectoryEntryView,
} from "@/lib/server/posts-service";
import { ServerApiError } from "@/lib/server/http";
import { generateRecordId } from "@/lib/server/ids";
import { normalizePaging } from "@/lib/server/pagination";

/**
 * 角色管理服务（与 nest/src/modules/roles/roles.service.ts 一一对齐）。
 * 完整 CRUD + 菜单授权（GRANT 位独立控制）+ super_admin 内置角色保护
 * + 关联用户列/名单穿透（契约 v1.13.0）。
 */

/** 角色关联用户摘要（与 openapi.yaml RoleReader 对齐；形状同 NoticeReader） */
export interface RoleReaderView {
  id: string;
  name: string;
  avatar: string | null;
}

export interface RoleView {
  id: string;
  name: string;
  code: string;
  description: string | null;
  enabled: boolean;
  sort: number;
  /** 关联用户总数（仅在职且未删除；管理列表接口回填，详情接口不带） */
  userCount?: number;
  /** 最近关联用户（最多 3 个；管理列表接口回填，详情接口不带） */
  readers?: RoleReaderView[];
  createdAt: string;
  updatedAt: string;
}

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
      "超级管理员为系统内置角色，不可修改或删除",
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
  const { page, pageSize } = normalizePaging(params);

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
    // sort 权重语义：大在前（对齐 nest 契约 v1.7.2）；createdAt/id 兜底保证分页稳定
    .orderBy(desc(roles.sort), desc(roles.createdAt), desc(roles.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const views = rows.map(toView);
  // 关联用户摘要整页两次批量（总数 1 组 + 最近 3 人 1 组），内存回填（契约 v1.13.0）
  const roleIds = views.map((v) => v.id);
  const countsByRole = await loadUserCountsBatch(roleIds);
  const readersByRole = await loadReadersBatch(roleIds);

  for (const view of views) {
    view.userCount = countsByRole.get(view.id) ?? 0;
    view.readers = readersByRole.get(view.id) ?? [];
  }

  return {
    data: views,
    pagination: { page, pageSize, total },
  };
}

/** 批量统计多个角色的关联用户总数（仅在职且未删除，口径同 posts-service.employedUserFilter）。 */
async function loadUserCountsBatch(
  roleIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();

  if (roleIds.length === 0) return map;

  const rows = await db
    .select({ roleId: userRoles.roleId, total: count() })
    .from(userRoles)
    .innerJoin(users, and(eq(userRoles.userId, users.id), employedUserFilter))
    .where(inArray(userRoles.roleId, roleIds))
    .groupBy(userRoles.roleId);

  for (const row of rows) map.set(row.roleId, row.total);

  return map;
}

/**
 * 批量装载多个角色的最近关联用户（窗口函数每组取 3 条）：全页 1 组查询。
 * SQL 写法对齐 nest notice.service.loadReadersBatch；过滤条件为
 * employedUserFilter 的 SQL 形态（未删除且非离职，存量 null 按在职）。
 */
async function loadReadersBatch(
  roleIds: string[],
): Promise<Map<string, RoleReaderView[]>> {
  const map = new Map<string, RoleReaderView[]>();

  if (roleIds.length === 0) return map;
  for (const id of roleIds) map.set(id, []);

  const result = await db.execute(sql`
    SELECT t.role_id, t.user_id, t.display_name, t.avatar
    FROM (
      SELECT ur.role_id, ur.user_id, u.display_name, u.avatar,
             row_number() OVER (
               PARTITION BY ur.role_id
               ORDER BY ur.created_at DESC, ur.user_id
             ) AS rn
      FROM user_roles ur
      INNER JOIN users u ON u.id = ur.user_id
      WHERE ur.role_id IN (${sql.join(
        roleIds.map((id) => sql`${id}`),
        sql`, `,
      )})
        AND u.deleted_at IS NULL
        AND (u.employment_status IS NULL OR u.employment_status <> 'resigned')
    ) t
    WHERE t.rn <= 3
  `);
  // postgres.js 驱动的 execute 直接返回行数组（对齐 notices-service 同款映射）
  const rows = result as unknown as {
    role_id: string;
    user_id: string;
    display_name: string;
    avatar: string | null;
  }[];

  for (const row of rows) {
    map.get(row.role_id)?.push({
      id: row.user_id,
      name: row.display_name,
      avatar: row.avatar,
    });
  }

  return map;
}

/**
 * GET /roles/:id/users — 角色关联用户名单（关联用户穿透，契约 v1.13.0）。
 * 过滤口径与 posts-service.listPostMembers 一致（未删除且非离职）；
 * 形状同岗位成员穿透：DirectoryEntry 分页 + loadDirectoryExtras 回填部门路径。
 */
export async function listRoleUsers(
  id: string,
  params: { page?: number; pageSize?: number },
): Promise<{
  data: DirectoryEntryView[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const { page, pageSize } = normalizePaging(params);

  const role = await db.query.roles.findFirst({ where: eq(roles.id, id) });

  if (!role) {
    throw new ServerApiError(404, "ROLE_NOT_FOUND", "角色不存在");
  }

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(userRoles)
    .innerJoin(users, and(eq(userRoles.userId, users.id), employedUserFilter))
    .where(eq(userRoles.roleId, id));

  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      employeeNo: users.employeeNo,
      phone: users.phone,
      email: users.email,
      entryDate: users.entryDate,
      employmentStatus: users.employmentStatus,
    })
    .from(userRoles)
    .innerJoin(users, and(eq(userRoles.userId, users.id), employedUserFilter))
    .where(eq(userRoles.roleId, id))
    // 与全站列表口径一致：创建时间降序 + id 兜底保证分页稳定
    .orderBy(desc(users.createdAt), desc(users.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const extrasMap = await loadDirectoryExtras(rows.map((r) => r.id));

  return {
    data: rows.map((row) => toDirectoryEntryView(row, extrasMap.get(row.id))),
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

/** 长度校验：与前端 zod + 后端 class-validator @MaxLength 对齐 */
function assertFieldLengths(input: {
  name?: string;
  code?: string;
  description?: string | null;
}): void {
  if (input.name !== undefined && input.name.length > 20) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      "角色名称不能超过 20 个字符",
    );
  }
  if (input.code !== undefined && input.code.length > 50) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      "角色标识不能超过 50 个字符",
    );
  }
  if (typeof input.description === "string" && input.description.length > 200) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      "角色描述不能超过 200 个字符",
    );
  }
}

/** POST /roles — 创建（code 全局唯一，创建后不可改）。 */
export async function createRole(
  dto: CreateRoleInput,
  operatorId: string | null,
): Promise<RoleView> {
  assertFieldLengths(dto);

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
  assertFieldLengths(dto);

  const existing = await db.query.roles.findFirst({ where: eq(roles.id, id) });

  if (!existing) {
    throw new ServerApiError(404, "ROLE_NOT_FOUND", "角色不存在");
  }

  // 系统内置角色保护：super_admin 角色不可停用（enabled 参与聚合，停用将使
  // 绑定用户聚合位清空、全后台失权且无自助恢复手段）；name/description/sort
  // 无权限语义，允许修改（对齐前端「编辑保留」设计）
  if (existing.code === SUPER_ADMIN_ROLE_CODE && dto.enabled === false) {
    throw new ServerApiError(
      403,
      "SUPER_ADMIN_ROLE_PROTECTED",
      "超级管理员为系统内置角色，不可停用",
    );
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

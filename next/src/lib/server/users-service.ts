import "server-only";

import type { AuthUser, EmploymentStatus, User } from "@/lib/api-types";

import bcrypt from "bcryptjs";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db/client";
import {
  depts,
  logs,
  posts,
  refreshTokens,
  roles,
  userPosts,
  userRoles,
  users,
} from "@/db/schema";
import { SUPER_ADMIN_ROLE_CODE } from "@/lib/server/permissions";
import { ServerApiError } from "@/lib/server/http";
import { generateRecordId } from "@/lib/server/ids";

/**
 * 用户管理服务（与 nest/src/modules/users/users.service.ts 对齐）。
 *
 * 字段范围：username/email/password/displayName/avatar/status/roleIds +
 * 组织中心关联（契约 v1.6.0）：deptId/employeeNo/entryDate/employmentStatus/
 * gender/postIds/mainPostId；lastLoginAt 随 users 行输出（契约 v1.5.0）。
 */

/** 列表排序白名单（契约字段范围内）。 */
const SORTABLE = [
  "id",
  "username",
  "email",
  "displayName",
  "employeeNo",
  "entryDate",
  "employmentStatus",
  "status",
  "createdAt",
  "updatedAt",
] as const;

type SortableColumn = (typeof SORTABLE)[number] | "createdAt";

const PAGE_SIZES = [10, 20, 30, 40, 50];

/** 角色 → 用户的批量联查（一次查询，避免 N+1），按 roles.sort/name 排序。 */
async function attachRoles(rows: Omit<User, "roles">[]): Promise<User[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const links = await db
    .select({
      userId: userRoles.userId,
      id: roles.id,
      name: roles.name,
      code: roles.code,
      sort: roles.sort,
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(inArray(userRoles.userId, ids))
    .orderBy(asc(roles.sort), asc(roles.name));

  const byUser = new Map<string, User["roles"]>();

  for (const link of links) {
    const list = byUser.get(link.userId) ?? [];

    list.push({ id: link.id, name: link.name, code: link.code });
    byUser.set(link.userId, list);
  }

  return rows.map((r) => ({ ...r, roles: byUser.get(r.id) ?? [] }));
}

/** 用户关联岗位摘要（user_posts → posts 未删除；主岗在前） */
interface UserPostView {
  id: string;
  name: string;
  category: string;
  isMain: boolean;
}

/** 岗位 → 用户的批量联查（一次查询，避免 N+1），主岗在前。 */
async function attachPosts(
  rows: Omit<User, "roles" | "posts">[],
): Promise<Omit<User, "roles">[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const links = await db
    .select({
      userId: userPosts.userId,
      id: posts.id,
      name: posts.name,
      category: posts.category,
      isMain: userPosts.isMain,
    })
    .from(userPosts)
    .innerJoin(
      posts,
      and(eq(userPosts.postId, posts.id), isNull(posts.deletedAt)),
    )
    .where(inArray(userPosts.userId, ids))
    .orderBy(desc(userPosts.isMain), asc(posts.name));

  const byUser = new Map<string, UserPostView[]>();

  for (const link of links) {
    const list = byUser.get(link.userId) ?? [];

    list.push({
      id: link.id,
      name: link.name,
      category: link.category,
      isMain: link.isMain,
    });
    byUser.set(link.userId, list);
  }

  return rows.map((r) => ({
    ...r,
    posts: (byUser.get(r.id) ?? []) as User["posts"],
  }));
}

/** 所属组织名称批量联查（users.dept_id → depts 未删除），避免 N+1。 */
async function attachDeptNames(
  rows: Omit<User, "roles" | "posts">[],
): Promise<Omit<User, "roles" | "posts">[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const links = await db
    .select({ id: users.id, deptName: depts.name })
    .from(users)
    .leftJoin(depts, and(eq(users.deptId, depts.id), isNull(depts.deletedAt)))
    .where(inArray(users.id, ids));

  const byUser = new Map<string, string | null>();

  for (const link of links) byUser.set(link.id, link.deptName ?? null);

  return rows.map((r) => ({
    ...r,
    deptName: byUser.get(r.id) ?? null,
  }));
}

/** 契约 User 基础视图（不含 roles/posts，两关联由 attach* 补齐）。 */
function toView(row: typeof users.$inferSelect): Omit<User, "roles" | "posts"> {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    displayName: row.displayName,
    avatar: row.avatar,
    phone: row.phone,
    tags: row.tags ?? [],
    website: row.website,
    githubUsername: row.githubUsername,
    xUsername: row.xUsername,
    status: row.status === "disabled" ? "disabled" : "active",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt,
    deptId: row.deptId ?? null,
    deptName: null,
    employeeNo: row.employeeNo ?? null,
    entryDate: row.entryDate ?? null,
    // 存量 employment_status 为 NULL 的按在职输出
    employmentStatus: (row.employmentStatus === "resigned"
      ? "resigned"
      : "employed") as EmploymentStatus,
    gender: (row.gender as "male" | "female" | null) ?? null,
  };
}

export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sort?: string;
  order?: string;
}

/** GET /users — 分页列表（软删行不可见；search 匹配 username/email/displayName）。 */
export async function listUsers(params: UserListParams): Promise<{
  data: User[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 10)
    ? (params.pageSize ?? 10)
    : 10;

  const sortField: SortableColumn = (SORTABLE as readonly string[]).includes(
    params.sort ?? "",
  )
    ? (params.sort as SortableColumn)
    : "createdAt";
  const isAsc = params.order === "asc";
  const sortColumn =
    sortField === "createdAt"
      ? users.createdAt
      : sortField === "updatedAt"
        ? users.updatedAt
        : sortField === "employeeNo"
          ? users.employeeNo
          : sortField === "entryDate"
            ? users.entryDate
            : sortField === "employmentStatus"
              ? users.employmentStatus
              : users[
                  sortField as
                    | "username"
                    | "email"
                    | "displayName"
                    | "status"
                    | "id"
                ];

  const conditions = [isNull(users.deletedAt)];

  if (params.status === "active" || params.status === "disabled") {
    conditions.push(eq(users.status, params.status));
  }

  const normalizedSearch = params.search?.trim();

  if (normalizedSearch) {
    const pattern = `%${normalizedSearch}%`;

    conditions.push(
      or(
        ilike(users.username, pattern),
        ilike(users.email, pattern),
        ilike(users.displayName, pattern),
      )!,
    );
  }

  const where = and(...conditions);

  const [{ count: total }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(users)
    .where(where);

  const rows = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(isAsc ? asc(sortColumn) : desc(sortColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const base = rows.map(toView);
  const withDept = await attachDeptNames(base);
  const withPosts = await attachPosts(withDept);
  const data = await attachRoles(withPosts);

  return { data, pagination: { page, pageSize, total } };
}

/** GET /users/:id — 详情（软删行视为不存在）。 */
export async function findUser(id: string): Promise<User> {
  const row = await db.query.users.findFirst({
    where: and(eq(users.id, id), isNull(users.deletedAt)),
  });

  if (!row) {
    throw new ServerApiError(404, "USER_NOT_FOUND", "用户不存在");
  }

  const [withDept] = await attachDeptNames([toView(row)]);
  const [withPosts] = await attachPosts([withDept]);
  const [view] = await attachRoles([withPosts]);

  return view;
}

/** 校验 roleIds：存在性校验，超限由调用方/DTO 层约束（契约 maxItems 5）。 */
async function assertValidRoleIds(roleIds: string[]): Promise<void> {
  if (roleIds.length === 0) return;

  const found = await db
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.id, roleIds));

  if (found.length !== new Set(roleIds).size) {
    throw new ServerApiError(400, "VALIDATION_ERROR", "包含无效的角色");
  }
}

/** 校验所属组织：存在、未删除且启用（停用组织不可关联新数据；对齐 Nest org-views）。 */
async function assertValidDeptId(deptId: string | null): Promise<void> {
  if (!deptId) return;

  const row = await db.query.depts.findFirst({
    where: and(eq(depts.id, deptId), isNull(depts.deletedAt)),
  });

  if (!row || row.status !== "enabled") {
    throw new ServerApiError(400, "DEPT_NOT_FOUND", "所属组织不存在或已停用");
  }
}

/** 校验 postIds 全部有效（存在、未删除且启用），无效抛 VALIDATION_ERROR。 */
async function assertValidPostIds(postIds: string[]): Promise<void> {
  if (postIds.length === 0) return;

  const rows = await db
    .select({ id: posts.id, status: posts.status })
    .from(posts)
    .where(and(isNull(posts.deletedAt), inArray(posts.id, postIds)));
  const validIds = new Set(
    rows.filter((r) => r.status === "enabled").map((r) => r.id),
  );
  const invalid = postIds.filter((id) => !validIds.has(id));

  if (invalid.length > 0) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      `岗位不存在或已停用: ${invalid.join(", ")}`,
    );
  }
}

/** 校验 mainPostId 必须在关联岗位列表中（v1.6.0；主岗至多一条由 isMain 唯一标记保证）。 */
function assertValidMainPost(
  mainPostId: string | null | undefined,
  postIds: string[],
): void {
  if (mainPostId && !postIds.includes(mainPostId)) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      "主岗必须在关联岗位列表中",
    );
  }
}

/** 目标用户保护校验（删除/批量删/停用/重置密码共用，v1.4.6）：
 * - 删除/批量删/重置密码/停用目标为本人 → 400 SELF_OPERATION_FORBIDDEN；
 * - 内置 admin（username='admin'）→ 403 ADMIN_USER_PROTECTED；
 * - 绑定 super_admin 角色且操作者非 super_admin → 403 SUPER_ADMIN_USER_PROTECTED。
 */
async function assertTargetOperable(
  operator: AuthUser,
  targetId: string,
): Promise<void> {
  if (targetId === operator.id) {
    throw new ServerApiError(
      400,
      "SELF_OPERATION_FORBIDDEN",
      "不能对当前登录用户执行该操作",
    );
  }

  const target = await db.query.users.findFirst({
    where: and(eq(users.id, targetId), isNull(users.deletedAt)),
  });

  if (!target) {
    throw new ServerApiError(404, "USER_NOT_FOUND", "用户不存在");
  }

  if (target.username === "admin") {
    throw new ServerApiError(403, "ADMIN_USER_PROTECTED", "内置管理员受保护");
  }

  const superAdminBinding = await db
    .select({ roleId: roles.id })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(
      and(
        eq(userRoles.userId, targetId),
        eq(roles.code, SUPER_ADMIN_ROLE_CODE),
      ),
    )
    .limit(1);

  if (
    superAdminBinding.length > 0 &&
    BigInt(operator.permissions) !== 9223372036854775807n
  ) {
    throw new ServerApiError(
      403,
      "SUPER_ADMIN_USER_PROTECTED",
      "超级管理员绑定的用户受保护",
    );
  }

  return;
}

/** 用户名/邮箱唯一冲突 → 409（部分唯一索引 deleted_at IS NULL 兜底）。
 * drizzle 会把 pg 错误包装为 DrizzleQueryError，原始错误的 constraint
 * 挂在对象（或其 cause）上，message 未必包含索引名——与 Nest 端同款判别。 */
function mapUniqueViolation(error: unknown): never {
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

  if (constraint.includes("users_username_unique_active")) {
    throw new ServerApiError(409, "USERNAME_EXISTS", "用户名已存在");
  }
  if (constraint.includes("users_email_unique_active")) {
    throw new ServerApiError(409, "EMAIL_EXISTS", "邮箱已存在");
  }

  throw new ServerApiError(500, "INTERNAL_ERROR", "服务器内部错误");
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  displayName: string;
  avatar?: string;
  status?: string;
  roleIds?: string[];
  /** 所属组织（null = 无组织；须存在且启用） */
  deptId?: string | null;
  employeeNo?: string | null;
  /** 入职日期（YYYY-MM-DD） */
  entryDate?: string | null;
  employmentStatus?: string | null;
  /** 性别（null = 未设置） */
  gender?: "male" | "female" | null;
  /** 关联岗位（user_posts 全量替换；须存在且启用，最多 20 个） */
  postIds?: string[];
  /** 主岗（须在 postIds 中） */
  mainPostId?: string | null;
}

/** POST /users — 创建（密码必传 ≥6 位；roleIds/postIds 全量写入关联表）。 */
export async function createUser(
  dto: CreateUserInput,
  operatorId: string | null,
): Promise<User> {
  if (dto.roleIds && dto.roleIds.length > 5) {
    throw new ServerApiError(400, "VALIDATION_ERROR", "角色数量超出上限（5）");
  }
  if (dto.postIds && dto.postIds.length > 20) {
    throw new ServerApiError(400, "VALIDATION_ERROR", "岗位数量超出上限（20）");
  }

  await assertValidRoleIds(dto.roleIds ?? []);

  // 组织中心关联校验（v1.6.0）：deptId 须存在且启用；postIds 全部有效；主岗须在 postIds 中
  await assertValidDeptId(dto.deptId ?? null);
  const postIds = dto.postIds ?? [];

  await assertValidPostIds(postIds);
  assertValidMainPost(dto.mainPostId, postIds);

  const passwordHash = await bcrypt.hash(dto.password, 10);
  const id = generateRecordId();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id,
        username: dto.username,
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        avatar: dto.avatar ?? null,
        status: dto.status === "disabled" ? "disabled" : "active",
        deptId: dto.deptId ?? null,
        employeeNo: dto.employeeNo ?? null,
        entryDate: dto.entryDate ?? null,
        employmentStatus: dto.employmentStatus ?? null,
        gender: dto.gender ?? null,
      });

      if (dto.roleIds && dto.roleIds.length > 0) {
        await tx.insert(userRoles).values(
          dto.roleIds.map((roleId) => ({
            userId: id,
            roleId,
          })),
        );
      }

      if (postIds.length > 0) {
        await tx.insert(userPosts).values(
          postIds.map((postId) => ({
            id: generateRecordId(),
            userId: id,
            postId,
            isMain: postId === (dto.mainPostId ?? null),
          })),
        );
      }
    });
  } catch (error) {
    mapUniqueViolation(error);
  }

  await writeLog("user.create", operatorId, {
    id,
    username: dto.username,
    roleIds: dto.roleIds,
    deptId: dto.deptId,
    postIds,
  });

  return findUser(id);
}

export interface UpdateUserInput {
  email?: string;
  displayName?: string;
  avatar?: string | null;
  status?: string;
  roleIds?: string[];
  /** 所属组织：undefined 不修改 / null 清空（须存在且启用） */
  deptId?: string | null;
  employeeNo?: string | null;
  entryDate?: string | null;
  employmentStatus?: string | null;
  /** 性别：undefined 不修改 / null 清空为未设置 */
  gender?: "male" | "female" | null;
  /** 关联岗位（全量替换，同 roleIds 语义；须存在且启用，最多 20 个） */
  postIds?: string[];
  /** 主岗（须在 postIds 中；空/null = 无主岗） */
  mainPostId?: string | null;
}

/** PUT /users/:id — 更新（不可改 username/password；roleIds/postIds 数组=全量替换）。 */
export async function updateUser(
  id: string,
  dto: UpdateUserInput,
  operator: AuthUser,
): Promise<User> {
  const existing = await db.query.users.findFirst({
    where: and(eq(users.id, id), isNull(users.deletedAt)),
  });

  if (!existing) {
    throw new ServerApiError(404, "USER_NOT_FOUND", "用户不存在");
  }

  // 停用操作与 PUT /users/{id}/status 同一保护规则（v1.4.7）
  if (dto.status === "disabled") {
    await assertTargetOperable(operator, id);
  }

  if (dto.roleIds !== undefined && dto.roleIds.length > 5) {
    throw new ServerApiError(400, "VALIDATION_ERROR", "角色数量超出上限（5）");
  }

  if (dto.roleIds !== undefined) {
    await assertValidRoleIds(dto.roleIds);
  }

  // 组织中心关联校验（v1.6.0）：postIds 全量替换语义同 roleIds；主岗须在列表中
  if (dto.deptId !== undefined) {
    await assertValidDeptId(dto.deptId);
  }
  if (dto.postIds !== undefined) {
    if (dto.postIds.length > 20) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "岗位数量超出上限（20）",
      );
    }
    await assertValidPostIds(dto.postIds);
    assertValidMainPost(dto.mainPostId, dto.postIds);
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          // email/displayName/status：undefined 保留旧值
          email: dto.email ?? existing.email,
          displayName: dto.displayName ?? existing.displayName,
          status: dto.status ?? existing.status,
          // avatar：undefined 保留旧值，显式 null 清空
          avatar: dto.avatar === undefined ? existing.avatar : dto.avatar,
          // 组织中心字段：undefined 保留旧值，null/显式值落库
          deptId: dto.deptId === undefined ? existing.deptId : dto.deptId,
          employeeNo:
            dto.employeeNo === undefined ? existing.employeeNo : dto.employeeNo,
          entryDate:
            dto.entryDate === undefined ? existing.entryDate : dto.entryDate,
          employmentStatus:
            dto.employmentStatus === undefined
              ? existing.employmentStatus
              : dto.employmentStatus,
          gender: dto.gender === undefined ? existing.gender : dto.gender,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, id));

      // roleIds：undefined = 不修改；数组（含空数组）= 全量替换
      if (dto.roleIds !== undefined) {
        await tx.delete(userRoles).where(eq(userRoles.userId, id));

        if (dto.roleIds.length > 0) {
          await tx
            .insert(userRoles)
            .values(dto.roleIds.map((roleId) => ({ userId: id, roleId })));
        }
      }

      // postIds：undefined = 不修改；数组（含空数组）= 全量替换
      if (dto.postIds !== undefined) {
        await tx.delete(userPosts).where(eq(userPosts.userId, id));

        if (dto.postIds.length > 0) {
          await tx.insert(userPosts).values(
            dto.postIds.map((postId) => ({
              id: generateRecordId(),
              userId: id,
              postId,
              isMain: postId === (dto.mainPostId ?? null),
            })),
          );
        }
      }
    });
  } catch (error) {
    mapUniqueViolation(error);
  }

  await writeLog("user.update", operator.id, {
    id,
    roleIds: dto.roleIds,
    deptId: dto.deptId,
    postIds: dto.postIds,
  });

  return findUser(id);
}

/** 停用（tokenVersion+1 + 清托管会话，全端下线）。 */
async function disableUser(targetId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        status: "disabled",
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, targetId));
    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, targetId));
  });
}

/** PUT /users/:id/status — 启停用（停用走保护校验 + 全端下线；启用直接放行）。 */
export async function updateUserStatus(
  id: string,
  status: "active" | "disabled",
  operator: AuthUser,
): Promise<User> {
  const existing = await db.query.users.findFirst({
    where: and(eq(users.id, id), isNull(users.deletedAt)),
  });

  if (!existing) {
    throw new ServerApiError(404, "USER_NOT_FOUND", "用户不存在");
  }

  if (status === "disabled") {
    await assertTargetOperable(operator, id);
    await disableUser(id);
  } else {
    await db
      .update(users)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(eq(users.id, id));
  }

  await writeLog("user.status_update", operator.id, { id, status });

  return findUser(id);
}

/** DELETE /users/:id — 软删（事务内物理清理角色关联与托管会话）。 */
export async function removeUser(
  id: string,
  operator: AuthUser,
): Promise<null> {
  await assertTargetOperable(operator, id);

  const existing = await db.query.users.findFirst({
    where: and(eq(users.id, id), isNull(users.deletedAt)),
  });

  if (!existing) {
    throw new ServerApiError(404, "USER_NOT_FOUND", "用户不存在");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(users.id, id));
    await tx.delete(userRoles).where(eq(userRoles.userId, id));
    await tx.delete(userPosts).where(eq(userPosts.userId, id));
    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, id));
  });

  await writeLog("user.delete", operator.id, {
    id,
    username: existing.username,
  });

  return null;
}

/** DELETE /users?ids= — 批量软删（全有全无：任一无效/受保护整体拒绝）。 */
export async function batchRemoveUsers(
  ids: string[],
  operator: AuthUser,
): Promise<null> {
  if (ids.length === 0) {
    throw new ServerApiError(400, "INVALID_OPERATION", "缺少要删除的用户");
  }

  const rows = await db
    .select()
    .from(users)
    .where(and(inArray(users.id, ids), isNull(users.deletedAt)));

  if (rows.length !== ids.length) {
    throw new ServerApiError(
      400,
      "INVALID_OPERATION",
      "包含无效或已删除的用户",
    );
  }

  for (const id of ids) {
    // 保护校验逐个执行（任一命中整体拒绝），但不重复返回 404（上面已校验）
    await assertTargetOperable(operator, id);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ deletedAt: new Date().toISOString() })
      .where(inArray(users.id, ids));
    await tx.delete(userRoles).where(inArray(userRoles.userId, ids));
    await tx.delete(userPosts).where(inArray(userPosts.userId, ids));
    await tx.delete(refreshTokens).where(inArray(refreshTokens.userId, ids));
  });

  await writeLog("user.batch_delete", operator.id, { ids });

  return null;
}

/** POST /users/:id/reset-password — 重置密码（tokenVersion+1 + 清托管会话）。 */
export async function resetUserPassword(
  id: string,
  newPassword: string,
  operator: AuthUser,
): Promise<null> {
  if (newPassword.length < 6) {
    throw new ServerApiError(400, "VALIDATION_ERROR", "新密码长度至少 6 位");
  }

  await assertTargetOperable(operator, id);

  const existing = await db.query.users.findFirst({
    where: and(eq(users.id, id), isNull(users.deletedAt)),
  });

  if (!existing) {
    throw new ServerApiError(404, "USER_NOT_FOUND", "用户不存在");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
        tokenVersion: sql`${users.tokenVersion} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, id));
    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, id));
  });

  await writeLog("user.reset_password", operator.id, { id });

  return null;
}

/** 操作日志（失败不阻断主流程，与 Nest 端一致）。 */
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
    console.error("[users] 写入日志失败:", err);
  }
}

/** 用户视图类型供路由引用（AuthUser 复用 api-types）。 */
export type { AuthUser };

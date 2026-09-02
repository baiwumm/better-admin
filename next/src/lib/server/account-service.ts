import "server-only";

import type { AccountProfile } from "@/lib/api-types";

import bcrypt from "bcryptjs";
import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { logs, refreshTokens, roles, userRoles, users } from "@/db/schema";
import { ServerApiError } from "@/lib/server/http";
import { removeAvatarObject, uploadAvatar } from "@/lib/server/avatar-storage";
import { generateRecordId } from "@/lib/server/ids";

/**
 * 我的账户服务（与 nest/src/account/account.service.ts 一一对齐）。
 * 全部接口仅需登录（契约 x-permission: NONE）；改邮箱/密码需当前密码确认；
 * 改密码成功即 tokenVersion+1 + 清托管会话（全端下线）。
 */

/** 个人标签规约：trim → 去空 → 去重，单项 1-20 字符、最多 10 个 */
function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();

  for (const item of raw) {
    const tag = item.trim();

    if (!tag) continue;
    if (tag.length > 20) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "单个标签不能超过 20 个字符",
      );
    }
    seen.add(tag);
  }

  if (seen.size > 10) {
    throw new ServerApiError(400, "VALIDATION_ERROR", "标签最多 10 个");
  }

  return [...seen];
}

/** 加载未软删用户行，不存在（登录后账号被删）按 401 处理。 */
async function loadRow(userId: string) {
  const row = await db.query.users.findFirst({
    where: and(eq(users.id, userId), isNull(users.deletedAt)),
  });

  if (!row) {
    throw new ServerApiError(401, "USER_NOT_FOUND", "用户不存在或已删除");
  }

  return row;
}

async function loadRoles(userId: string): Promise<AccountProfile["roles"]> {
  const rows = await db
    .select({ roleId: roles.id, roleName: roles.name, roleCode: roles.code })
    .from(roles)
    .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId))
    .orderBy(asc(roles.sort), asc(roles.name));

  return rows.map((r) => ({
    id: r.roleId,
    name: r.roleName,
    code: r.roleCode,
  }));
}

async function buildProfile(userId: string): Promise<AccountProfile> {
  const [row, roleViews] = await Promise.all([
    loadRow(userId),
    loadRoles(userId),
  ]);

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
    roles: roleViews,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt,
  };
}

/** GET /account/profile — 账户详情。 */
export async function getAccountProfile(
  userId: string,
): Promise<AccountProfile> {
  return buildProfile(userId);
}

export interface UpdateAccountProfileInput {
  displayName?: string;
  /** undefined = 未修改；null = 清空 */
  phone?: string | null;
  tags?: string[];
  website?: string | null;
  githubUsername?: string | null;
  xUsername?: string | null;
}

/** PUT /account/profile — 更新基本信息（个人链接裸值已由 DTO 剥前缀）。 */
export async function updateAccountProfile(
  userId: string,
  dto: UpdateAccountProfileInput,
): Promise<AccountProfile> {
  // 仅校验用户存在（未软删），字段级联更新见下
  await loadRow(userId);

  const patch: Partial<typeof users.$inferInsert> = {};

  if (dto.displayName !== undefined) {
    patch.displayName = dto.displayName;
  }
  if (dto.phone !== undefined) {
    patch.phone = dto.phone;
  }
  if (dto.tags !== undefined) {
    patch.tags = normalizeTags(dto.tags);
  }
  // 个人链接三字段（v1.5.2）：undefined = 未修改；null = 清空
  if (dto.website !== undefined) {
    patch.website = dto.website;
  }
  if (dto.githubUsername !== undefined) {
    patch.githubUsername = dto.githubUsername;
  }
  if (dto.xUsername !== undefined) {
    patch.xUsername = dto.xUsername;
  }

  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, userId));
    await writeLog("account.profile_update", userId, {
      fields: Object.keys(patch),
    });
  }

  return buildProfile(userId);
}

export interface UpdateAccountEmailInput {
  email: string;
  currentPassword: string;
}

/** PUT /account/email — 改邮箱（当前密码确认；唯一冲突 409 EMAIL_EXISTS）。 */
export async function updateAccountEmail(
  userId: string,
  dto: UpdateAccountEmailInput,
): Promise<AccountProfile> {
  const existing = await loadRow(userId);

  await assertCurrentPassword(existing.passwordHash, dto.currentPassword);

  if (dto.email !== existing.email) {
    try {
      // 邮箱唯一性由「未删除记录部分唯一索引」兜底，冲突转 409 EMAIL_EXISTS
      await db
        .update(users)
        .set({ email: dto.email })
        .where(eq(users.id, userId));
    } catch (error) {
      handleUniqueError(error);
    }
    await writeLog("account.email_update", userId, { email: dto.email });
  }

  return buildProfile(userId);
}

export interface UpdateAccountPasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * 自助修改密码：校验当前密码 → 写入新 hash + tokenVersion+1 → 清空托管 refreshToken。
 * 当前会话（含本请求使用的 access token）随即全部失效，客户端须引导重新登录。
 */
export async function updateAccountPassword(
  userId: string,
  dto: UpdateAccountPasswordInput,
): Promise<null> {
  const existing = await loadRow(userId);

  await assertCurrentPassword(existing.passwordHash, dto.currentPassword);

  const passwordHash = await bcrypt.hash(dto.newPassword, 10);

  await db
    .update(users)
    .set({ passwordHash, tokenVersion: existing.tokenVersion + 1 })
    .where(eq(users.id, userId));
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

  await writeLog("account.password_update", userId, null);

  return null;
}

/** 上传头像（服务端中转 Supabase Storage）并写入 users.avatar。 */
export async function updateAccountAvatar(
  userId: string,
  file: { buffer: Buffer; mimetype: string; size: number },
): Promise<{ avatar: string }> {
  await loadRow(userId);

  const avatar = await uploadAvatar(userId, file);

  await db.update(users).set({ avatar }).where(eq(users.id, userId));

  await writeLog("account.avatar_update", userId, null);

  return { avatar };
}

/**
 * 删除头像（v1.5.1）：置空 users.avatar，并按现有 URL 尽力清理
 * Storage 对象（对象删除失败不阻断）。
 */
export async function deleteAccountAvatar(
  userId: string,
): Promise<AccountProfile> {
  const row = await loadRow(userId);

  if (row.avatar) {
    // avatar URL 形如 .../storage/v1/object/public/avatars/{userId}.{ext}?v=...
    const match = row.avatar.match(/avatars\/([^?]+)/);

    if (match) {
      await removeAvatarObject(decodeURIComponent(match[1]));
    }
  }

  await db.update(users).set({ avatar: null }).where(eq(users.id, userId));

  await writeLog("account.avatar_delete", userId, null);

  return buildProfile(userId);
}

async function assertCurrentPassword(
  passwordHash: string,
  currentPassword: string,
): Promise<void> {
  const ok = await bcrypt.compare(currentPassword, passwordHash);

  if (!ok) {
    throw new ServerApiError(
      400,
      "CURRENT_PASSWORD_INCORRECT",
      "当前密码不正确",
    );
  }
}

/** 捕获唯一索引冲突转 409（postgres.js 的 pg 错误字段为 constraint_name）。 */
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

  if (constraint.includes("email")) {
    throw new ServerApiError(409, "EMAIL_EXISTS", "邮箱已存在");
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
    console.error("[account] 写入日志失败:", err);
  }
}

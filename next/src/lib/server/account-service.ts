import "server-only";

import type { AccountProfile } from "@/lib/api-types";

import bcrypt from "bcryptjs";
import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { logs, refreshTokens, roles, userRoles, users } from "@/db/schema";
import { ServerApiError } from "@/lib/server/http";
import { removeAvatarObject, uploadAvatar } from "@/lib/server/avatar-storage";
import { generateRecordId } from "@/lib/server/ids";
import {
  assertPasswordNotContainingUsername,
  assertPasswordNotSameAsCurrent,
} from "@/lib/server/password-policy";

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
    // 与角色管理列表同口径（契约 v1.7.2）：sort 大在前；名称字母序兜底
    .orderBy(desc(roles.sort), asc(roles.name));

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

/** 剥离可选协议与平台主页前缀，trim 后返回剩余裸值；空串归一为 null（语义 = 清空） */
function stripPrefix(pattern: RegExp, value: string): string | null {
  const stripped = value.trim().replace(pattern, "");

  return stripped === "" ? null : stripped;
}

function assertMatches(
  value: string | null,
  pattern: RegExp,
  message: string,
): void {
  if (value !== null && !pattern.test(value)) {
    throw new ServerApiError(400, "VALIDATION_ERROR", message);
  }
}

/**
 * profile 字段级校验与前缀剥离（对齐 nest account.dto.ts 的 Transform + Matches）：
 * 个人链接字段接受裸值或平台主页 URL，入库前剥离为裸值；null = 清空放行。
 */
function normalizeProfileInput(
  dto: UpdateAccountProfileInput,
): UpdateAccountProfileInput {
  // 对齐 nest @Length(1, 50)：校验原始字符串长度（不 trim）
  if (
    dto.displayName !== undefined &&
    (dto.displayName.length < 1 || dto.displayName.length > 50)
  ) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      "displayName 长度须为 1-50 个字符",
    );
  }

  let phone: string | null | undefined;

  if (dto.phone !== undefined) {
    phone = dto.phone === null ? null : dto.phone.trim() || null;
    assertMatches(phone, /^\+?[0-9][0-9\- ]{3,19}$/, "电话格式不正确");
  }

  let website: string | null | undefined;

  if (dto.website !== undefined) {
    website =
      dto.website === null ? null : stripPrefix(/^https?:\/\//i, dto.website);
    // 对齐 nest @MaxLength(255)：作用于剥离前缀后的裸值（契约 AccountProfileUpdateRequest）
    if (website !== null && website.length > 255) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "website 不能超过 255 个字符",
      );
    }
    assertMatches(
      website,
      /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,63}(?::\d{1,5})?(?:\/\S*)?$/,
      "网站格式不正确，示例：baidu.com",
    );
  }

  let githubUsername: string | null | undefined;

  if (dto.githubUsername !== undefined) {
    githubUsername =
      dto.githubUsername === null
        ? null
        : stripPrefix(
            /^(?:https?:\/\/)?(?:www\.)?github\.com\//i,
            dto.githubUsername,
          );
    assertMatches(
      githubUsername,
      /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/,
      "GitHub 用户名格式不正确",
    );
  }

  let xUsername: string | null | undefined;

  if (dto.xUsername !== undefined) {
    xUsername =
      dto.xUsername === null
        ? null
        : stripPrefix(
            /^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\//i,
            dto.xUsername,
          );
    assertMatches(xUsername, /^[a-zA-Z0-9_]{4,15}$/, "X 用户名格式不正确");
  }

  return {
    ...dto,
    ...(phone !== undefined ? { phone } : {}),
    ...(website !== undefined ? { website } : {}),
    ...(githubUsername !== undefined ? { githubUsername } : {}),
    ...(xUsername !== undefined ? { xUsername } : {}),
  };
}

/** PUT /account/profile — 更新基本信息（个人链接剥前缀 + 字段级校验，对齐 nest DTO）。 */
export async function updateAccountProfile(
  userId: string,
  dto: UpdateAccountProfileInput,
): Promise<AccountProfile> {
  await loadRow(userId);

  const normalized = normalizeProfileInput(dto);
  const patch: Partial<typeof users.$inferInsert> = {};

  if (normalized.displayName !== undefined) {
    patch.displayName = normalized.displayName;
  }
  if (normalized.phone !== undefined) {
    patch.phone = normalized.phone;
  }
  if (normalized.tags !== undefined) {
    patch.tags = normalizeTags(normalized.tags);
  }
  // 个人链接三字段（v1.5.2）：undefined = 未修改；null = 清空
  if (normalized.website !== undefined) {
    patch.website = normalized.website;
  }
  if (normalized.githubUsername !== undefined) {
    patch.githubUsername = normalized.githubUsername;
  }
  if (normalized.xUsername !== undefined) {
    patch.xUsername = normalized.xUsername;
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
 * 自助修改密码：校验当前密码 → 密码策略跨字段项 → 写入新 hash + tokenVersion+1 → 清空托管 refreshToken。
 * 当前会话（含本请求使用的 access token）随即全部失效，客户端须引导重新登录。
 */
export async function updateAccountPassword(
  userId: string,
  dto: UpdateAccountPasswordInput,
): Promise<null> {
  const existing = await loadRow(userId);

  await assertCurrentPassword(existing.passwordHash, dto.currentPassword);

  // 密码策略跨字段项（v1.8.0）：不能包含本人用户名；新旧相同由「静默成功」（v0.9）
  // 改为 400 PASSWORD_SAME_AS_OLD——前端可明确提示，且与重置密码口径一致
  assertPasswordNotContainingUsername(dto.newPassword, existing.username);
  await assertPasswordNotSameAsCurrent(dto.newPassword, existing.passwordHash);

  const passwordHash = await bcrypt.hash(dto.newPassword, 10);

  // 写新密码（tokenVersion+1）与清空托管 refreshToken 同一事务（不留中间态）
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, tokenVersion: existing.tokenVersion + 1 })
      .where(eq(users.id, userId));
    await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  });

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

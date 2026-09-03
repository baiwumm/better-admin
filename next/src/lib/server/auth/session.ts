import "server-only";

import type { AuthUser } from "@/lib/api-types";

import { createHash } from "node:crypto";

import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import {
  logs,
  refreshTokens,
  roleMenus,
  roles,
  userRoles,
  users,
} from "@/db/schema";
import { normalizePermissionBits } from "@/lib/server/permissions";
import { ServerApiError } from "@/lib/server/http";
import {
  decodeTokenExp,
  signToken,
  verifyToken,
} from "@/lib/server/auth/tokens";
import { generateRecordId } from "@/lib/server/ids";

/**
 * 会话服务（与 nest/src/auth/auth.service.ts 一一对齐的 Next 实现）。
 *
 * 业务规则完全一致（AGENTS §18.9 / §数据库共用同一 Schema）：
 * - 登录：bcrypt 校验（软删除行不可命中）→ 停用用户拒绝（v1.4.7）→
 *   rememberMe 分档签发双令牌（access 1h 无状态；refresh 长效并托管）；
 * - refresh：验签 → 托管表存在且未过期 → ver 与当前 tokenVersion 比对 →
 *   事务内轮换（删旧插新，新 refresh 继承原行 expiresAt 固定窗口）；
 * - 撤销：logout 带 refreshToken 精确撤本设备，不带则撤该用户全部会话；
 * - JWT payload 携带 ver 对齐 users.token_version（改密码/封禁全端下线）。
 *
 * 差异仅传输层：令牌经 httpOnly Cookie 下发（cookies.ts），响应体仍按契约
 * 返回 accessToken/refreshToken 字段（客户端可忽略）。
 */

/** refreshToken 托管哈希（不落明文）：SHA-256 hex。 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * 聚合用户权限位：OR 其所有**启用**角色在 role_menus 上的授权位。
 * super_admin 角色为 -1n，OR 后整体仍为 -1n（全量位）。
 * 停用角色（enabled=false）不参与聚合，实现权限即时回收。
 */
export async function aggregatePermissions(userId: string): Promise<bigint> {
  const rows = await db
    .select({ bits: roleMenus.permissions })
    .from(roleMenus)
    .innerJoin(userRoles, eq(roleMenus.roleId, userRoles.roleId))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(roles.enabled, true)));

  let agg = 0n;

  for (const r of rows) {
    agg |= r.bits;
  }

  return agg;
}

/**
 * 按 id 加载用户视图（含角色 code 与聚合权限位）。
 * 传入 expectedVer 时同时校验 JWT 的 ver claim 与用户当前 token_version
 * 一致（旧 token 无 ver 视为 0），不一致返回 null → 守卫层表现为 401，
 * 实现「改密码/封禁后全端强制下线」，且不增加额外查询。
 */
export async function loadUserWithPermissions(
  userId: string,
  expectedVer?: number,
): Promise<AuthUser | null> {
  // 软删除用户不可再通过任何鉴权链路（登录/每请求/refresh 均走本方法）
  const user = await db.query.users.findFirst({
    where: and(eq(users.id, userId), isNull(users.deletedAt)),
  });

  if (!user) return null;
  // 停用用户每请求拒绝：覆盖「编辑接口直接改 status」不递增 tokenVersion 的路径
  if (user.status === "disabled") return null;
  if (expectedVer !== undefined && (expectedVer ?? 0) !== user.tokenVersion) {
    return null;
  }

  const roleRows = await db
    .select({ code: roles.code })
    .from(roles)
    .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, userId), eq(roles.enabled, true)));

  const permissions = await aggregatePermissions(userId);

  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    // v1.4.8：视图补充邮箱（前端统一用户信息展示，侧边栏次行）
    email: user.email,
    // v1.5.0：头像 / 电话 / 个人标签（我的账户与侧边栏展示）
    avatar: user.avatar,
    phone: user.phone,
    tags: user.tags ?? [],
    // v1.5.3：个人链接三字段（侧边栏「个人链接」菜单），只读裸值
    website: user.website,
    githubUsername: user.githubUsername,
    xUsername: user.xUsername,
    roles: roleRows.map((r) => r.code),
    // 对外输出正数全量位（-1n → 9223372036854775807），避免前端符号歧义
    permissions: normalizePermissionBits(permissions).toString(),
  };
}

/** 校验用户名/密码，返回不含密码的用户记录（仅未软删除用户可命中）。 */
export async function validateCredentials(username: string, password: string) {
  const user = await db.query.users.findFirst({
    // username 为部分唯一索引（deleted_at IS NULL），必须过滤软删除行，
    // 否则同名新用户存在时可能命中已删除的旧行（幽灵用户登录）
    where: and(eq(users.username, username), isNull(users.deletedAt)),
  });

  if (!user) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);

  if (!ok) return null;
  // 不直接返回 passwordHash
  const { passwordHash: _omit, ...safe } = user;

  return safe;
}

/**
 * 签发 access/refresh 双令牌：
 * - accessToken 统一短效（JWT_EXPIRES_IN，默认 1h），无状态、不做黑名单；
 * - refreshToken 按 rememberMe 分档长效：勾选 REFRESH_EXPIRES_IN（默认 30d）、
 *   未勾选 REFRESH_EXPIRES_IN_SHORT（默认 1d）；服务端托管于 refresh_tokens 表；
 * - 两类 payload 均携带 ver（tokenVersion），用户级撤销即刻生效。
 */
async function signTokens(
  user: { id: string; username: string; tokenVersion: number },
  rememberMe: boolean,
) {
  const commonClaims = {
    sub: user.id,
    username: user.username,
    ver: user.tokenVersion,
  };
  const accessToken = await signToken(
    { ...commonClaims, type: "access" },
    process.env.JWT_EXPIRES_IN ?? "1h",
  );
  const refreshToken = await signToken(
    { ...commonClaims, type: "refresh" },
    rememberMe
      ? (process.env.REFRESH_EXPIRES_IN ?? "30d")
      : (process.env.REFRESH_EXPIRES_IN_SHORT ?? "1d"),
  );

  return { accessToken, refreshToken };
}

/** 将 refreshToken（哈希）写入托管表，过期时间取自 JWT exp（与真实有效期一致）。 */
async function storeRefreshToken(userId: string, refreshToken: string) {
  const exp = decodeTokenExp(refreshToken);

  await db.insert(refreshTokens).values({
    // pulled schema 内省不到 nanoid 的客户端默认值，主键显式生成（见 lib/server/ids.ts）
    id: generateRecordId(),
    userId,
    tokenHash: hashToken(refreshToken),
    expiresAt:
      exp !== null
        ? new Date(exp * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

export interface ClientMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export async function login(
  dto: { username: string; password: string; rememberMe?: boolean },
  meta?: ClientMeta,
): Promise<LoginResult> {
  const user = await validateCredentials(dto.username, dto.password);

  if (!user) {
    throw new ServerApiError(401, "INVALID_CREDENTIALS", "用户名或密码错误");
  }
  // 停用用户拒绝新登录（v1.4.7）：存量会话由 /status 停用时的 tokenVersion 递增踢下线
  if (user.status === "disabled") {
    throw new ServerApiError(401, "USER_DISABLED", "账号已停用，请联系管理员");
  }

  const rememberMe = dto.rememberMe === true;
  const tokens = await signTokens(user, rememberMe);

  await storeRefreshToken(user.id, tokens.refreshToken);
  // v1.5.0：记录最近登录成功时间（我的账户展示 lastLoginAt）
  await db
    .update(users)
    .set({ lastLoginAt: new Date().toISOString() })
    .where(eq(users.id, user.id));
  const view = await loadUserWithPermissions(user.id);

  if (!view) {
    // 刚通过凭证校验的存活用户必然可加载（防御性兜底）
    throw new ServerApiError(401, "INVALID_CREDENTIALS", "用户名或密码错误");
  }

  // 记录登录成功日志（含 IP / UA，便于审计）
  await writeLog({
    type: "login",
    action: rememberMe ? "login.success.remember" : "login.success",
    userId: user.id,
    ip: meta?.ip ?? null,
    userAgent: meta?.userAgent ?? null,
  });

  return { ...tokens, user: view };
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

/**
 * 刷新访问令牌（refreshToken 服务端托管 + 轮换）：
 * 1. 验签确认是合法 refresh token；
 * 2. 查托管表：必须存在记录且未到 expiresAt（登出/被撤销/重放伪造均在此拒绝）；
 * 3. 校验 payload.ver 与用户当前 tokenVersion（改密码/封禁后旧链路失效）；
 * 4. 事务内轮换：删旧行、插新行（新 refresh 继承原行 expiresAt，固定窗口非滑动续期）；
 * 5. 返回新的 access + refresh 双令牌。
 */
export async function refresh(
  refreshToken: string | null,
): Promise<RefreshResult> {
  try {
    if (!refreshToken) throw new Error("refreshToken is required");

    const payload = await verifyToken(refreshToken, "refresh");

    if (payload.type !== "refresh") {
      throw new Error("invalid token type");
    }

    const tokenHash = hashToken(refreshToken);
    const rows = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);
    const record = rows[0];

    if (!record || new Date(record.expiresAt).getTime() <= Date.now()) {
      throw new Error("refresh token not found or expired");
    }

    // 用户不存在 / payload.ver 与当前 tokenVersion 不一致 → 拒绝刷新
    const currentUser = await loadUserWithPermissions(payload.sub, payload.ver);

    if (!currentUser) {
      throw new Error("token version mismatch or user missing");
    }

    // 新 refreshToken 过期时间继承原行剩余窗口；不足 60s 时按 60s 兜底
    const remainingSeconds = Math.max(
      60,
      Math.floor((new Date(record.expiresAt).getTime() - Date.now()) / 1000),
    );
    const baseClaims = {
      sub: payload.sub,
      username: payload.username,
      ver: payload.ver ?? 0,
    };
    const accessToken = await signToken(
      { ...baseClaims, type: "access" },
      process.env.JWT_EXPIRES_IN ?? "1h",
    );
    const newRefreshToken = await signToken(
      { ...baseClaims, type: "refresh" },
      remainingSeconds,
    );

    await db.transaction(async (tx) => {
      await tx
        .delete(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash));
      await tx.insert(refreshTokens).values({
        id: generateRecordId(),
        userId: payload.sub,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: record.expiresAt,
      });
    });

    return { accessToken, refreshToken: newRefreshToken };
  } catch {
    throw new ServerApiError(
      401,
      "REFRESH_TOKEN_INVALID",
      "refreshToken 无效或已过期",
    );
  }
}

/**
 * 登出：有 refreshToken 精确撤销本设备会话；否则撤销该用户全部托管会话（全端下线）。
 */
export async function logout(
  user: AuthUser,
  meta?: ClientMeta,
  refreshToken?: string | null,
): Promise<void> {
  if (refreshToken) {
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)));
  } else {
    await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
  }

  await writeLog({
    type: "login",
    action: "logout",
    userId: user.id,
    ip: meta?.ip ?? null,
    userAgent: meta?.userAgent ?? null,
  });
}

/** 写操作日志（失败不阻断主流程，与 Nest 端一致）。 */
export async function writeLog(input: {
  type: string;
  action: string;
  userId: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await db.insert(logs).values({
      id: generateRecordId(),
      type: input.type,
      userId: input.userId,
      action: input.action,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (err) {
    console.error("[auth] 写入日志失败:", err);
  }
}

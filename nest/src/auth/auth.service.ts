import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { users, userRoles, roleMenus, roles, logs, refreshTokens } from '../db/schema';
import { normalizePermissionBits } from '../db/schema/permissions.enum';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

/** req.user / JWT 载荷中挂载的用户视图 */
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  /** 用户邮箱（v1.4.8：前端统一用户信息展示） */
  email: string;
  roles: string[]; // 角色 code 列表
  /** 聚合权限位（bigint 全量位，super_admin 为 -1n）。以字符串返回避免 JSON 精度丢失。 */
  permissions: string;
}

interface AuthJwtPayload {
  sub: string;
  username: string;
  type?: 'access' | 'refresh';
  /** 签发时的用户 tokenVersion，与 users.token_version 比对实现全端撤销 */
  ver?: number;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * 聚合用户权限位：OR 其所有角色在 role_menus 上的授权位。
   * super_admin 角色为 -1n，OR 后整体仍为 -1n（全量位）。
   */
  private async aggregatePermissions(userId: string): Promise<bigint> {
    const rows = await db
      .select({ bits: roleMenus.permissions })
      .from(roleMenus)
      .innerJoin(userRoles, eq(roleMenus.roleId, userRoles.roleId))
      .where(eq(userRoles.userId, userId));

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
  async loadUserWithPermissions(userId: string, expectedVer?: number): Promise<AuthUser | null> {
    // 软删除用户不可再通过任何鉴权链路（登录/每请求/refresh 均走本方法）
    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
    });
    if (!user) return null;
    // 停用用户每请求拒绝：覆盖「编辑接口直接改 status」不递增 tokenVersion 的路径
    if (user.status === 'disabled') return null;
    if (expectedVer !== undefined && (expectedVer ?? 0) !== user.tokenVersion) {
      return null;
    }

    const roleRows = await db
      .select({ code: roles.code })
      .from(roles)
      .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId));

    const permissions = await this.aggregatePermissions(userId);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      // v1.4.8：视图补充邮箱（前端统一用户信息展示，侧边栏次行）
      email: user.email,
      roles: roleRows.map((r) => r.code),
      // 对外输出正数全量位（-1n → 9223372036854775807），避免前端符号歧义
      permissions: normalizePermissionBits(permissions).toString(),
    };
  }

  /** 校验用户名/密码，返回不含密码的用户记录（仅未软删除用户可命中） */
  async validateCredentials(username: string, password: string) {
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

  /** refreshToken 托管哈希（不落明文）：SHA-256 hex */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * 签发 access/refresh 双令牌：
   * - accessToken 统一短效（JWT_EXPIRES_IN，默认 1h），无状态、不做黑名单；
   *   泄露残留窗口 ≤ 有效期，登出后由「refresh 已撤销」兜底整体会话失效。
   * - refreshToken 按 rememberMe 分档长效：勾选 REFRESH_EXPIRES_IN（默认 30d）、
   *   未勾选 REFRESH_EXPIRES_IN_SHORT（默认 1d）；服务端托管于 refresh_tokens 表，
   *   可按设备/按用户撤销。
   * - 两类 payload 均携带 ver（tokenVersion），用户级撤销即刻生效。
   */
  private signTokens(user: { id: string; username: string; tokenVersion: number }, rememberMe: boolean) {
    const commonClaims = {
      sub: user.id,
      username: user.username,
      ver: user.tokenVersion,
    };
    const accessToken = this.jwtService.sign(
      { ...commonClaims, type: 'access' as const },
      { expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as never },
    );
    const refreshToken = this.jwtService.sign(
      { ...commonClaims, type: 'refresh' as const },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
        expiresIn: (
          rememberMe
            ? (process.env.REFRESH_EXPIRES_IN ?? '30d')
            : (process.env.REFRESH_EXPIRES_IN_SHORT ?? '1d')
        ) as never,
      },
    );
    return { accessToken, refreshToken };
  }

  /** 将 refreshToken（哈希）写入托管表，过期时间取自 JWT exp（与真实有效期一致） */
  private async storeRefreshToken(userId: string, refreshToken: string) {
    const decoded = this.jwtService.decode(refreshToken) as { exp?: number } | null;
    const expiresAt = decoded?.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(refreshTokens).values({
      userId,
      tokenHash: this.hashToken(refreshToken),
      expiresAt,
    });
  }

  async login(dto: LoginDto, meta?: { ip?: string | null; userAgent?: string | null }) {
    const user = await this.validateCredentials(dto.username, dto.password);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: '用户名或密码错误',
      });
    }
    // 停用用户拒绝新登录（v1.4.7）：存量会话由 /status 停用时的 tokenVersion 递增踢下线
    if (user.status === 'disabled') {
      throw new UnauthorizedException({
        code: 'USER_DISABLED',
        message: '账号已停用，请联系管理员',
      });
    }

    const rememberMe = dto.rememberMe === true;
    const tokens = this.signTokens(user, rememberMe);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    const view = await this.loadUserWithPermissions(user.id);

    // 记录登录成功日志（含 IP / UA，便于审计）
    await this.writeLog({
      type: 'login',
      action: rememberMe ? 'login.success.remember' : 'login.success',
      userId: user.id,
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: view,
    };
  }

  /**
   * 刷新访问令牌（refreshToken 服务端托管 + 轮换）：
   * 1. 验签确认是合法 refresh token；
   * 2. 查托管表：必须存在记录且未到 expiresAt（登出/被撤销/重放伪造均在此拒绝）；
   * 3. 校验 payload.ver 与用户当前 tokenVersion（改密码/封禁后旧链路失效）；
   * 4. 事务内轮换：删旧行、插新行（新 refresh 继承原行 expiresAt，固定窗口非滑动续期）；
   * 5. 返回新的 access + refresh 双令牌。
   */
  async refresh(dto: RefreshDto) {
    try {
      const payload = this.jwtService.verify<AuthJwtPayload>(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
      });
      if (payload.type !== 'refresh') {
        throw new Error('invalid token type');
      }

      const tokenHash = this.hashToken(dto.refreshToken);
      const rows = await db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1);
      const record = rows[0];
      if (!record || record.expiresAt.getTime() <= Date.now()) {
        throw new Error('refresh token not found or expired');
      }

      // 用户不存在 / payload.ver 与当前 tokenVersion 不一致 → 拒绝刷新
      const currentUser = await this.loadUserWithPermissions(payload.sub, payload.ver);
      if (!currentUser) {
        throw new Error('token version mismatch or user missing');
      }

      // 新 refreshToken 过期时间继承原行剩余窗口；不足 60s 时按 60s 兜底
      const remainingSeconds = Math.max(
        60,
        Math.floor((record.expiresAt.getTime() - Date.now()) / 1000),
      );
      const baseClaims = { sub: payload.sub, username: payload.username, ver: payload.ver ?? 0 };
      const accessToken = this.jwtService.sign(
        { ...baseClaims, type: 'access' as const },
        { expiresIn: (process.env.JWT_EXPIRES_IN ?? '1h') as never },
      );
      const newRefreshToken = this.jwtService.sign(
        { ...baseClaims, type: 'refresh' as const },
        {
          secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
          expiresIn: remainingSeconds,
        },
      );

      await db.transaction(async (tx) => {
        await tx.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
        await tx.insert(refreshTokens).values({
          userId: payload.sub,
          tokenHash: this.hashToken(newRefreshToken),
          expiresAt: record.expiresAt,
        });
      });

      return { accessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_INVALID',
        message: 'refreshToken 无效或已过期',
      });
    }
  }

  async logout(
    user: AuthUser,
    meta?: { ip?: string | null; userAgent?: string | null },
    refreshToken?: string | null,
  ) {
    // 有 refreshToken 精确撤销本设备会话；否则撤销该用户全部托管会话（全端下线）
    if (refreshToken) {
      await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, this.hashToken(refreshToken)));
    } else {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));
    }

    await this.writeLog({
      type: 'login',
      action: 'logout',
      userId: user.id,
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    });
    return;
  }

  private async writeLog(input: {
    type: string;
    action: string;
    userId: string | null;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    try {
      await db.insert(logs).values({
        type: input.type,
        userId: input.userId,
        action: input.action,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      });
    } catch (err) {
      // 日志写入失败不应阻断主流程

      console.error('[auth] 写入日志失败:', err);
    }
  }
}

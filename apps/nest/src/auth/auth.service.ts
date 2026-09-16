import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { and, eq, inArray, isNull, notInArray } from 'drizzle-orm';
import { db } from '@/db/client';
import { users, userRoles, roleMenus, roles, logs, refreshTokens } from '@/db/schema';
import {
  DEMO_ADMIN_ROLE_CODE,
  DEMO_RANDOM_EXCLUDED_ROLE_CODES,
} from '@/db/demo.constants';
import { isDemoMode } from '@/auth/guards/demo-readonly.guard';
import type { DemoLoginKind } from '@/auth/dto/demo-login.dto';
import { normalizePermissionBits } from '@/db/schema/permissions.enum';
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
  /** 头像 URL（v1.5.0：侧边栏 / 我的账户展示） */
  avatar: string | null;
  /** 电话（v1.5.0） */
  phone: string | null;
  /** 个人标签（v1.5.0，用户自助维护） */
  tags: string[];
  /** 个人网站裸域名（v1.5.3 只读；展示前缀 https:// 由前端拼接） */
  website: string | null;
  /** GitHub 用户名裸值（v1.5.3 只读） */
  githubUsername: string | null;
  /** X（Twitter）用户名裸值（v1.5.3 只读） */
  xUsername: string | null;
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
   * 聚合用户权限位：OR 其所有**启用**角色在 role_menus 上的授权位。
   * super_admin 角色为 -1n，OR 后整体仍为 -1n（全量位）。
   * 停用角色（enabled=false）不参与聚合，实现权限即时回收。
   */
  private async aggregatePermissions(userId: string): Promise<bigint> {
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
      .where(and(eq(userRoles.userId, userId), eq(roles.enabled, true)));

    const permissions = await this.aggregatePermissions(userId);

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
    return this.issueSession(
      user,
      rememberMe,
      meta,
      rememberMe ? 'login.success.remember' : 'login.success',
    );
  }

  /**
   * 签发会话并落托管、最近登录时间、用户视图与登录日志
   * （login 与 demo-login 共用，保证响应结构与审计行为一致）。
   */
  private async issueSession(
    user: { id: string; username: string; tokenVersion: number },
    rememberMe: boolean,
    meta?: { ip?: string | null; userAgent?: string | null },
    logAction = 'login.success',
  ) {
    const tokens = this.signTokens(user, rememberMe);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    // v1.5.0：记录最近登录成功时间（我的账户展示 lastLoginAt）
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    const view = await this.loadUserWithPermissions(user.id);

    // 记录登录成功日志（含 IP / UA，便于审计）
    await this.writeLog({
      type: 'login',
      action: logAction,
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
   * 演示快捷登录（契约 v1.10.0 POST /auth/demo-login）：
   * - DEMO_MODE 关闭时 404（本地开发与常规部署无感）；
   * - admin：「系统管理员」演示角色用户随机一人；
   *   random：其余演示角色两级随机（先等概率选角色，再从该角色用户中随机），
   *   保证每个角色被登录概率均等；
   * - 超管永不进任何快捷池（候选直接排除绑定 super_admin 的用户）；
   * - 演示密码 demo1234 仅服务端脚本与登录校验使用，本端点不接触任何密码，
   *   签发响应结构与 /auth/login 完全一致。
   */
  async demoLogin(kind: DemoLoginKind, meta?: { ip?: string | null; userAgent?: string | null }) {
    if (!isDemoMode()) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: '接口不存在' });
    }

    const picked =
      kind === 'admin'
        ? await this.pickDemoUser([DEMO_ADMIN_ROLE_CODE])
        : await this.pickRandomDemoUser();
    if (!picked) {
      throw new NotFoundException({
        code: 'DEMO_USER_NOT_AVAILABLE',
        message: '演示账号暂不可用，请稍后再试',
      });
    }

    // 快捷登录统一短会话（不记住我），访客会话隔日自然过期
    return this.issueSession(picked, false, meta, 'login.success.demo');
  }

  /**
   * 演示池候选用户：指定角色 code 集合内 enabled 角色的 active 未删除用户，
   * 排除任何绑定了 super_admin 的用户（超管永不进池）。
   */
  private async listDemoUsers(roleCodes: readonly string[]) {
    if (roleCodes.length === 0) return [];
    const superAdminBindings = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, and(eq(roles.id, userRoles.roleId), eq(roles.code, 'super_admin')));
    const exclude = new Set(superAdminBindings.map((row) => row.userId));

    const rows = await db
      .select({
        id: users.id,
        username: users.username,
        tokenVersion: users.tokenVersion,
      })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, and(eq(roles.id, userRoles.roleId), eq(roles.enabled, true)))
      .where(
        and(
          inArray(roles.code, [...roleCodes]),
          eq(users.status, 'active'),
          isNull(users.deletedAt),
        ),
      )
      .groupBy(users.id, users.username, users.tokenVersion);

    return rows.filter((row) => !exclude.has(row.id));
  }

  /** 两级随机的 random 池：先从其余演示角色（排除 super_admin 与 admin 池角色）等概率选一个 */
  private async pickRandomDemoUser() {
    const roleRows = await db
      .select({ code: roles.code })
      .from(roles)
      .where(
        and(
          eq(roles.enabled, true),
          notInArray(roles.code, [...DEMO_RANDOM_EXCLUDED_ROLE_CODES]),
        ),
      );
    const roleCode = this.randomPick(roleRows.map((row) => row.code));
    if (!roleCode) return null;

    return this.pickDemoUser([roleCode]);
  }

  private async pickDemoUser(roleCodes: readonly string[]) {
    const candidates = await this.listDemoUsers(roleCodes);

    return this.randomPick(candidates);
  }

  private randomPick<T>(items: T[]): T | null {
    if (items.length === 0) return null;

    return items[Math.floor(Math.random() * items.length)];
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

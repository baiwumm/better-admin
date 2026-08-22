import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users, userRoles, roleMenus, roles, logs } from '../db/schema';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

/** req.user / JWT 载荷中挂载的用户视图 */
export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  roles: string[]; // 角色 code 列表
  /** 聚合权限位（bigint 全量位，super_admin 为 -1n）。以字符串返回避免 JSON 精度丢失。 */
  permissions: string;
}

interface AuthJwtPayload {
  sub: string;
  username: string;
  type?: 'access' | 'refresh';
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

  /** 按 id 加载用户视图（含角色 code 与聚合权限位） */
  async loadUserWithPermissions(userId: string): Promise<AuthUser | null> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) return null;

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
      roles: roleRows.map((r) => r.code),
      permissions: permissions.toString(),
    };
  }

  /** 校验用户名/密码，返回不含密码的用户记录 */
  async validateCredentials(username: string, password: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.username, username),
    });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    // 不直接返回 passwordHash
    const { passwordHash: _omit, ...safe } = user;
    return safe;
  }

  private signTokens(user: { id: string; username: string }) {
    const accessPayload: AuthJwtPayload = {
      sub: user.id,
      username: user.username,
      type: 'access',
    };
    const refreshPayload: AuthJwtPayload = {
      sub: user.id,
      username: user.username,
      type: 'refresh',
    };
    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as never,
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
      expiresIn: (process.env.REFRESH_EXPIRES_IN ?? '30d') as never,
    });
    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto, meta?: { ip?: string | null; userAgent?: string | null }) {
    const user = await this.validateCredentials(dto.username, dto.password);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: '用户名或密码错误',
      });
    }

    const tokens = this.signTokens(user);
    const view = await this.loadUserWithPermissions(user.id);

    // 记录登录成功日志（含 IP / UA，便于审计）
    await this.writeLog({
      type: 'login',
      action: 'login.success',
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

  async refresh(dto: RefreshDto) {
    try {
      const payload = this.jwtService.verify<AuthJwtPayload>(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET,
      });
      if (payload.type !== 'refresh') {
        throw new Error('invalid token type');
      }
      const accessToken = this.jwtService.sign(
        { sub: payload.sub, username: payload.username, type: 'access' },
        { expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as never },
      );
      return { accessToken };
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
  ) {
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

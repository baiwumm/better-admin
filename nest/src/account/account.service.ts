import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { eq, isNull, and } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { db } from '../db/client';
import { logs, refreshTokens, roles, userRoles, users } from '../db/schema';
import { AvatarStorageService } from './avatar-storage.service';
import {
  UpdateAccountEmailDto,
  UpdateAccountPasswordDto,
  UpdateAccountProfileDto,
} from './dto/account.dto';

/** 我的账户角色视图（同管理端 User.roles 子集） */
export type AccountRoleView = {
  id: string;
  name: string;
  code: string;
};

/** 我的账户详情视图（契约 AccountProfile） */
export type AccountProfile = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string | null;
  phone: string | null;
  tags: string[];
  /** 个人网站裸域名（v1.5.2，如 baidu.com，不带协议；展示前缀由前端拼接） */
  website: string | null;
  /** GitHub 用户名裸值（v1.5.2） */
  githubUsername: string | null;
  /** X（Twitter）用户名裸值（v1.5.2） */
  xUsername: string | null;
  status: string;
  roles: AccountRoleView[];
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

/** 个人标签规约：trim → 去空 → 去重，单项 1-20 字符、最多 10 个 */
function normalizeTags(raw: string[]): string[] {
  const seen = new Set<string>();
  for (const item of raw) {
    const tag = item.trim();
    if (!tag) continue;
    if (tag.length > 20) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: '单个标签不能超过 20 个字符',
      });
    }
    seen.add(tag);
  }
  if (seen.size > 10) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: '标签最多 10 个',
    });
  }
  return [...seen];
}

@Injectable()
export class AccountService {
  constructor(private readonly avatarStorage: AvatarStorageService) {}

  /** 加载未软删用户行，不存在（登录后账号被删）按 401 处理 */
  private async loadRow(userId: string) {
    const row = await db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
    });
    if (!row) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在或已删除',
      });
    }
    return row;
  }

  private async loadRoles(userId: string): Promise<AccountRoleView[]> {
    const rows = await db
      .select({ roleId: roles.id, roleName: roles.name, roleCode: roles.code })
      .from(roles)
      .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, userId))
      .orderBy(roles.sort, roles.name);
    return rows.map((r) => ({
      id: r.roleId,
      name: r.roleName,
      code: r.roleCode,
    }));
  }

  private async buildProfile(userId: string): Promise<AccountProfile> {
    const [row, roles] = await Promise.all([
      this.loadRow(userId),
      this.loadRoles(userId),
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
      status: row.status,
      roles,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt,
    };
  }

  async getProfile(userId: string): Promise<AccountProfile> {
    return this.buildProfile(userId);
  }

  async updateProfile(
    userId: string,
    dto: UpdateAccountProfileDto,
  ): Promise<AccountProfile> {
    // 仅校验用户存在（未软删），字段级联更新见下
    await this.loadRow(userId);

    const patch: Partial<typeof users.$inferInsert> = {};
    if (dto.displayName !== undefined) {
      patch.displayName = dto.displayName;
    }
    // undefined = 未修改；null = 清空
    if (dto.phone !== undefined) {
      patch.phone = dto.phone;
    }
    if (dto.tags !== undefined) {
      patch.tags = normalizeTags(dto.tags);
    }
    // 个人链接三字段（v1.5.2）：undefined = 未修改；null = 清空（裸值已由 DTO 剥前缀）
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
      await this.writeLog('account.profile_update', userId, {
        fields: Object.keys(patch),
      });
    }
    return this.buildProfile(userId);
  }

  async updateEmail(
    userId: string,
    dto: UpdateAccountEmailDto,
  ): Promise<AccountProfile> {
    const existing = await this.loadRow(userId);
    await this.assertCurrentPassword(existing.passwordHash, dto.currentPassword);

    if (dto.email !== existing.email) {
      try {
        // 邮箱唯一性由「未删除记录部分唯一索引」兜底，冲突转 409 EMAIL_EXISTS
        await db
          .update(users)
          .set({ email: dto.email })
          .where(eq(users.id, userId));
      } catch (err) {
        this.handleUniqueError(err);
      }
      await this.writeLog('account.email_update', userId, { email: dto.email });
    }
    return this.buildProfile(userId);
  }

  /**
   * 自助修改密码：校验当前密码 → 写入新 hash + tokenVersion+1 → 清空托管 refreshToken。
   * 当前会话（含本请求使用的 access token）随即全部失效，客户端须引导重新登录。
   */
  async updatePassword(
    userId: string,
    dto: UpdateAccountPasswordDto,
  ): Promise<null> {
    const existing = await this.loadRow(userId);
    await this.assertCurrentPassword(existing.passwordHash, dto.currentPassword);

    // 新旧密码相同：静默成功（v0.9 决策）——不 bump tokenVersion、不清托管会话，
    // 避免无谓的全端下线；仅记审计日志
    if (await bcrypt.compare(dto.newPassword, existing.passwordHash)) {
      await this.writeLog('account.password_update_noop', userId, null);
      return null;
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    // 写新密码（tokenVersion+1）与清空托管 refreshToken 同一事务（不留中间态）
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash, tokenVersion: existing.tokenVersion + 1 })
        .where(eq(users.id, userId));
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
    });
    await this.writeLog('account.password_update', userId, null);
    return null;
  }

  /** 上传头像（服务端中转 Supabase Storage）并写入 users.avatar */
  async updateAvatar(
    userId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<{ avatar: string }> {
    await this.loadRow(userId);
    const avatar = await this.avatarStorage.upload(userId, file);
    await db.update(users).set({ avatar }).where(eq(users.id, userId));
    await this.writeLog('account.avatar_update', userId, null);
    return { avatar };
  }

  /**
   * 删除头像（v1.5.1）：置空 users.avatar，并按现有 URL 尽力清理
   * Storage 对象（对象删除失败不阻断，见 AvatarStorageService.removeObject）。
   */
  async deleteAvatar(userId: string): Promise<AccountProfile> {
    const row = await this.loadRow(userId);
    if (row.avatar) {
      // avatar URL 形如 .../storage/v1/object/public/avatars/{userId}.{ext}?v=...
      const match = row.avatar.match(/avatars\/([^?]+)/);
      if (match) {
        await this.avatarStorage.removeObject(decodeURIComponent(match[1]));
      }
    }
    await db.update(users).set({ avatar: null }).where(eq(users.id, userId));
    await this.writeLog('account.avatar_delete', userId, null);
    return this.buildProfile(userId);
  }

  private async assertCurrentPassword(
    passwordHash: string,
    currentPassword: string,
  ) {
    const ok = await bcrypt.compare(currentPassword, passwordHash);
    if (!ok) {
      throw new BadRequestException({
        code: 'CURRENT_PASSWORD_INCORRECT',
        message: '当前密码不正确',
      });
    }
  }

  /** 捕获唯一索引冲突，转换为业务 409 错误（与 users.service 同款） */
  private handleUniqueError(err: unknown): never {
    // drizzle 0.45 将 pg 错误包装为 DrizzleQueryError，原始错误的 constraint 挂在 cause 上
    const constraint: string =
      (err as { constraint?: string })?.constraint ??
      (err as { cause?: { constraint?: string } })?.cause?.constraint ??
      '';
    if (constraint.includes('email')) {
      throw new ConflictException({
        code: 'EMAIL_EXISTS',
        message: '邮箱已存在',
      });
    }
    throw err as Error;
  }

  private async writeLog(
    action: string,
    operatorId: string | null,
    detail?: unknown,
  ) {
    try {
      await db.insert(logs).values({
        type: 'operation',
        action,
        userId: operatorId,
        detail: detail === undefined ? null : (detail as object),
      });
    } catch (err) {
      console.error('[account] 写入日志失败:', err);
    }
  }
}

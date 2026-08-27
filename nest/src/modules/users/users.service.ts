import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { users, userRoles, roles, logs, refreshTokens } from '../../db/schema';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/user-create.dto';
import { UpdateUserDto } from './dto/user-update.dto';
import { UserQueryDto } from './dto/user-query.dto';

/** 用户关联的角色视图（roles 表字段子集） */
export type UserRoleView = {
  id: string;
  name: string;
  code: string;
};

/** 对外返回的用户视图（不含 passwordHash） */
export type UserView = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  /** 用户关联的角色（多对多，经 user_roles 联查） */
  roles: UserRoleView[];
};

const SORTABLE = new Set([
  'id',
  'username',
  'email',
  'displayName',
  'status',
  'createdAt',
  'updatedAt',
]);

function toView(row: typeof users.$inferSelect): Omit<UserView, 'roles'> {
  // tokenVersion 为内部会话撤销用的版本号，不对外暴露
  const {
    passwordHash: _omit,
    deletedAt: _d,
    tokenVersion: _tv,
    ...rest
  } = row;
  return rest as Omit<UserView, 'roles'>;
}

@Injectable()
export class UsersService {
  /** 捕获唯一索引冲突，转换为业务 409 错误 */
  private handleUniqueError(err: any): never {
    const constraint: string = err?.constraint ?? '';
    if (constraint.includes('username')) {
      throw new ConflictException({
        code: 'USERNAME_EXISTS',
        message: '用户名已存在',
      });
    }
    if (constraint.includes('email')) {
      throw new ConflictException({
        code: 'EMAIL_EXISTS',
        message: '邮箱已存在',
      });
    }
    throw err;
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
        detail: detail === undefined ? null : (detail as any),
      });
    } catch (err) {
       
      console.error('[users] 写入日志失败:', err);
    }
  }

  /** 仅返回未软删的用户行（共用 WHERE 条件） */
  private activeWhere(extra?: any) {
    return extra ? and(isNull(users.deletedAt), extra) : isNull(users.deletedAt);
  }

  /**
   * 批量查询 userIds 的角色关联（user_roles → roles），
   * 返回 Map<userId, UserRoleView[]>。一次查询，避免 N+1。
   */
  private async loadRoles(
    userIds: string[],
  ): Promise<Map<string, UserRoleView[]>> {
    if (userIds.length === 0) return new Map();
    const rows = await db
      .select({
        userId: userRoles.userId,
        roleId: roles.id,
        roleName: roles.name,
        roleCode: roles.code,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(inArray(userRoles.userId, userIds))
      .orderBy(roles.sort, roles.name);

    const map = new Map<string, UserRoleView[]>();
    for (const r of rows) {
      const list = map.get(r.userId) ?? [];
      list.push({ id: r.roleId, name: r.roleName, code: r.roleCode });
      map.set(r.userId, list);
    }
    return map;
  }

  /** 校验 roleIds 全部有效（存在且启用），存在无效 ID 时抛 VALIDATION_ERROR */
  private async assertValidRoleIds(roleIds: string[]) {
    if (roleIds.length === 0) return;
    const rows = await db
      .select({ id: roles.id })
      .from(roles)
      .where(inArray(roles.id, roleIds));
    const validIds = new Set(rows.map((r) => r.id));
    const invalid = roleIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `角色不存在或已停用: ${invalid.join(', ')}`,
      });
    }
  }

  async findAll(query: UserQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const conditions = [isNull(users.deletedAt)];
    if (query.status) {
      conditions.push(eq(users.status, query.status));
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        sql`(${users.username} ILIKE ${pattern} OR ${users.email} ILIKE ${pattern} OR ${users.displayName} ILIKE ${pattern})`,
      );
    }
    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(where);

    // 排序白名单，避免注入
    const sortCol = query.sort && SORTABLE.has(query.sort) ? query.sort : 'createdAt';
    const dir = query.order === 'asc' ? asc : desc;
    const orderBy = dir((users as any)[sortCol]);

    const rows = await db
      .select()
      .from(users)
      .where(where)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // 批量加载角色关联（一次查询，避免 N+1）
    const rolesMap = await this.loadRoles(rows.map((r) => r.id));

    return {
      data: rows.map((row) => ({
        ...toView(row),
        roles: rolesMap.get(row.id) ?? [],
      })),
      pagination: { page, pageSize, total },
    };
  }

  async findOne(id: string) {
    const row = await db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
    if (!row) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }
    const rolesMap = await this.loadRoles([id]);
    return {
      ...toView(row),
      roles: rolesMap.get(id) ?? [],
    };
  }

  async create(dto: CreateUserDto, operatorId: string | null) {
    const roleIds = dto.roleIds ?? [];
    // 外键校验：角色 id 必须全部有效，避免外键报错（VALIDATION_ERROR）
    await this.assertValidRoleIds(roleIds);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      // 用户创建与角色关联必须原子：db.transaction
      const created = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(users)
          .values({
            username: dto.username,
            email: dto.email,
            passwordHash,
            displayName: dto.displayName,
            avatar: dto.avatar ?? null,
            status: dto.status ?? 'active',
          })
          .returning();

        if (roleIds.length > 0) {
          await tx
            .insert(userRoles)
            .values(roleIds.map((roleId) => ({ userId: row.id, roleId })));
        }
        return row;
      });

      await this.writeLog('user.create', operatorId, {
        id: created.id,
        username: created.username,
        roleIds,
      });

      const rolesMap = await this.loadRoles([created.id]);
      return { ...toView(created), roles: rolesMap.get(created.id) ?? [] };
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async update(id: string, dto: UpdateUserDto, operatorId: string | null) {
    const existing = await db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }

    // roleIds 为 undefined 表示「未修改角色」；为数组（含空数组）表示「全量替换」
    if (dto.roleIds !== undefined) {
      await this.assertValidRoleIds(dto.roleIds);
    }

    try {
      // 用户更新与角色关联全量替换必须原子：db.transaction
      const row = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(users)
          .set({
            email: dto.email ?? existing.email,
            displayName: dto.displayName ?? existing.displayName,
            avatar: dto.avatar === undefined ? existing.avatar : dto.avatar,
            status: dto.status ?? existing.status,
          })
          .where(eq(users.id, id))
          .returning();

        if (dto.roleIds !== undefined) {
          // 全量替换：删除旧关联 → 插入新关联（空数组即清空）
          await tx.delete(userRoles).where(eq(userRoles.userId, id));
          if (dto.roleIds.length > 0) {
            await tx
              .insert(userRoles)
              .values(dto.roleIds.map((roleId) => ({ userId: id, roleId })));
          }
        }
        return updated;
      });

      await this.writeLog('user.update', operatorId, {
        id,
        roleIds: dto.roleIds,
      });

      const rolesMap = await this.loadRoles([id]);
      return { ...toView(row), roles: rolesMap.get(id) ?? [] };
    } catch (err) {
      this.handleUniqueError(err);
    }
  }

  async remove(id: string, operatorId: string | null) {
    const existing = await db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }
    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(eq(users.id, id));
    await this.writeLog('user.delete', operatorId, { id });
    return null;
  }

  /** 批量软删；部分 ID 无效或已删除时返回 400 INVALID_OPERATION */
  async batchRemove(ids: string[], operatorId: string | null) {
    if (!ids.length) {
      throw new BadRequestException({
        code: 'INVALID_OPERATION',
        message: '未提供有效的用户 ID',
      });
    }
    // 仅对「当前存在且未软删」的 ID 生效
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(and(isNull(users.deletedAt), sql`${users.id} IN ${ids}`));

    const validIds = new Set(existing.map((r) => r.id));
    const invalid = ids.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException({
        code: 'INVALID_OPERATION',
        message: '部分用户 ID 无效或无权限操作',
      });
    }

    await db
      .update(users)
      .set({ deletedAt: new Date() })
      .where(and(isNull(users.deletedAt), sql`${users.id} IN ${ids}`));
    await this.writeLog('user.batch_delete', operatorId, { ids });
    return null;
  }

  async resetPassword(id: string, newPassword: string, operatorId: string | null) {
    const existing = await db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    // 同步 bump tokenVersion：该用户全部存量 access/refresh token 立即失效（强制重登）
    await db
      .update(users)
      .set({ passwordHash, tokenVersion: existing.tokenVersion + 1 })
      .where(eq(users.id, id));
    // 撤销其全部托管 refreshToken，防止改密码后旧刷新链路继续续期
    await db
      .delete(refreshTokens)
      .where(eq(refreshTokens.userId, id));
    await this.writeLog('user.reset_password', operatorId, { id });
    return null;
  }

  async updateStatus(
    id: string,
    status: 'active' | 'disabled',
    operatorId: string | null,
  ) {
    const existing = await db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: '用户不存在',
      });
    }
    // 封禁时 bump tokenVersion 并清空托管会话：已登录设备即刻全端下线；
    // 解封不 bump（恢复账号无需追加撤销）。
    const bumpVersion =
      status === 'disabled' ? existing.tokenVersion + 1 : existing.tokenVersion;
    const [row] = await db
      .update(users)
      .set({ status, tokenVersion: bumpVersion })
      .where(eq(users.id, id))
      .returning();
    if (status === 'disabled') {
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, id));
    }
    await this.writeLog('user.status_update', operatorId, { id, status });
    const rolesMap = await this.loadRoles([id]);
    return { ...toView(row), roles: rolesMap.get(id) ?? [] };
  }
}

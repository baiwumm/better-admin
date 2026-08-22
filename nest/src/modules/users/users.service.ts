import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { users, logs } from '../../db/schema';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/user-create.dto';
import { UpdateUserDto } from './dto/user-update.dto';
import { UserQueryDto } from './dto/user-query.dto';

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

function toView(row: typeof users.$inferSelect): UserView {
  const { passwordHash: _omit, deletedAt: _d, ...rest } = row;
  return rest as UserView;
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

    return {
      data: rows.map(toView),
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
    return toView(row);
  }

  async create(dto: CreateUserDto, operatorId: string | null) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const [row] = await db
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
      await this.writeLog('user.create', operatorId, { id: row.id, username: row.username });
      return toView(row);
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
    try {
      const [row] = await db
        .update(users)
        .set({
          email: dto.email ?? existing.email,
          displayName: dto.displayName ?? existing.displayName,
          avatar: dto.avatar === undefined ? existing.avatar : dto.avatar,
          status: dto.status ?? existing.status,
        })
        .where(eq(users.id, id))
        .returning();
      await this.writeLog('user.update', operatorId, { id });
      return toView(row);
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
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id));
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
    const [row] = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, id))
      .returning();
    await this.writeLog('user.status_update', operatorId, { id, status });
    return toView(row);
  }
}

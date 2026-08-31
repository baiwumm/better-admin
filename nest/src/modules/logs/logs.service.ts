import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { logs, users } from '../../db/schema';
import { LogQueryDto } from './dto/log-query.dto';

/** 联表查询行（logs 列 + users 摘要列，list / findOne 共用） */
const logUserColumns = {
  id: logs.id,
  type: logs.type,
  userId: logs.userId,
  username: users.username,
  displayName: users.displayName,
  email: users.email,
  avatar: users.avatar,
  action: logs.action,
  ip: logs.ip,
  userAgent: logs.userAgent,
  detail: logs.detail,
  createdAt: logs.createdAt,
} as const;

export type LogView = {
  id: string;
  type: string;
  userId: string | null;
  /** v1.4.8 操作人摘要（left join users；用户不存在时为 null） */
  username: string | null;
  displayName: string | null;
  email: string | null;
  avatar: string | null;
  action: string;
  ip: string | null;
  userAgent: string | null;
  detail: unknown;
  createdAt: Date;
};

@Injectable()
export class LogsService {
  async list(query: LogQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const conditions = [];
    if (query.type) {
      conditions.push(eq(logs.type, query.type));
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(sql`${logs.action} ILIKE ${pattern}`);
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(logs)
      .where(where);

    const rows = await db
      .select(logUserColumns)
      .from(logs)
      // 操作人摘要：软删除用户仍回显（历史记录，user_id 仅在硬删时置空）
      .leftJoin(users, eq(logs.userId, users.id))
      .where(where)
      .orderBy(desc(logs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      data: rows,
      pagination: { page, pageSize, total },
    };
  }

  async findOne(id: string) {
    const rows = await db
      .select(logUserColumns)
      .from(logs)
      .leftJoin(users, eq(logs.userId, users.id))
      .where(eq(logs.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException({
        code: 'LOG_NOT_FOUND',
        message: '日志不存在',
      });
    }

    return rows[0];
  }

  async remove(id: string, operatorId: string | null) {
    const existing = await db.query.logs.findFirst({ where: eq(logs.id, id) });
    if (!existing) {
      throw new NotFoundException({
        code: 'LOG_NOT_FOUND',
        message: '日志不存在',
      });
    }
    await db.delete(logs).where(eq(logs.id, id));
    await this.writeLog('log.delete', operatorId, { id });
    return null;
  }

  /**
   * 批量删除（v1.4.8）：任一 ID 无效即整体拒绝（400 INVALID_OPERATION），
   * 全有全无语义与 DELETE /users?ids= 对齐。
   */
  async batchRemove(ids: string[], operatorId: string | null) {
    if (!ids.length) {
      throw new BadRequestException({
        code: 'INVALID_OPERATION',
        message: '未提供有效的日志 ID',
      });
    }

    const existing = await db
      .select({ id: logs.id })
      .from(logs)
      .where(inArray(logs.id, ids));

    const validIds = new Set(existing.map((r) => r.id));
    const invalid = ids.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw new BadRequestException({
        code: 'INVALID_OPERATION',
        message: '部分日志 ID 无效',
      });
    }

    await db.delete(logs).where(inArray(logs.id, ids));
    await this.writeLog('log.batch_delete', operatorId, { ids });
    return null;
  }

  /** 记录 API 调用日志（type=api）。best-effort，失败不抛。 */
  async recordApi(input: {
    method: string;
    path: string;
    status: number;
    durationMs: number;
    userId: string | null;
    ip: string | null;
    userAgent: string | null;
  }) {
    try {
      await db.insert(logs).values({
        type: 'api',
        action: `${input.method} ${input.path}`,
        userId: input.userId,
        ip: input.ip,
        userAgent: input.userAgent,
        detail: { status: input.status, durationMs: input.durationMs },
      });
    } catch (err) {

      console.error('[logs] 写入 api 日志失败:', err);
    }
  }

  /** 记录异常日志（type=error）。best-effort，失败不抛。 */
  async recordError(input: {
    action: string;
    status: number;
    message: string;
    userId: string | null;
    ip: string | null;
    userAgent: string | null;
    stack?: string;
  }) {
    try {
      await db.insert(logs).values({
        type: 'error',
        action: input.action,
        userId: input.userId,
        ip: input.ip,
        userAgent: input.userAgent,
        detail: { status: input.status, message: input.message, stack: input.stack },
      });
    } catch (err) {

      console.error('[logs] 写入 error 日志失败:', err);
    }
  }

  /** 记录管理操作日志（type=operation，与 users/roles/menus/dict 模块同构）。 */
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
        detail: detail === undefined ? null : detail,
      });
    } catch (err) {

      console.error('[logs] 写入日志失败:', err);
    }
  }
}

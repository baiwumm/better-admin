import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { logs } from '../../db/schema';
import { LogQueryDto } from './dto/log-query.dto';

export type LogView = {
  id: string;
  type: string;
  userId: string | null;
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
      .select()
      .from(logs)
      .where(where)
      .orderBy(desc(logs.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      data: rows.map((r) => ({
        id: r.id,
        type: r.type,
        userId: r.userId,
        action: r.action,
        ip: r.ip,
        userAgent: r.userAgent,
        detail: r.detail,
        createdAt: r.createdAt,
      })),
      pagination: { page, pageSize, total },
    };
  }

  async findOne(id: string) {
    const row = await db.query.logs.findFirst({ where: eq(logs.id, id) });
    if (!row) {
      throw new NotFoundException({
        code: 'LOG_NOT_FOUND',
        message: '日志不存在',
      });
    }
    return {
      id: row.id,
      type: row.type,
      userId: row.userId,
      action: row.action,
      ip: row.ip,
      userAgent: row.userAgent,
      detail: row.detail,
      createdAt: row.createdAt,
    };
  }

  async remove(id: string) {
    const existing = await db.query.logs.findFirst({ where: eq(logs.id, id) });
    if (!existing) {
      throw new NotFoundException({
        code: 'LOG_NOT_FOUND',
        message: '日志不存在',
      });
    }
    await db.delete(logs).where(eq(logs.id, id));
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
}

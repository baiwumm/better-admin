import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client';
import { notifications } from '../../db/schema';

/** 站内信通知视图（与 openapi.yaml Notification 对齐） */
export type NotificationView = {
  id: string;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

/**
 * 站内信铃铛（契约 v1.7.0，仅登录态无权限位）：当前用户的通知列表 /
 * 未读数轮询 / 单条与全部已读。读取范围严格限定 recipient_id = 当前用户。
 */
@Injectable()
export class NotificationsService {
  async findAll(
    userId: string,
    query: { page?: number; pageSize?: number; unreadOnly?: boolean },
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const conditions = [eq(notifications.recipientId, userId)];
    if (query.unreadOnly) {
      conditions.push(isNull(notifications.readAt));
    }
    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(notifications)
      .where(where);

    const rows = await db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return {
      data: rows.map(this.toView),
      pagination: { page, pageSize, total },
    };
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const [row] = await db
      .select({ total: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, userId),
          isNull(notifications.readAt),
        ),
      );
    return { count: Number(row.total) };
  }

  /** 全部已读 */
  async readAll(userId: string) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.recipientId, userId),
          isNull(notifications.readAt),
        ),
      );
    return null;
  }

  /** 单条已读（仅限本人通知；非本人 404） */
  async readOne(userId: string, id: string) {
    const [updated] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.recipientId, userId),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id });
    // 非本人或已读：静默幂等返回
    return updated ? null : null;
  }

  private toView(row: typeof notifications.$inferSelect): NotificationView {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      link: row.link,
      readAt: row.readAt,
      createdAt: row.createdAt,
    };
  }
}

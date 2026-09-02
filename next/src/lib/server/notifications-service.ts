import "server-only";

import { and, count, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import { generateRecordId } from "@/lib/server/ids";

/** 站内信通知视图（与 openapi.yaml Notification 对齐） */
export interface NotificationView {
  id: string;
  type: string;
  title: string;
  content: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/**
 * 站内信铃铛（契约 v1.7.0，仅登录态无权限位）：当前用户的通知列表 /
 * 未读数轮询 / 单条与全部已读。读取范围严格限定 recipient_id = 当前用户。
 */
export async function listNotifications(
  userId: string,
  query: { page?: number; pageSize?: number; unreadOnly?: boolean },
): Promise<{
  data: NotificationView[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 10);

  const conditions = [eq(notifications.recipientId, userId)];

  if (query.unreadOnly) {
    conditions.push(isNull(notifications.readAt));
  }
  const where = and(...conditions);

  const [{ count: total }] = await db
    .select({ count: count() })
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
    data: rows.map(toView),
    pagination: { page, pageSize, total },
  };
}

export async function countUnreadNotifications(
  userId: string,
): Promise<{ count: number }> {
  const [row] = await db
    .select({ total: count() })
    .from(notifications)
    .where(
      and(eq(notifications.recipientId, userId), isNull(notifications.readAt)),
    );

  return { count: Number(row.total) };
}

/** 全部已读 */
export async function readAllNotifications(userId: string): Promise<null> {
  await db
    .update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(
      and(eq(notifications.recipientId, userId), isNull(notifications.readAt)),
    );

  return null;
}

/** 单条已读（仅限本人通知；非本人/已读静默幂等） */
export async function readOneNotification(
  userId: string,
  id: string,
): Promise<null> {
  await db
    .update(notifications)
    .set({ readAt: new Date().toISOString() })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.recipientId, userId),
        isNull(notifications.readAt),
      ),
    );

  return null;
}

/** 给接收人写一条站内信（公告发布/催办共用）。 */
export async function insertNotification(input: {
  recipientId: string;
  type: string;
  title: string;
  link: string | null;
}): Promise<void> {
  await db.insert(notifications).values({
    id: generateRecordId(),
    recipientId: input.recipientId,
    type: input.type,
    title: input.title,
    link: input.link,
  });
}

function toView(row: typeof notifications.$inferSelect): NotificationView {
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

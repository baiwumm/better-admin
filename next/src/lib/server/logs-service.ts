import "server-only";

import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { logs, users } from "@/db/schema";
import { ServerApiError } from "@/lib/server/http";
import { generateRecordId } from "@/lib/server/ids";

/**
 * 日志服务（与 nest/src/modules/logs/logs.service.ts 一一对齐）。
 * 列表/详情联表 users 输出操作人摘要（软删除用户仍回显，历史记录）。
 */

/** 联表查询列（logs 列 + users 摘要列，list / findOne 共用）。 */
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

export interface LogView {
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
  createdAt: string;
}

const PAGE_SIZES = [10, 20, 30, 40, 50];

/** GET /logs — 分页列表（type 精确筛选；search 仅 ILIKE 匹配 action；固定 createdAt 倒序）。 */
export async function listLogs(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: string;
}): Promise<{
  data: LogView[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = PAGE_SIZES.includes(params.pageSize ?? 10)
    ? (params.pageSize ?? 10)
    : 10;

  const conditions = [];

  if (params.type) {
    conditions.push(eq(logs.type, params.type));
  }

  const normalizedSearch = params.search?.trim();

  if (normalizedSearch) {
    const pattern = `%${normalizedSearch}%`;

    conditions.push(sql`${logs.action} ILIKE ${pattern}`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count: total }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
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
    data: rows as LogView[],
    pagination: { page, pageSize, total },
  };
}

/** GET /logs/:id — 日志详情（联表操作人摘要）。 */
export async function findLog(id: string): Promise<LogView> {
  const rows = await db
    .select(logUserColumns)
    .from(logs)
    .leftJoin(users, eq(logs.userId, users.id))
    .where(eq(logs.id, id))
    .limit(1);

  const row = rows[0];

  if (!row) {
    throw new ServerApiError(404, "LOG_NOT_FOUND", "日志不存在");
  }

  return row as LogView;
}

/** DELETE /logs/:id — 删除单条日志。 */
export async function removeLog(
  id: string,
  operatorId: string | null,
): Promise<null> {
  const existing = await db.query.logs.findFirst({ where: eq(logs.id, id) });

  if (!existing) {
    throw new ServerApiError(404, "LOG_NOT_FOUND", "日志不存在");
  }

  await db.delete(logs).where(eq(logs.id, id));

  await writeLog("log.delete", operatorId, { id });

  return null;
}

/**
 * DELETE /logs?ids= — 批量删除（v1.4.8）：任一 ID 无效即整体拒绝
 * （400 INVALID_OPERATION），全有全无语义与 DELETE /users?ids= 对齐。
 */
export async function batchRemoveLogs(
  ids: string[],
  operatorId: string | null,
): Promise<null> {
  if (ids.length === 0) {
    throw new ServerApiError(400, "INVALID_OPERATION", "未提供有效的日志 ID");
  }

  const existing = await db
    .select({ id: logs.id })
    .from(logs)
    .where(inArray(logs.id, ids));

  const validIds = new Set(existing.map((r) => r.id));
  const invalid = ids.filter((id) => !validIds.has(id));

  if (invalid.length > 0) {
    throw new ServerApiError(400, "INVALID_OPERATION", "部分日志 ID 无效");
  }

  await db.delete(logs).where(inArray(logs.id, ids));

  await writeLog("log.batch_delete", operatorId, { ids });

  return null;
}

async function writeLog(
  action: string,
  operatorId: string | null,
  detail?: unknown,
): Promise<void> {
  try {
    await db.insert(logs).values({
      id: generateRecordId(),
      type: "operation",
      userId: operatorId,
      action,
      detail: detail === undefined ? null : detail,
    });
  } catch (err) {
    console.error("[logs] 写入日志失败:", err);
  }
}

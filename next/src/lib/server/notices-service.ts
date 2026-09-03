import "server-only";

import type { AuthUser } from "@/lib/api-types";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lte,
  sql,
} from "drizzle-orm";

import { db } from "@/db/client";
import {
  depts,
  logs,
  notices,
  noticeReadRecords,
  noticeRemindLogs,
  noticeScopes,
  notifications,
  posts,
  users,
  userPosts,
} from "@/db/schema";
import { generateRecordId } from "@/lib/server/ids";
import { ServerApiError } from "@/lib/server/http";
import { insertNotification } from "@/lib/server/notifications-service";

/**
 * 公告管理服务（与 nest/src/modules/notice/notice.service.ts 对齐）。
 *
 * - 管理接口走位掩码权限（SEARCH/ADD/EDIT/DELETE，见路由层）；
 * - mine / 详情为全员消费接口（仅登录态，服务端做可见性校验）；
 * - 进详情自动记录首次已读（唯一约束幂等）；
 * - 编辑/删除/撤回/催办要求发布人本人或 super_admin（403 NOTICE_NOT_PUBLISHER）；
 * - 定时发布（draft + publishTime 到点）：next 无 @Cron，改用
 *   publishDueNotices 供访问时惰性触发（见 routes），行为与 Nest 端等价
 *   但不引入后台任务机制。
 */

/** 对外返回的公告视图（与契约 Notice 对齐） */
export interface NoticeView {
  id: string;
  title: string;
  content?: string;
  publisherId: string | null;
  publisherName: string | null;
  publisherEmail: string | null;
  publisherAvatar: string | null;
  isTop: boolean;
  status: string;
  publishTime: string;
  scopes?: NoticeScopeView[];
  scopeCount?: number;
  readCount: number;
  totalCount: number;
  readRate: number | null;
  /** 当前用户的首次阅读时间（详情返回；管理视角或范围外查看为 null） */
  myReadAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 范围明细（targetName 由调用方回填） */
export interface NoticeScopeView {
  scopeType: "dept" | "post" | "user";
  targetId: string;
  targetName: string | null;
}

const SORTABLE = new Set([
  "title",
  "status",
  "publishTime",
  "createdAt",
  "updatedAt",
]);

/** 全量权限位（对外正数形态，super_admin 判定与守卫一致） */
const SUPER_ADMIN_POSITIVE = "9223372036854775807";

function isSuperAdmin(user: AuthUser): boolean {
  const bits = String(user.permissions);

  return bits === "-1" || bits === SUPER_ADMIN_POSITIVE;
}

/** 范围内总人数（去重）与已读人数（含离职——已读率分母口径）。 */
async function computeStats(noticeId: string): Promise<{
  readCount: number;
  totalCount: number;
  readRate: number | null;
}> {
  const scopeRows = await db
    .select()
    .from(noticeScopes)
    .where(eq(noticeScopes.noticeId, noticeId));
  const userIds = await resolveScopeUserIds(
    scopeRows.map((r) => ({
      scopeType: r.scopeType as "dept" | "post" | "user",
      targetId: r.targetId,
    })),
  );
  const totalCount = userIds.length;

  if (totalCount === 0) {
    return { readCount: 0, totalCount: 0, readRate: null };
  }

  const [readRow] = await db
    .select({ total: count() })
    .from(noticeReadRecords)
    .where(
      and(
        eq(noticeReadRecords.noticeId, noticeId),
        inArray(noticeReadRecords.userId, userIds),
      ),
    );
  const readCount = Number(readRow.total);

  return {
    readCount,
    totalCount,
    readRate: Math.round((readCount / totalCount) * 10000) / 100,
  };
}

/** 批量装载多条公告的范围明细（含 targetName 回填）：全页 4 组查询。 */
async function loadScopesBatch(
  noticeIds: string[],
): Promise<Map<string, NoticeScopeView[]>> {
  const map = new Map<string, NoticeScopeView[]>();

  if (noticeIds.length === 0) return map;
  for (const id of noticeIds) map.set(id, []);

  const rows = await db
    .select()
    .from(noticeScopes)
    .where(inArray(noticeScopes.noticeId, noticeIds))
    .orderBy(asc(noticeScopes.createdAt));

  const deptIds = rows
    .filter((r) => r.scopeType === "dept")
    .map((r) => r.targetId);
  const postIds = rows
    .filter((r) => r.scopeType === "post")
    .map((r) => r.targetId);
  const userIds = rows
    .filter((r) => r.scopeType === "user")
    .map((r) => r.targetId);

  const [deptRows, postRows, userRows] = await Promise.all([
    deptIds.length
      ? db
          .select({ id: depts.id, name: depts.name })
          .from(depts)
          .where(inArray(depts.id, deptIds))
      : Promise.resolve([]),
    postIds.length
      ? db
          .select({ id: posts.id, name: posts.name })
          .from(posts)
          .where(inArray(posts.id, postIds))
      : Promise.resolve([]),
    userIds.length
      ? db
          .select({ id: users.id, name: users.displayName })
          .from(users)
          .where(inArray(users.id, userIds))
      : Promise.resolve([]),
  ]);
  const deptMap = new Map(deptRows.map((r) => [r.id, r.name]));
  const postMap = new Map(postRows.map((r) => [r.id, r.name]));
  const userMap = new Map(userRows.map((r) => [r.id, r.name]));

  for (const r of rows) {
    map.get(r.noticeId)?.push({
      scopeType: r.scopeType as NoticeScopeView["scopeType"],
      targetId: r.targetId,
      targetName:
        deptMap.get(r.targetId) ??
        postMap.get(r.targetId) ??
        userMap.get(r.targetId) ??
        null,
    });
  }

  return map;
}

/** 全量未删组织的 deptId → 完整路径映射。 */
async function buildDeptPathMap(): Promise<Map<string, string>> {
  const rows = await db
    .select({ id: depts.id, parentId: depts.parentId, name: depts.name })
    .from(depts)
    .where(isNull(depts.deletedAt));

  const parentMap = new Map(rows.map((r) => [r.id, r.parentId]));
  const nameMap = new Map(rows.map((r) => [r.id, r.name]));
  const pathMap = new Map<string, string>();

  const buildPath = (id: string): string => {
    const cached = pathMap.get(id);

    if (cached) return cached;

    const segments: string[] = [];
    let cursor: string | null | undefined = id;
    const seen = new Set<string>();

    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      segments.unshift(nameMap.get(cursor) ?? "");
      cursor = parentMap.get(cursor) ?? null;
    }
    const path = segments.join("/");

    for (const segId of seen) pathMap.set(segId, path);

    return path;
  };

  for (const row of rows) buildPath(row.id);

  return pathMap;
}

/** 收集组织及其全部下级组织 ID（未删除；递归 CTE）。 */
async function collectDeptSubtreeIds(deptId: string): Promise<string[]> {
  const result = await db.execute(sql`
    WITH RECURSIVE dept_tree AS (
      SELECT id FROM depts WHERE id = ${deptId} AND deleted_at IS NULL
      UNION ALL
      SELECT d.id FROM depts d
        INNER JOIN dept_tree dt ON d.parent_id = dt.id
      WHERE d.deleted_at IS NULL
    )
    SELECT id FROM dept_tree
  `);

  return (result as unknown as { id: string }[]).map((row) => row.id);
}

/**
 * 解析公告发布范围内的全部用户 ID（三粒度并集去重，仅未删除用户）。
 */
async function resolveScopeUserIds(
  scopes: { scopeType: string; targetId: string }[],
): Promise<string[]> {
  const collected = new Set<string>();
  const deptIds = scopes
    .filter((s) => s.scopeType === "dept")
    .map((s) => s.targetId);
  const postIds = scopes
    .filter((s) => s.scopeType === "post")
    .map((s) => s.targetId);
  const userIds = scopes
    .filter((s) => s.scopeType === "user")
    .map((s) => s.targetId);

  if (deptIds.length > 0) {
    const subtreeIds = new Set<string>();

    for (const deptId of deptIds) {
      for (const id of await collectDeptSubtreeIds(deptId)) subtreeIds.add(id);
    }
    if (subtreeIds.size > 0) {
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(isNull(users.deletedAt), inArray(users.deptId, [...subtreeIds])),
        );

      for (const r of rows) collected.add(r.id);
    }
  }

  if (postIds.length > 0) {
    const rows = await db
      .select({ id: users.id })
      .from(userPosts)
      .innerJoin(
        users,
        and(eq(userPosts.userId, users.id), isNull(users.deletedAt)),
      )
      .where(inArray(userPosts.postId, postIds));

    for (const r of rows) collected.add(r.id);
  }

  if (userIds.length > 0) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(isNull(users.deletedAt), inArray(users.id, userIds)));

    for (const r of rows) collected.add(r.id);
  }

  return [...collected];
}

/** 校验公告发布范围目标：三类目标须存在（未删除），无效抛 VALIDATION_ERROR。 */
async function assertScopeTargets(
  scopes: { scopeType: string; targetId: string }[],
): Promise<void> {
  if (scopes.length === 0) return;
  const deptIds = scopes
    .filter((s) => s.scopeType === "dept")
    .map((s) => s.targetId);
  const postIds = scopes
    .filter((s) => s.scopeType === "post")
    .map((s) => s.targetId);
  const userIds = scopes
    .filter((s) => s.scopeType === "user")
    .map((s) => s.targetId);
  const invalid: string[] = [];

  if (deptIds.length > 0) {
    const rows = await db
      .select({ id: depts.id })
      .from(depts)
      .where(and(isNull(depts.deletedAt), inArray(depts.id, deptIds)));
    const valid = new Set(rows.map((r) => r.id));

    invalid.push(
      ...deptIds.filter((id) => !valid.has(id)).map((id) => `组织:${id}`),
    );
  }
  if (postIds.length > 0) {
    const rows = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(isNull(posts.deletedAt), inArray(posts.id, postIds)));
    const valid = new Set(rows.map((r) => r.id));

    invalid.push(
      ...postIds.filter((id) => !valid.has(id)).map((id) => `岗位:${id}`),
    );
  }
  if (userIds.length > 0) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(isNull(users.deletedAt), inArray(users.id, userIds)));
    const valid = new Set(rows.map((r) => r.id));

    invalid.push(
      ...userIds.filter((id) => !valid.has(id)).map((id) => `人员:${id}`),
    );
  }

  if (invalid.length > 0) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      `发布范围目标不存在: ${invalid.join(", ")}`,
    );
  }
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
    console.error("[notices] 写入日志失败:", err);
  }
}

/** 编辑/删除/撤回/催办保护：发布人本人或 super_admin（PRD 7.3）。 */
function assertNoticeOperator(
  notice: { publisherId: string | null },
  user: AuthUser,
): void {
  if (notice.publisherId === user.id || isSuperAdmin(user)) return;

  throw new ServerApiError(
    403,
    "NOTICE_NOT_PUBLISHER",
    "仅发布人本人或超级管理员可操作该公告",
  );
}

async function loadNoticeRow(id: string) {
  const [row] = await db
    .select({
      id: notices.id,
      title: notices.title,
      content: notices.content,
      publisherId: notices.publisherId,
      publisherName: users.displayName,
      publisherEmail: users.email,
      publisherAvatar: users.avatar,
      isTop: notices.isTop,
      status: notices.status,
      publishTime: notices.publishTime,
      createdAt: notices.createdAt,
      updatedAt: notices.updatedAt,
    })
    .from(notices)
    .leftJoin(users, eq(notices.publisherId, users.id))
    .where(and(eq(notices.id, id), isNull(notices.deletedAt)));

  return row;
}

/** 给范围内全员写站内信（新公告发布/定时发布共用）。 */
export async function notifyScopePublish(
  noticeId: string,
  title: string,
): Promise<number> {
  const scopeRows = await db
    .select()
    .from(noticeScopes)
    .where(eq(noticeScopes.noticeId, noticeId));
  const userIds = await resolveScopeUserIds(
    scopeRows.map((r) => ({
      scopeType: r.scopeType as "dept" | "post" | "user",
      targetId: r.targetId,
    })),
  );

  if (userIds.length === 0) return 0;

  // 分批写入（每批 1000），避免单条 INSERT 过大
  const BATCH = 1000;

  for (let i = 0; i < userIds.length; i += BATCH) {
    const batch = userIds.slice(i, i + BATCH);

    await db.insert(notifications).values(
      batch.map((recipientId) => ({
        id: generateRecordId(),
        recipientId,
        type: "notice_publish",
        title: `新公告：${title}`,
        link: `/org/notices/${noticeId}`,
      })),
    );
  }

  return userIds.length;
}

/** 定时发布扫描：draft 且 publish_time <= now → published + 通知（访问时惰性触发）。 */
export async function publishDueNotices(): Promise<number> {
  const due = await db
    .select()
    .from(notices)
    .where(
      and(
        isNull(notices.deletedAt),
        eq(notices.status, "draft"),
        lte(notices.publishTime, new Date().toISOString()),
      ),
    );
  let published = 0;

  for (const notice of due) {
    await db
      .update(notices)
      .set({ status: "published" })
      .where(eq(notices.id, notice.id));
    await notifyScopePublish(notice.id, notice.title);
    await writeLog("notice.auto_publish", null, {
      id: notice.id,
      title: notice.title,
    });
    published += 1;
  }

  return published;
}

export interface NoticeListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  sort?: string;
  order?: string;
}

/** GET /notices — 公告管理列表（分页，含已读率）。 */
export async function listNotices(params: NoticeListParams): Promise<{
  data: NoticeView[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);

  // 访问列表前先惰性发布到期定时公告（next 无 @Cron，等价的按需语义）
  await publishDueNotices();

  const conditions = [isNull(notices.deletedAt)];

  if (params.keyword) {
    conditions.push(ilike(notices.title, `%${params.keyword.trim()}%`));
  }
  if (params.status) {
    conditions.push(eq(notices.status, params.status));
  }
  const where = and(...conditions);

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(notices)
    .where(where);

  const sortCol =
    params.sort && SORTABLE.has(params.sort) ? params.sort : "createdAt";
  const dir = params.order === "asc" ? asc : desc;

  // 置顶在前、其次按排序列
  const rows = await db
    .select({
      id: notices.id,
      title: notices.title,
      publisherId: notices.publisherId,
      publisherName: users.displayName,
      publisherEmail: users.email,
      publisherAvatar: users.avatar,
      isTop: notices.isTop,
      status: notices.status,
      publishTime: notices.publishTime,
      createdAt: notices.createdAt,
      updatedAt: notices.updatedAt,
    })
    .from(notices)
    .leftJoin(users, eq(notices.publisherId, users.id))
    .where(where)
    .orderBy(
      desc(notices.isTop),
      dir(notices[sortCol as "title" | "status" | "publishTime"]),
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const noticeIds = rows.map((r) => r.id);
  const scopesByNotice = await loadScopesBatch(noticeIds);

  const data: NoticeView[] = [];

  for (const row of rows) {
    const scopes = scopesByNotice.get(row.id) ?? [];
    const stats = await computeStats(row.id);

    data.push({
      ...row,
      content: undefined,
      scopes,
      scopeCount: scopes.length,
      readCount: stats.readCount,
      totalCount: stats.totalCount,
      readRate: stats.readRate,
    });
  }

  return { data, pagination: { page, pageSize, total } };
}

/** GET /notices/mine — 我的公告（全员消费端；置顶在前、发布时间降序）。 */
export async function listMyNotices(
  userId: string,
  params: NoticeListParams,
): Promise<{
  data: NoticeView[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);

  await publishDueNotices();

  const visibleSql = sql`
    SELECT notice_id FROM notice_scopes WHERE scope_type = 'user' AND target_id = ${userId}
    UNION
    SELECT notice_id FROM notice_scopes
    WHERE scope_type = 'post'
      AND target_id IN (SELECT post_id FROM user_posts WHERE user_id = ${userId})
    UNION
    SELECT notice_id FROM notice_scopes
    WHERE scope_type = 'dept'
      AND target_id IN (
        WITH RECURSIVE dept_tree AS (
          SELECT id FROM depts WHERE id = (SELECT dept_id FROM users WHERE id = ${userId})
            AND deleted_at IS NULL
          UNION ALL
          SELECT d.id FROM depts d
            INNER JOIN dept_tree dt ON d.parent_id = dt.id
          WHERE d.deleted_at IS NULL
        )
        SELECT id FROM dept_tree
      )
  `;

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(notices)
    .where(
      and(
        isNull(notices.deletedAt),
        eq(notices.status, "published"),
        sql`${notices.id} IN (${visibleSql})`,
      ),
    );

  const rows = await db
    .select({
      id: notices.id,
      title: notices.title,
      publisherId: notices.publisherId,
      publisherName: users.displayName,
      publisherEmail: users.email,
      publisherAvatar: users.avatar,
      isTop: notices.isTop,
      status: notices.status,
      publishTime: notices.publishTime,
      createdAt: notices.createdAt,
      updatedAt: notices.updatedAt,
    })
    .from(notices)
    .leftJoin(users, eq(notices.publisherId, users.id))
    .where(
      and(
        isNull(notices.deletedAt),
        eq(notices.status, "published"),
        sql`${notices.id} IN (${visibleSql})`,
      ),
    )
    .orderBy(desc(notices.isTop), desc(notices.publishTime))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    data: rows.map((row) => ({
      ...row,
      content: undefined,
      readCount: 0,
      totalCount: 0,
      readRate: null,
    })),
    pagination: { page, pageSize, total },
  };
}

/** 详情（可见性校验 + 范围内自动记首读；ip 从路由层获取）。 */
export async function findVisibleNotice(
  id: string,
  user: AuthUser,
  ipAddress = "",
): Promise<NoticeView & { scopes: NoticeScopeView[] }> {
  await publishDueNotices();

  const row = await loadNoticeRow(id);

  if (!row) {
    throw new ServerApiError(404, "NOTICE_NOT_FOUND", "公告不存在");
  }

  // 管理可见 = super_admin 或拥有 SEARCH 位（位掩码 1n）
  const hasSearch =
    isSuperAdmin(user) || (BigInt(user.permissions) & 1n) !== 0n;

  const scopeRows = await db
    .select()
    .from(noticeScopes)
    .where(eq(noticeScopes.noticeId, id));
  const scopeInputs = scopeRows.map((r) => ({
    scopeType: r.scopeType as "dept" | "post" | "user",
    targetId: r.targetId,
  }));
  const scopedUserIds = await resolveScopeUserIds(scopeInputs);
  const inScope = scopedUserIds.includes(user.id);

  // 通知消费凭证：发布时收到过该公告的站内信 = 当时在发布范围内，
  // 此后即使被移出范围（调岗 / 组织调整），凭站内信记录仍可查看详情
  // （「能在通知列表看到，就能查看详情」的消费语义）。
  let hasNotification = false;

  if (!hasSearch && !inScope) {
    const [notifyRow] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, user.id),
          eq(notifications.link, `/org/notices/${id}`),
        ),
      )
      .limit(1);

    hasNotification = !!notifyRow;
  }

  if (!hasSearch && !inScope && !hasNotification) {
    throw new ServerApiError(
      403,
      "NOTICE_NOT_VISIBLE",
      "您不在该公告的发布范围内",
    );
  }

  // 范围内用户进详情即记首读（唯一约束幂等，仅记首次）
  if (inScope && row.status === "published") {
    await db
      .insert(noticeReadRecords)
      .values({
        id: generateRecordId(),
        noticeId: id,
        userId: user.id,
        ipAddress,
      })
      .onConflictDoNothing();
  }

  const scopes = await loadScopesBatch([id]).then((m) => m.get(id) ?? []);
  const stats = await computeStats(id);

  // 当前用户的首次阅读时间（记首读之后查询，本次触发阅读也返回）；
  // 管理视角（SEARCH 位 / 超管）或范围外查看不产生阅读记录，为 null
  const [myRead] = await db
    .select({ readAt: noticeReadRecords.readAt })
    .from(noticeReadRecords)
    .where(
      and(
        eq(noticeReadRecords.noticeId, id),
        eq(noticeReadRecords.userId, user.id),
      ),
    )
    .limit(1);

  return {
    ...row,
    content: row.content,
    scopes,
    scopeCount: scopes.length,
    readCount: stats.readCount,
    totalCount: stats.totalCount,
    readRate: stats.readRate,
    myReadAt: myRead?.readAt ?? null,
  };
}

export interface NoticeCreateInput {
  title: string;
  content: string;
  scopeTargets: { scopeType: string; targetId: string }[];
  isTop?: boolean;
  publishTime?: string | null;
}

/** POST /notices — 创建公告（立即发布或定时草稿）。 */
export async function createNotice(
  input: NoticeCreateInput,
  user: AuthUser,
): Promise<NoticeView & { scopes: NoticeScopeView[] }> {
  if (input.title.length > 50) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      "公告标题不能超过 50 个字符",
    );
  }
  await assertScopeTargets(input.scopeTargets);

  const publishTime = input.publishTime
    ? new Date(input.publishTime).toISOString()
    : new Date().toISOString();
  const isScheduled = new Date(publishTime).getTime() > Date.now();
  const status = isScheduled ? "draft" : "published";

  const id = generateRecordId();

  await db.transaction(async (tx) => {
    await tx.insert(notices).values({
      id,
      title: input.title,
      content: input.content,
      publisherId: user.id,
      isTop: input.isTop ?? false,
      status,
      publishTime,
    });

    if (input.scopeTargets.length > 0) {
      await tx.insert(noticeScopes).values(
        input.scopeTargets.map((s) => ({
          id: generateRecordId(),
          noticeId: id,
          scopeType: s.scopeType,
          targetId: s.targetId,
        })),
      );
    }
  });

  await writeLog("notice.create", user.id, {
    id,
    title: input.title,
    status,
  });

  // 立即发布：给范围内全员写新公告通知；定时发布由 publishDueNotices 到点触发
  if (status === "published") {
    await notifyScopePublish(id, input.title);
  }

  return findVisibleNotice(id, user);
}

export interface NoticeUpdateInput {
  title?: string;
  content?: string;
  scopeTargets?: { scopeType: string; targetId: string }[];
  isTop?: boolean;
  publishTime?: string | null;
}

/** PUT /notices/:id — 编辑公告（draft/published 可编辑）。 */
export async function updateNotice(
  id: string,
  input: NoticeUpdateInput,
  user: AuthUser,
): Promise<NoticeView & { scopes: NoticeScopeView[] }> {
  const existing = await db.query.notices.findFirst({
    where: and(eq(notices.id, id), isNull(notices.deletedAt)),
  });

  if (!existing) {
    throw new ServerApiError(404, "NOTICE_NOT_FOUND", "公告不存在");
  }
  assertNoticeOperator(existing, user);

  if (input.title !== undefined && input.title.length > 50) {
    throw new ServerApiError(
      400,
      "VALIDATION_ERROR",
      "公告标题不能超过 50 个字符",
    );
  }

  if (existing.status === "withdrawn") {
    throw new ServerApiError(
      409,
      "NOTICE_NOT_PUBLISHED",
      "已撤回的公告不可编辑",
    );
  }

  if (input.scopeTargets !== undefined) {
    await assertScopeTargets(input.scopeTargets);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(notices)
      .set({
        title: input.title ?? existing.title,
        content: input.content ?? existing.content,
        isTop: input.isTop ?? existing.isTop,
        publishTime: input.publishTime
          ? new Date(input.publishTime).toISOString()
          : existing.publishTime,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(notices.id, id));

    if (input.scopeTargets !== undefined) {
      // 全量替换范围
      await tx.delete(noticeScopes).where(eq(noticeScopes.noticeId, id));

      if (input.scopeTargets.length > 0) {
        await tx.insert(noticeScopes).values(
          input.scopeTargets.map((s) => ({
            id: generateRecordId(),
            noticeId: id,
            scopeType: s.scopeType,
            targetId: s.targetId,
          })),
        );
      }
    }
  });

  await writeLog("notice.update", user.id, { id });

  return findVisibleNotice(id, user);
}

/** DELETE /notices/:id — 删除公告（软删；同步清理范围/催办记录）。 */
export async function removeNotice(id: string, user: AuthUser): Promise<null> {
  const existing = await db.query.notices.findFirst({
    where: and(eq(notices.id, id), isNull(notices.deletedAt)),
  });

  if (!existing) {
    throw new ServerApiError(404, "NOTICE_NOT_FOUND", "公告不存在");
  }
  assertNoticeOperator(existing, user);

  await db.transaction(async (tx) => {
    await tx
      .update(notices)
      .set({ deletedAt: new Date().toISOString() })
      .where(eq(notices.id, id));
    // 关联明细随主记录软删一并清理（阅读记录属审计数据，保留）
    await tx.delete(noticeScopes).where(eq(noticeScopes.noticeId, id));
    await tx.delete(noticeRemindLogs).where(eq(noticeRemindLogs.noticeId, id));
    // 关联站内信同步清理：公告已删，指向它的「新公告」通知失效，
    // 保留会让铃铛列表出现点开即 404 的死通知
    await tx
      .delete(notifications)
      .where(eq(notifications.link, `/org/notices/${id}`));
  });

  await writeLog("notice.delete", user.id, {
    id,
    title: existing.title,
  });

  return null;
}

/** POST /notices/:id/withdraw — 撤回公告（published → withdrawn）。 */
export async function withdrawNotice(
  id: string,
  user: AuthUser,
): Promise<NoticeView & { scopes: NoticeScopeView[] }> {
  const existing = await db.query.notices.findFirst({
    where: and(eq(notices.id, id), isNull(notices.deletedAt)),
  });

  if (!existing) {
    throw new ServerApiError(404, "NOTICE_NOT_FOUND", "公告不存在");
  }
  assertNoticeOperator(existing, user);

  if (existing.status !== "published") {
    throw new ServerApiError(
      409,
      "NOTICE_NOT_PUBLISHED",
      "仅已发布的公告可撤回",
    );
  }

  await db
    .update(notices)
    .set({ status: "withdrawn" })
    .where(eq(notices.id, id));
  await writeLog("notice.withdraw", user.id, {
    id,
    title: existing.title,
  });

  return findVisibleNotice(id, user);
}

/** 装载已读/未读名单（含组织路径与主岗摘要；未读仅在职，已读含离职）。 */
async function loadReadStatEntries(
  noticeId: string,
  scopeUserIds: string[],
  status: "read" | "unread",
): Promise<
  {
    userId: string;
    displayName: string;
    username: string;
    avatar: string | null;
    deptPath: string | null;
    mainPostName: string | null;
    employmentStatus: "employed" | "resigned";
    readAt: string | null;
  }[]
> {
  const readRows = await db
    .select({
      userId: noticeReadRecords.userId,
      readAt: noticeReadRecords.readAt,
    })
    .from(noticeReadRecords)
    .where(eq(noticeReadRecords.noticeId, noticeId));
  const readMap = new Map(readRows.map((r) => [r.userId, r.readAt]));

  const userRows = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatar: users.avatar,
      employmentStatus: users.employmentStatus,
      deptId: users.deptId,
    })
    .from(users)
    .where(inArray(users.id, scopeUserIds));

  // 主岗名映射
  const mainPostRows = await db
    .select({ userId: userPosts.userId, postName: posts.name })
    .from(userPosts)
    .innerJoin(
      posts,
      and(eq(userPosts.postId, posts.id), isNull(posts.deletedAt)),
    )
    .where(
      and(inArray(userPosts.userId, scopeUserIds), eq(userPosts.isMain, true)),
    );
  const mainPostMap = new Map(mainPostRows.map((r) => [r.userId, r.postName]));

  const deptPathMap = await buildDeptPathMap();

  const entries: {
    userId: string;
    displayName: string;
    username: string;
    avatar: string | null;
    deptPath: string | null;
    mainPostName: string | null;
    employmentStatus: "employed" | "resigned";
    readAt: string | null;
  }[] = [];

  for (const row of userRows) {
    const readAt = readMap.get(row.id) ?? null;
    const isRead = readAt !== null;

    if (status === "read" && !isRead) continue;
    if (status === "unread" && isRead) continue;
    // 未读名单不含离职（催办口径）；已读名单含离职（历史保留）
    if (status === "unread" && row.employmentStatus === "resigned") continue;

    entries.push({
      userId: row.id,
      displayName: row.displayName,
      username: row.username,
      avatar: row.avatar,
      deptPath: row.deptId ? (deptPathMap.get(row.deptId) ?? null) : null,
      mainPostName: mainPostMap.get(row.id) ?? null,
      employmentStatus:
        row.employmentStatus === "resigned" ? "resigned" : "employed",
      readAt,
    });
  }

  // 排序：已读按时间降序；未读按姓名
  entries.sort((a, b) =>
    status === "read"
      ? new Date(b.readAt ?? 0).getTime() - new Date(a.readAt ?? 0).getTime()
      : a.displayName.localeCompare(b.displayName, "zh-CN"),
  );

  return entries;
}

/** GET /notices/:id/read-stats — 已读/未读名单（分页）。 */
export async function listNoticeReadStats(
  id: string,
  status: "read" | "unread",
  params: { page?: number; pageSize?: number },
): Promise<{
  data: {
    userId: string;
    displayName: string;
    username: string;
    avatar: string | null;
    deptPath: string | null;
    mainPostName: string | null;
    employmentStatus: "employed" | "resigned";
    readAt: string | null;
  }[];
  pagination: { page: number; pageSize: number; total: number };
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, params.pageSize ?? 10);

  const notice = await db.query.notices.findFirst({
    where: and(eq(notices.id, id), isNull(notices.deletedAt)),
  });

  if (!notice) {
    throw new ServerApiError(404, "NOTICE_NOT_FOUND", "公告不存在");
  }

  const scopeRows = await db
    .select()
    .from(noticeScopes)
    .where(eq(noticeScopes.noticeId, id));
  const scopeUserIds = await resolveScopeUserIds(
    scopeRows.map((r) => ({
      scopeType: r.scopeType as "dept" | "post" | "user",
      targetId: r.targetId,
    })),
  );

  if (scopeUserIds.length === 0) {
    return { data: [], pagination: { page, pageSize, total: 0 } };
  }

  const extras = await loadReadStatEntries(id, scopeUserIds, status);
  const total = extras.length;
  const pageEntries = extras.slice((page - 1) * pageSize, page * pageSize);

  return {
    data: pageEntries,
    pagination: { page, pageSize, total },
  };
}

/** POST /notices/:id/remind — 一键催办：给未读（在职）人员写站内信；24h 防频。 */
export async function remindNotice(
  id: string,
  user: AuthUser,
): Promise<{ remindedCount: number }> {
  const notice = await db.query.notices.findFirst({
    where: and(eq(notices.id, id), isNull(notices.deletedAt)),
  });

  if (!notice) {
    throw new ServerApiError(404, "NOTICE_NOT_FOUND", "公告不存在");
  }
  assertNoticeOperator(notice, user);

  // 24h 防频
  const [recent] = await db
    .select({ total: count() })
    .from(noticeRemindLogs)
    .where(
      and(
        eq(noticeRemindLogs.noticeId, id),
        sql`${noticeRemindLogs.remindedAt} > now() - interval '24 hours'`,
      ),
    );

  if (Number(recent.total) > 0) {
    throw new ServerApiError(
      409,
      "NOTICE_REMIND_TOO_FREQUENT",
      "24 小时内已催办过，请稍后再试",
    );
  }

  const scopeRows = await db
    .select()
    .from(noticeScopes)
    .where(eq(noticeScopes.noticeId, id));
  const scopeUserIds = await resolveScopeUserIds(
    scopeRows.map((r) => ({
      scopeType: r.scopeType as "dept" | "post" | "user",
      targetId: r.targetId,
    })),
  );
  const unreadEntries = await loadReadStatEntries(id, scopeUserIds, "unread");
  const unreadUserIds = unreadEntries.map((s) => s.userId);

  if (unreadUserIds.length === 0) {
    throw new ServerApiError(409, "NOTICE_NO_UNREAD", "没有需要催办的未读人员");
  }

  for (const recipientId of unreadUserIds) {
    await insertNotification({
      recipientId,
      type: "notice_remind",
      title: `您有一条未读公告：【${notice.title}】，请尽快查阅`,
      link: `/org/notices/${id}`,
    });
  }

  await db.insert(noticeRemindLogs).values({
    id: generateRecordId(),
    noticeId: id,
    remindedBy: user.id,
  });

  await writeLog("notice.remind", user.id, {
    id,
    remindedCount: unreadUserIds.length,
  });

  return { remindedCount: unreadUserIds.length };
}

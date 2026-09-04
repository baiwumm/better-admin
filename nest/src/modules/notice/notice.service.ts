import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lte,
  sql,
} from 'drizzle-orm';
import { db } from '../../db/client';
import {
  notices,
  noticeScopes,
  noticeReadRecords,
  noticeRemindLogs,
  notifications,
  depts,
  posts,
  users,
  logs,
  userPosts,
} from '../../db/schema';
import {
  assertScopeTargets,
  buildDeptPathMap,
  resolveScopeUserIds,
  toDirectoryEntryView,
} from '../org/org-views';
import { AuthUser } from '../../auth/auth.service';
import { NoticeCreateDto } from './dto/notice.dto';
import { NoticeUpdateDto } from './dto/notice.dto';
import { NoticeQueryDto } from './dto/notice-query.dto';
import { NoticeMineQueryDto } from './dto/notice-query.dto';
import { NoticeReadStatsQueryDto } from './dto/notice-query.dto';

/** 管理侧/消费侧共用的公告视图（与 openapi.yaml Notice 对齐） */
export type NoticeView = {
  id: string;
  title: string;
  content?: string;
  publisherId: string | null;
  publisherName: string | null;
  /** 发布人邮箱（发布人被删除时为 null；列表/详情/我的公告均返回） */
  publisherEmail: string | null;
  /** 发布人头像（发布人被删除时为 null） */
  publisherAvatar: string | null;
  isTop: boolean;
  status: string;
  publishTime: Date;
  /** 范围明细（列表返回 targetName 回填；detail 详情亦返回） */
  scopes?: NoticeScopeView[];
  scopeCount?: number;
  readCount: number;
  totalCount: number;
  readRate: number | null;
  /** 当前用户的首次阅读时间（详情返回；管理视角或范围外查看为 null） */
  myReadAt?: string | null;
  /** 最近已读人员（管理列表回填；按已读时间倒序最多 3 个） */
  readers?: NoticeReaderView[];
  createdAt: Date;
  updatedAt: Date;
};

/** 已读人员摘要（窗口函数取最近 3 条；总数复用 readCount） */
export type NoticeReaderView = {
  id: string;
  name: string;
  avatar: string | null;
};

/** 范围明细（targetName 由调用方回填） */
export type NoticeScopeView = {
  scopeType: 'dept' | 'post' | 'user';
  targetId: string;
  targetName: string | null;
};

const SORTABLE = new Set(['title', 'status', 'publishTime', 'createdAt', 'updatedAt']);

/**
 * 简单并发限制：以固定并发数执行 mapper，避免大量 Promise.all
 * 同时发起查询打满数据库连接池（pg Pool 默认 max 10）。
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await mapper(items[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/** 全量权限位（对外正数形态，super_admin 判定与守卫一致） */
const SUPER_ADMIN_POSITIVE = '9223372036854775807';

function isSuperAdmin(user: AuthUser): boolean {
  const bits = String(user.permissions);
  return bits === '-1' || bits === SUPER_ADMIN_POSITIVE;
}

/** 公告 HTML → 通知摘要纯文本（剥标签 + 解常见实体 + 折叠空白 + 截断） */
function summarizeNoticeContent(html: string, max = 140): string {
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

@Injectable()
export class NoticesService {
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
      console.error('[notices] 写入日志失败:', err);
    }
  }

  /** 编辑/删除/撤回/催办保护：发布人本人或 super_admin（PRD 7.3） */
  private assertNoticeOperator(notice: { publisherId: string | null }, user: AuthUser) {
    if (notice.publisherId === user.id || isSuperAdmin(user)) return;
    throw new ForbiddenException({
      code: 'NOTICE_NOT_PUBLISHER',
      message: '仅发布人本人或超级管理员可操作该公告',
    });
  }

  /** 校验发布范围目标存在性（无效 → 400 VALIDATION_ERROR） */
  private assertScopeTargets(scopes: { scopeType: string; targetId: string }[]) {
    return assertScopeTargets(scopes);
  }

  /**
   * 范围内总人数（去重，含离职——已读率分母口径）与已读人数。
   * 范围解析为动态 CTE（范围记录不按人展开），当页逐条并行统计。
   */
  private async computeStats(noticeId: string): Promise<{
    readCount: number;
    totalCount: number;
    readRate: number | null;
  }> {
    const scopeRows = await db
      .select()
      .from(noticeScopes)
      .where(eq(noticeScopes.noticeId, noticeId));
    const scopeInputs = scopeRows.map((r) => ({
      scopeType: r.scopeType as 'dept' | 'post' | 'user',
      targetId: r.targetId,
    }));
    const userIds = await resolveScopeUserIds(scopeInputs);
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

  /** 范围明细（targetName 回填） */
  private async loadScopes(noticeId: string): Promise<NoticeScopeView[]> {
    const rows = await db
      .select()
      .from(noticeScopes)
      .where(eq(noticeScopes.noticeId, noticeId))
      .orderBy(asc(noticeScopes.createdAt));

    const deptIds = rows.filter((r) => r.scopeType === 'dept').map((r) => r.targetId);
    const postIds = rows.filter((r) => r.scopeType === 'post').map((r) => r.targetId);
    const userIds = rows.filter((r) => r.scopeType === 'user').map((r) => r.targetId);

    const [deptRows, postRows, userRows] = await Promise.all([
      deptIds.length
        ? db.select({ id: depts.id, name: depts.name }).from(depts).where(inArray(depts.id, deptIds))
        : Promise.resolve([]),
      postIds.length
        ? db.select({ id: posts.id, name: posts.name }).from(posts).where(inArray(posts.id, postIds))
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

    return rows.map((r) => ({
      scopeType: r.scopeType as NoticeScopeView['scopeType'],
      targetId: r.targetId,
      targetName:
        deptMap.get(r.targetId) ?? postMap.get(r.targetId) ?? userMap.get(r.targetId) ?? null,
    }));
  }

  /** 给范围内全员写站内信（新公告发布）：title 直接用公告标题，content 存纯文本摘要 */
  async notifyScopePublish(
    noticeId: string,
    title: string,
    content: string | null,
  ) {
    const summary = content ? summarizeNoticeContent(content) : null;
    const scopeRows = await db
      .select()
      .from(noticeScopes)
      .where(eq(noticeScopes.noticeId, noticeId));
    const userIds = await resolveScopeUserIds(
      scopeRows.map((r) => ({
        scopeType: r.scopeType as 'dept' | 'post' | 'user',
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
          recipientId,
          type: 'notice_publish',
          title,
          content: summary,
          link: `/org/notices/${noticeId}`,
        })),
      );
    }
    return userIds.length;
  }

  /** 管理列表（分页 + keyword + status；当页并行统计已读率） */
  async findAll(query: NoticeQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const conditions = [isNull(notices.deletedAt)];
    if (query.keyword) {
      const pattern = `%${query.keyword}%`;
      conditions.push(sql`${notices.title} ILIKE ${pattern}`);
    }
    if (query.status) {
      conditions.push(eq(notices.status, query.status));
    }
    const where = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(notices)
      .where(where);

    const sortCol =
      query.sort && SORTABLE.has(query.sort) ? query.sort : 'createdAt';
    const dir = query.order === 'asc' ? asc : desc;

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
      .orderBy(desc(notices.isTop), dir((notices as any)[sortCol]))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    // 范围明细批量装载（一次 IN 全页 scope 行 + 3 组批量名称回填），
    // 替代「每行 loadScopes」——避免 N 行 × 4 组查询同时打满连接池
    const noticeIds = rows.map((r) => r.id);
    const scopesByNotice = await this.loadScopesBatch(noticeIds);
    const readersByNotice = await this.loadReadersBatch(noticeIds);

    // 当页逐条统计已读率：并发限制（同时 4 条），避免连接池被瞬间耗尽
    const statsList = await mapWithConcurrency(rows, 4, async (row) => {
      const scopes = scopesByNotice.get(row.id) ?? [];
      const stats = await this.computeStats(row.id);
      return {
        ...row,
        content: undefined,
        scopes,
        scopeCount: scopes.length,
        readers: readersByNotice.get(row.id) ?? [],
        readCount: stats.readCount,
        totalCount: stats.totalCount,
        readRate: stats.readRate,
      } as NoticeView;
    });

    return {
      data: statsList,
      pagination: { page, pageSize, total },
    };
  }

  /** 批量装载多条公告的最近已读人员（窗口函数每组取 3 条）：全页 1 组查询 */
  private async loadReadersBatch(
    noticeIds: string[],
  ): Promise<Map<string, NoticeReaderView[]>> {
    const map = new Map<string, NoticeReaderView[]>();
    if (noticeIds.length === 0) return map;
    for (const id of noticeIds) map.set(id, []);

    const result = await db.execute(sql`
      SELECT t.notice_id, t.user_id, t.display_name, t.avatar
      FROM (
        SELECT rr.notice_id, rr.user_id, u.display_name, u.avatar,
               row_number() OVER (
                 PARTITION BY rr.notice_id
                 ORDER BY rr.read_at DESC, rr.user_id
               ) AS rn
        FROM notice_read_records rr
        INNER JOIN users u ON u.id = rr.user_id
        WHERE rr.notice_id IN (${sql.join(noticeIds.map((id) => sql`${id}`), sql`, `)})
      ) t
      WHERE t.rn <= 3
    `);
    const rows = result.rows as {
      notice_id: string;
      user_id: string;
      display_name: string;
      avatar: string | null;
    }[];

    for (const row of rows) {
      map.get(row.notice_id)?.push({
        id: row.user_id,
        name: row.display_name,
        avatar: row.avatar,
      });
    }
    return map;
  }

  /** 批量装载多条公告的范围明细（含 targetName 回填）：全页 4 组查询 */
  private async loadScopesBatch(noticeIds: string[]): Promise<Map<string, NoticeScopeView[]>> {
    const map = new Map<string, NoticeScopeView[]>();
    if (noticeIds.length === 0) return map;
    for (const id of noticeIds) map.set(id, []);

    const rows = await db
      .select()
      .from(noticeScopes)
      .where(inArray(noticeScopes.noticeId, noticeIds))
      .orderBy(asc(noticeScopes.createdAt));

    const deptIds = rows.filter((r) => r.scopeType === 'dept').map((r) => r.targetId);
    const postIds = rows.filter((r) => r.scopeType === 'post').map((r) => r.targetId);
    const userIds = rows.filter((r) => r.scopeType === 'user').map((r) => r.targetId);

    const [deptRows, postRows, userRows] = await Promise.all([
      deptIds.length
        ? db.select({ id: depts.id, name: depts.name }).from(depts).where(inArray(depts.id, deptIds))
        : Promise.resolve([]),
      postIds.length
        ? db.select({ id: posts.id, name: posts.name }).from(posts).where(inArray(posts.id, postIds))
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
        scopeType: r.scopeType as NoticeScopeView['scopeType'],
        targetId: r.targetId,
        targetName:
          deptMap.get(r.targetId) ?? postMap.get(r.targetId) ?? userMap.get(r.targetId) ?? null,
      });
    }
    return map;
  }

  /** 我的公告（全员消费端）：范围内已发布，置顶在前、发布时间降序 */
  async findMine(userId: string, query: NoticeMineQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const keyword = query.keyword?.trim() ?? '';
    const readStatus = query.readStatus ?? 'all';
    const keywordPattern = keyword ? `%${keyword}%` : null;
    const readFilterSql =
      readStatus === 'read'
        ? sql`rr.read_at IS NOT NULL`
        : readStatus === 'unread'
          ? sql`rr.read_at IS NULL`
          : sql`TRUE`;
    const keywordFilterSql = keywordPattern
      ? sql`n.title ILIKE ${keywordPattern}`
      : sql`TRUE`;

    // 可见公告集合：三段 UNION（user 直接 / post 经 user_posts / dept 递归子树）
    const visible = await db.execute(sql`
      SELECT DISTINCT n.id, n.is_top, n.publish_time
      FROM notices n
      LEFT JOIN notice_read_records rr
        ON rr.notice_id = n.id AND rr.user_id = ${userId}
      WHERE n.deleted_at IS NULL AND n.status = 'published'
        AND ${keywordFilterSql}
        AND ${readFilterSql}
        AND n.id IN (
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
        )
      ORDER BY n.is_top DESC, n.publish_time DESC
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `);
    const visibleRows = visible.rows as {
      id: string;
      is_top: boolean;
      publish_time: Date;
    }[];

    const totalResult = await db.execute(sql`
      SELECT COUNT(DISTINCT n.id)::int AS total
      FROM notices n
      LEFT JOIN notice_read_records rr
        ON rr.notice_id = n.id AND rr.user_id = ${userId}
      WHERE n.deleted_at IS NULL AND n.status = 'published'
        AND ${keywordFilterSql}
        AND ${readFilterSql}
        AND n.id IN (
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
        )
    `);
    const total = Number(
      (totalResult.rows as { total?: number | string }[])[0]?.total ?? 0,
    );

    const ids = visibleRows.map((r) => r.id);
    const rows = ids.length
      ? await db
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
            myReadAt: noticeReadRecords.readAt,
            createdAt: notices.createdAt,
            updatedAt: notices.updatedAt,
          })
          .from(notices)
          .leftJoin(users, eq(notices.publisherId, users.id))
          .leftJoin(
            noticeReadRecords,
            and(
              eq(notices.id, noticeReadRecords.noticeId),
              eq(noticeReadRecords.userId, userId),
            ),
          )
          .where(inArray(notices.id, ids))
          .orderBy(desc(notices.isTop), desc(notices.publishTime))
      : [];

    return {
      data: rows.map((row) => ({
        ...row,
        readCount: 0,
        totalCount: 0,
        readRate: null,
        myReadAt: row.myReadAt?.toISOString() ?? null,
      })) as NoticeView[],
      pagination: { page, pageSize, total },
    };
  }

  /** 详情（可见性校验 + 范围内自动记首读；ip 由 controller 从请求取） */
  async findVisibleDetail(
    id: string,
    user: AuthUser,
    ipAddress = '',
  ): Promise<NoticeView & { scopes: NoticeScopeView[] }> {
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
    if (!row) {
      throw new NotFoundException({
        code: 'NOTICE_NOT_FOUND',
        message: '公告不存在',
      });
    }

    // 管理可见 = super_admin 或拥有 SEARCH 位（位掩码 1n）
    const hasSearch =
      isSuperAdmin(user) ||
      (BigInt(user.permissions) & 1n) !== 0n;
    // 管理可见（SEARCH 位或超管）或范围内用户
    const scopeRows = await db
      .select()
      .from(noticeScopes)
      .where(eq(noticeScopes.noticeId, id));
    const scopeInputs = scopeRows.map((r) => ({
      scopeType: r.scopeType as 'dept' | 'post' | 'user',
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
      throw new ForbiddenException({
        code: 'NOTICE_NOT_VISIBLE',
        message: '您不在该公告的发布范围内',
      });
    }

    // 范围内用户进详情即记首读（唯一约束幂等，仅记首次）
    if (inScope && row.status === 'published') {
      await db
        .insert(noticeReadRecords)
        .values({
          noticeId: id,
          userId: user.id,
          ipAddress,
        })
        .onConflictDoNothing();
    }

    const scopes = await this.loadScopes(id);
    const stats = await this.computeStats(id);

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
      scopes,
      scopeCount: scopes.length,
      readCount: stats.readCount,
      totalCount: stats.totalCount,
      readRate: stats.readRate,
      myReadAt: myRead?.readAt?.toISOString() ?? null,
    };
  }

  /** 创建公告（立即发布或定时草稿） */
  async create(dto: NoticeCreateDto, user: AuthUser) {
    await this.assertScopeTargets(dto.scopeTargets);

    const publishTime = dto.publishTime ? new Date(dto.publishTime) : new Date();
    const isScheduled = publishTime.getTime() > Date.now();
    const status = isScheduled ? 'draft' : 'published';

    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(notices)
        .values({
          title: dto.title,
          content: dto.content,
          publisherId: user.id,
          isTop: dto.isTop ?? false,
          status,
          publishTime,
        })
        .returning();

      await tx.insert(noticeScopes).values(
        dto.scopeTargets.map((s) => ({
          noticeId: row.id,
          scopeType: s.scopeType,
          targetId: s.targetId,
        })),
      );
      return row;
    });

    await this.writeLog('notice.create', user.id, {
      id: created.id,
      title: created.title,
      status,
    });

    // 立即发布：给范围内全员写新公告通知；定时发布由 @Cron 扫描后写入
    if (status === 'published') {
      await this.notifyScopePublish(
        created.id,
        created.title,
        created.content ?? null,
      );
    }

    const scopes = await this.loadScopes(created.id);
    const stats = await this.computeStats(created.id);
    return {
      ...created,
      publisherName: user.displayName,
      publisherEmail: user.email,
      publisherAvatar: user.avatar,
      scopes,
      scopeCount: scopes.length,
      ...stats,
    };
  }

  /** 编辑公告（draft/published 可编辑） */
  async update(id: string, dto: NoticeUpdateDto, user: AuthUser) {
    const existing = await db.query.notices.findFirst({
      where: and(eq(notices.id, id), isNull(notices.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOTICE_NOT_FOUND',
        message: '公告不存在',
      });
    }
    this.assertNoticeOperator(existing, user);
    if (existing.status === 'withdrawn') {
      throw new ConflictException({
        code: 'NOTICE_NOT_PUBLISHED',
        message: '已撤回的公告不可编辑',
      });
    }

    if (dto.scopeTargets !== undefined) {
      await this.assertScopeTargets(dto.scopeTargets);
    }

    await db.transaction(async (tx) => {
      await tx
        .update(notices)
        .set({
          title: dto.title ?? existing.title,
          content: dto.content ?? existing.content,
          isTop: dto.isTop ?? existing.isTop,
          publishTime: dto.publishTime ? new Date(dto.publishTime) : existing.publishTime,
        })
        .where(eq(notices.id, id));

      if (dto.scopeTargets !== undefined) {
        // 全量替换范围
        await tx.delete(noticeScopes).where(eq(noticeScopes.noticeId, id));
        await tx.insert(noticeScopes).values(
          dto.scopeTargets.map((s) => ({
            noticeId: id,
            scopeType: s.scopeType,
            targetId: s.targetId,
          })),
        );
      }
    });

    await this.writeLog('notice.update', user.id, { id });
    return this.findVisibleDetail(id, user);
  }

  /** 删除公告（软删；同步清理范围/阅读/催办记录） */
  async remove(id: string, user: AuthUser) {
    const existing = await db.query.notices.findFirst({
      where: and(eq(notices.id, id), isNull(notices.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOTICE_NOT_FOUND',
        message: '公告不存在',
      });
    }
    this.assertNoticeOperator(existing, user);

    await db.transaction(async (tx) => {
      await tx
        .update(notices)
        .set({ deletedAt: new Date() })
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
    await this.writeLog('notice.delete', user.id, { id, title: existing.title });
    return null;
  }

  /** 撤回公告（published → withdrawn） */
  async withdraw(id: string, user: AuthUser) {
    const existing = await db.query.notices.findFirst({
      where: and(eq(notices.id, id), isNull(notices.deletedAt)),
    });
    if (!existing) {
      throw new NotFoundException({
        code: 'NOTICE_NOT_FOUND',
        message: '公告不存在',
      });
    }
    this.assertNoticeOperator(existing, user);
    if (existing.status !== 'published') {
      throw new ConflictException({
        code: 'NOTICE_NOT_PUBLISHED',
        message: '仅已发布的公告可撤回',
      });
    }

    await db
      .update(notices)
      .set({ status: 'withdrawn' })
      .where(eq(notices.id, id));
    await this.writeLog('notice.withdraw', user.id, { id, title: existing.title });
    return this.findVisibleDetail(id, user);
  }

  /** 已读/未读名单（分页） */
  async findReadStats(id: string, query: NoticeReadStatsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    const notice = await db.query.notices.findFirst({
      where: and(eq(notices.id, id), isNull(notices.deletedAt)),
    });
    if (!notice) {
      throw new NotFoundException({
        code: 'NOTICE_NOT_FOUND',
        message: '公告不存在',
      });
    }

    const scopeRows = await db
      .select()
      .from(noticeScopes)
      .where(eq(noticeScopes.noticeId, id));
    const scopeInputs = scopeRows.map((r) => ({
      scopeType: r.scopeType as 'dept' | 'post' | 'user',
      targetId: r.targetId,
    }));
    const scopeUserIds = await resolveScopeUserIds(scopeInputs);
    if (scopeUserIds.length === 0) {
      return {
        data: [],
        pagination: { page, pageSize, total: 0 },
      };
    }

    const extras = await this.loadReadStatEntries(id, scopeUserIds, query.status);
    const total = extras.length;
    const pageEntries = extras.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: pageEntries,
      pagination: { page, pageSize, total },
    };
  }

  /** 装载已读/未读名单（含组织路径与主岗摘要；未读仅在职，已读含离职） */
  private async loadReadStatEntries(
    noticeId: string,
    scopeUserIds: string[],
    status: 'read' | 'unread',
  ) {
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
      .innerJoin(posts, and(eq(userPosts.postId, posts.id), isNull(posts.deletedAt)))
      .where(and(inArray(userPosts.userId, scopeUserIds), eq(userPosts.isMain, true)));
    const mainPostMap = new Map(mainPostRows.map((r) => [r.userId, r.postName]));

    const deptPathMap = await buildDeptPathMap();

    const entries = [];
    for (const row of userRows) {
      const readAt = readMap.get(row.id) ?? null;
      const isRead = readAt !== null;
      if (status === 'read' && !isRead) continue;
      if (status === 'unread' && isRead) continue;
      // 未读名单不含离职（催办口径）；已读名单含离职（历史保留）
      if (
        status === 'unread' &&
        row.employmentStatus === 'resigned'
      ) {
        continue;
      }
      entries.push({
        userId: row.id,
        displayName: row.displayName,
        username: row.username,
        avatar: row.avatar,
        deptPath: row.deptId ? (deptPathMap.get(row.deptId) ?? null) : null,
        mainPostName: mainPostMap.get(row.id) ?? null,
        employmentStatus: toDirectoryEntryView({
          id: row.id,
          username: row.username,
          displayName: row.displayName,
          avatar: row.avatar,
          employeeNo: null,
          phone: null,
          email: null,
          entryDate: null,
          employmentStatus: row.employmentStatus,
        }).employmentStatus,
        readAt,
      });
    }
    // 排序：已读按时间降序；未读按姓名
    entries.sort((a, b) =>
      status === 'read'
        ? (b.readAt?.getTime() ?? 0) - (a.readAt?.getTime() ?? 0)
        : a.displayName.localeCompare(b.displayName, 'zh-CN'),
    );
    return entries;
  }

  /** 一键催办：给未读（在职）人员写站内信；24h 防频 */
  async remind(id: string, user: AuthUser) {
    const notice = await db.query.notices.findFirst({
      where: and(eq(notices.id, id), isNull(notices.deletedAt)),
    });
    if (!notice) {
      throw new NotFoundException({
        code: 'NOTICE_NOT_FOUND',
        message: '公告不存在',
      });
    }
    this.assertNoticeOperator(notice, user);

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
      throw new ConflictException({
        code: 'NOTICE_REMIND_TOO_FREQUENT',
        message: '24 小时内已催办过，请稍后再试',
      });
    }

    const stats = await this.loadReadStatEntries(id, await this.resolveScopeIds(id), 'unread');
    const unreadUserIds = stats.map((s) => s.userId);
    if (unreadUserIds.length === 0) {
      throw new ConflictException({
        code: 'NOTICE_NO_UNREAD',
        message: '没有需要催办的未读人员',
      });
    }

    await db.insert(notifications).values(
      unreadUserIds.map((recipientId) => ({
        recipientId,
        type: 'notice_remind',
        title: `您有一条未读公告：【${notice.title}】，请尽快查阅`,
        link: `/org/notices/${id}`,
      })),
    );
    await db
      .insert(noticeRemindLogs)
      .values({ noticeId: id, remindedBy: user.id });
    await this.writeLog('notice.remind', user.id, {
      id,
      remindedCount: unreadUserIds.length,
    });
    return { remindedCount: unreadUserIds.length };
  }

  /** 范围解析（notice id → scope 行 → userIds） */
  private async resolveScopeIds(noticeId: string): Promise<string[]> {
    const scopeRows = await db
      .select()
      .from(noticeScopes)
      .where(eq(noticeScopes.noticeId, noticeId));
    return resolveScopeUserIds(
      scopeRows.map((r) => ({
        scopeType: r.scopeType as 'dept' | 'post' | 'user',
        targetId: r.targetId,
      })),
    );
  }

  /** 定时发布扫描：draft 且 publish_time <= now → published + 通知（@Cron 调用） */
  async publishDueNotices(): Promise<number> {
    const due = await db
      .select()
      .from(notices)
      .where(
        and(
          isNull(notices.deletedAt),
          eq(notices.status, 'draft'),
          lte(notices.publishTime, new Date()),
        ),
      );
    let published = 0;
    for (const notice of due) {
      await db
        .update(notices)
        .set({ status: 'published' })
        .where(eq(notices.id, notice.id));
      await this.notifyScopePublish(
        notice.id,
        notice.title,
        notice.content ?? null,
      );
      await this.writeLog('notice.auto_publish', null, {
        id: notice.id,
        title: notice.title,
      });
      published += 1;
    }
    return published;
  }
}

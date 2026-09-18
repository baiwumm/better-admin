import "server-only";

import { and, count, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";

import { db } from "@/db/client";
import {
  depts,
  logs,
  notices,
  posts,
  roles,
  userRoles,
  users,
} from "@/db/schema";

/**
 * Dashboard 概览统计（契约 v1.11.0，只读聚合；与 Nest 端 stats.service 同源）。
 *
 * - 全部数据实时聚合，无缓存（演示站规模小，聚合成本低）；
 * - 序列 date 按 Asia/Shanghai（UTC+8）日界聚合，无数据日补 0；
 * - 敏感字段（手机号 / 邮箱 / IP / User-Agent / 头像）一律不出现在返回结构中；
 * - schema 时间列为 mode: "string"，比较边界一律传 ISO 字符串。
 */

/** 序列聚合时区（契约 v1.11.0 定稿口径） */
const STATS_TIMEZONE = "Asia/Shanghai";

const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 任意 UTC 时刻 → UTC+8 日界下的 YYYY-MM-DD */
function toShanghaiDate(ms: number): string {
  return new Date(ms + UTC8_OFFSET_MS).toISOString().slice(0, 10);
}

/** 生成近 n 天的日期序列（UTC+8 日界，含今天，升序） */
function lastNDates(n: number, nowMs: number): string[] {
  const today = toShanghaiDate(nowMs);
  const todayUtcMs = Date.parse(`${today}T00:00:00Z`);

  return Array.from({ length: n }, (_, i) =>
    new Date(todayUtcMs + (i - (n - 1)) * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
  );
}

/** 日期序列起点（首日 UTC+8 0 点对应的 UTC 时刻，ISO 字符串） */
function seriesSince(dates: string[]): string {
  return new Date(
    Date.parse(`${dates[0]}T00:00:00Z`) - UTC8_OFFSET_MS,
  ).toISOString();
}

/** 序列表按日计数（type 聚合共用） */
async function countDailyByType(
  type: string,
  since: string,
): Promise<Map<string, number>> {
  const dateExpr = sql<string>`to_char((${logs.createdAt} at time zone ${sql.raw(`'${STATS_TIMEZONE}'`)})::date, 'YYYY-MM-DD')`;
  const rows = await db
    .select({ date: dateExpr, n: count() })
    .from(logs)
    .where(and(eq(logs.type, type), gte(logs.createdAt, since)))
    .groupBy(dateExpr);

  return new Map(rows.map((r) => [r.date, Number(r.n)]));
}

/** 按 UTC+8 日界把某日的计数从 Map 取出（无数据补 0） */
function fillSeries(
  dates: string[],
  counts: Map<string, number>,
): { date: string; count: number }[] {
  return dates.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

/** GET /api/stats/overview — Dashboard 概览（一次返回全量区块数据） */
export async function getStatsOverview(days: 7 | 30) {
  const nowMs = Date.now();
  const kpiDates = lastNDates(7, nowMs);
  const trendDates = lastNDates(days, nowMs);
  const kpiSince = seriesSince(kpiDates);
  const trendSince = seriesSince(trendDates);
  const todayStart = new Date(
    Date.parse(`${toShanghaiDate(nowMs)}T00:00:00Z`) - UTC8_OFFSET_MS,
  ).toISOString();
  const yesterdayStart = new Date(
    Date.parse(todayStart) - 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    usersTotalRows,
    usersTodayRows,
    loginsTodayRows,
    loginsYesterdayRows,
    loginsDaily,
    logsTotalRows,
    logsTodayRows,
    logsDaily,
    deptsRows,
    postsRows,
    loginTrend,
    roleDistribution,
    latestNotices,
    recentLogs,
  ] = await Promise.all([
    db.select({ n: count() }).from(users).where(isNull(users.deletedAt)),
    db
      .select({ n: count() })
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, todayStart))),
    db
      .select({ n: count() })
      .from(logs)
      .where(and(eq(logs.type, "login"), gte(logs.createdAt, todayStart))),
    db
      .select({ n: count() })
      .from(logs)
      .where(
        and(
          eq(logs.type, "login"),
          gte(logs.createdAt, yesterdayStart),
          lte(logs.createdAt, todayStart),
        ),
      ),
    countDailyByType("login", kpiSince),
    db.select({ n: count() }).from(logs).where(eq(logs.type, "operation")),
    db
      .select({ n: count() })
      .from(logs)
      .where(and(eq(logs.type, "operation"), gte(logs.createdAt, todayStart))),
    countDailyByType("operation", kpiSince),
    db.select({ n: count() }).from(depts),
    db.select({ n: count() }).from(posts),
    countDailyByType("login", trendSince),
    db
      .select({
        roleCode: roles.code,
        roleName: roles.name,
        count: count(userRoles.userId),
      })
      .from(roles)
      .leftJoin(userRoles, eq(userRoles.roleId, roles.id))
      .groupBy(roles.code, roles.name, roles.sort)
      .orderBy(roles.sort),
    db
      .select({
        id: notices.id,
        title: notices.title,
        publishTime: notices.publishTime,
        publisherName: users.displayName,
        publisherAvatar: users.avatar,
      })
      .from(notices)
      .leftJoin(users, eq(notices.publisherId, users.id))
      .where(
        and(
          eq(notices.status, "published"),
          lte(notices.publishTime, new Date().toISOString()),
          isNull(notices.deletedAt),
        ),
      )
      .orderBy(desc(notices.publishTime))
      .limit(5),
    db
      .select({
        id: logs.id,
        action: logs.action,
        username: users.username,
        displayName: users.displayName,
        avatar: users.avatar,
        createdAt: logs.createdAt,
      })
      .from(logs)
      .leftJoin(users, eq(users.id, logs.userId))
      .where(eq(logs.type, "operation"))
      .orderBy(desc(logs.createdAt))
      .limit(10),
  ]);

  // usersDailyNew 按 users.created_at 聚合（与日志不同源，单独查询）
  const usersDateExpr = sql<string>`to_char((${users.createdAt} at time zone ${sql.raw(`'${STATS_TIMEZONE}'`)})::date, 'YYYY-MM-DD')`;
  const usersDailyRows = await db
    .select({ date: usersDateExpr, n: count() })
    .from(users)
    .where(
      and(isNull(users.deletedAt), gte(users.createdAt, seriesSince(kpiDates))),
    )
    .groupBy(usersDateExpr);
  const usersDailyMap = new Map(
    usersDailyRows.map((r) => [r.date, Number(r.n)]),
  );

  return {
    kpis: {
      usersTotal: Number(usersTotalRows[0]?.n ?? 0),
      usersTodayNew: Number(usersTodayRows[0]?.n ?? 0),
      usersDailyNew: fillSeries(kpiDates, usersDailyMap),
      loginsToday: Number(loginsTodayRows[0]?.n ?? 0),
      loginsYesterday: Number(loginsYesterdayRows[0]?.n ?? 0),
      loginsDailyNew: fillSeries(kpiDates, loginsDaily),
      logsTotal: Number(logsTotalRows[0]?.n ?? 0),
      logsToday: Number(logsTodayRows[0]?.n ?? 0),
      logsDailyNew: fillSeries(kpiDates, logsDaily),
      deptsCount: Number(deptsRows[0]?.n ?? 0),
      postsCount: Number(postsRows[0]?.n ?? 0),
    },
    loginTrend: fillSeries(trendDates, loginTrend),
    roleDistribution: roleDistribution.map((r) => ({
      roleCode: r.roleCode,
      roleName: r.roleName,
      count: Number(r.count),
    })),
    latestNotices,
    recentLogs,
  };
}

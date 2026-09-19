"use client";

import type { StatsOverview } from "@/lib/api-types";

import { fetchApi } from "@/lib/api-client";

/**
 * Dashboard 概览统计 API 层（契约 v1.12.0；与 React 端 stats-api 同源）。
 *
 * GET /api/stats/overview 一次返回 Dashboard 全量区块数据（只读聚合，
 * 任意已登录用户可访问）。v1.12.0 起本接口**无查询参数**：登录趋势固定
 * 返回近 30 日，7 / 30 日区间是图表的视图状态，由调用方本地截取。
 */

/** 概览统计查询 key（无取数参数，整页仅此一个 key） */
export const STATS_OVERVIEW_QUERY_KEY = ["stats", "overview"] as const;

/** GET /api/stats/overview — 概览统计 */
export function fetchStatsOverview() {
  return fetchApi<StatsOverview>("/stats/overview");
}

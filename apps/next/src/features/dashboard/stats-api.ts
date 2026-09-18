"use client";

import type { StatsOverview } from "@/lib/api-types";

import { fetchApi } from "@/lib/api-client";

/**
 * Dashboard 概览统计 API 层（契约 v1.11.0；与 React 端 stats-api 同源）。
 *
 * GET /api/stats/overview 一次返回 Dashboard 全量区块数据（只读聚合，
 * 任意已登录用户可访问；days 仅影响登录趋势序列，KPI 迷你序列固定近 7 日）。
 */

/** 概览统计查询 key 前缀（days 由调用处拼入 key） */
export const STATS_OVERVIEW_QUERY_KEY = ["stats", "overview"] as const;

/** GET /stats/overview?days=7|30 — 概览统计 */
export function fetchStatsOverview(days: 7 | 30) {
  return fetchApi<StatsOverview>(`/stats/overview?days=${days}`);
}

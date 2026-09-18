import type { NextRequest } from "next/server";

import { requireAuthUser } from "@/lib/server/route-auth";
import { getStatsOverview } from "@/lib/server/stats-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * GET /api/stats/overview（契约 v1.11.0）——Dashboard 概览统计：
 * 只读聚合，鉴权为任意已登录用户（不要求权限位，与 notice 消费接口口径一致）；
 * days 仅影响登录趋势序列（7|30，缺省 7，非法值 400 VALIDATION_ERROR），
 * KPI 迷你序列固定近 7 日；GET 不受演示只读守卫影响。
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUser(request);

    const daysParam = request.nextUrl.searchParams.get("days");
    const days = daysParam === null ? 7 : Number(daysParam);

    if (days !== 7 && days !== 30) {
      throw new ServerApiError(400, "VALIDATION_ERROR", "days 仅支持 7 或 30");
    }

    return jsonOk(await getStatsOverview(days));
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/stats/overview",
      method: "GET",
    });
  }
}

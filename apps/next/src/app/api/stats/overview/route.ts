import type { NextRequest } from "next/server";

import { requireAuthUser } from "@/lib/server/route-auth";
import { getStatsOverview } from "@/lib/server/stats-service";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * GET /api/stats/overview（契约 v1.12.0）——Dashboard 概览统计：
 * 只读聚合，鉴权为任意已登录用户（不要求权限位，与 notice 消费接口口径一致）；
 * 自 v1.12.0 起**无查询参数**——登录趋势固定近 30 日，7 / 30 日区间由前端
 * 本地截取（slice(-days)），不作为服务端取数维度（本接口是页面级聚合，
 * 只影响单个区块的维度不该成为它的入参，否则局部控件会驱动整页重取）；
 * GET 不受演示只读守卫影响。
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUser(request);

    return jsonOk(await getStatsOverview());
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/stats/overview",
      method: "GET",
    });
  }
}

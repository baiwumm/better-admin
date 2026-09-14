import type { NextRequest } from "next/server";

import { requireAuthUser } from "@/lib/server/route-auth";
import { listMyNotices } from "@/lib/server/notices-service";
import { jsonList, handleRouteError } from "@/lib/server/route-helpers";

/** GET /api/notices/mine — 我的公告（全员消费端，仅登录态无权限位）。 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthUser(request);

    const { searchParams } = request.nextUrl;
    const result = await listMyNotices(user.id, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
      keyword: searchParams.get("keyword") ?? undefined,
      readStatus: searchParams.get("readStatus") ?? undefined,
    });

    return jsonList(result.data, result.pagination);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/notices/mine",
      method: "GET",
    });
  }
}

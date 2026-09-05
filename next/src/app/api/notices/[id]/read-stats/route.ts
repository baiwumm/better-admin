import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { listNoticeReadStats } from "@/lib/server/notices-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonList, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/notices/:id/read-stats（SEARCH 位）— 已读/未读名单（分页）。 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { id } = await context.params;
    const { searchParams } = request.nextUrl;
    // 对齐 nest query dto：status 必填且仅接受 read/unread（非法 400，不静默兜底）
    const status = searchParams.get("status");

    if (status !== "read" && status !== "unread") {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "status 仅支持 read / unread",
      );
    }

    const result = await listNoticeReadStats(id, status, {
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
    });

    return jsonList(result.data, result.pagination);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/notices/:id/read-stats",
      method: "GET",
    });
  }
}

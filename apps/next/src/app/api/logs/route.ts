import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { batchRemoveLogs, listLogs } from "@/lib/server/logs-service";
import { jsonList, jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * /api/logs 集合路由（契约）：
 * - GET（SEARCH 位）：分页列表（type 精确筛选；search 匹配 action；createdAt 倒序）；
 * - DELETE（BATCH_DELETE 位）：批量删除（query ids 逗号分隔，全有全无）。
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { searchParams } = request.nextUrl;
    const result = await listLogs({
      page: Number(searchParams.get("page") ?? 1),
      pageSize: Number(searchParams.get("pageSize") ?? 10),
      search: searchParams.get("search") ?? undefined,
      type: searchParams.get("type") ?? undefined,
    });

    return jsonList(result.data, result.pagination);
  } catch (error) {
    return handleRouteError(error, { path: "/api/logs", method: "GET" });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const operator = await requireAuthUser(request, Permissions.BATCH_DELETE);

    const idsParam = request.nextUrl.searchParams.get("ids") ?? "";
    const ids = idsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await batchRemoveLogs(ids, operator.id);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, { path: "/api/logs", method: "DELETE" });
  }
}

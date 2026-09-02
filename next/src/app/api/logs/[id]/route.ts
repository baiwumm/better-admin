import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { findLog, removeLog } from "@/lib/server/logs-service";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/logs/:id（SEARCH 位）— 日志详情（联表操作人摘要）。 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAuthUser(request, Permissions.SEARCH);

    const { id } = await context.params;

    return jsonOk(await findLog(id));
  } catch (error) {
    return handleRouteError(error, { path: "/api/logs/:id", method: "GET" });
  }
}

/** DELETE /api/logs/:id（DELETE 位）— 删除单条日志。 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.DELETE);

    const { id } = await context.params;

    await removeLog(id, operator.id);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, { path: "/api/logs/:id", method: "DELETE" });
  }
}

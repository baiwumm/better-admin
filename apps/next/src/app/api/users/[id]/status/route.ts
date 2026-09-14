import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { updateUserStatus } from "@/lib/server/users-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/users/:id/status（契约，200 返回更新后的 User，EDIT 位）。
 * 停用走目标保护校验 + tokenVersion 递增全端下线；启用直接放行。
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.EDIT);

    const { id } = await context.params;

    let body: { status?: string };

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    if (body?.status !== "active" && body?.status !== "disabled") {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "status 必须为 active 或 disabled",
      );
    }

    const user = await updateUserStatus(id, body.status, operator);

    return jsonOk(user);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/users/:id/status",
      method: "PUT",
    });
  }
}

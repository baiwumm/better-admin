import type { NextRequest } from "next/server";

import { Permissions } from "@/lib/server/permissions";
import { requireAuthUser } from "@/lib/server/route-auth";
import { resetUserPassword } from "@/lib/server/users-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/users/:id/reset-password（契约，200，RESET_PASSWORD 位）。
 * 保护校验同删除（不能重置自己的密码）；成功后该用户全端下线。
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const operator = await requireAuthUser(request, Permissions.RESET_PASSWORD);

    const { id } = await context.params;

    let body: { newPassword?: string };

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    if (typeof body?.newPassword !== "string") {
      throw new ServerApiError(400, "VALIDATION_ERROR", "newPassword 为必填");
    }

    await resetUserPassword(id, body.newPassword, operator);

    return jsonOk(null);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/users/:id/reset-password",
      method: "POST",
    });
  }
}

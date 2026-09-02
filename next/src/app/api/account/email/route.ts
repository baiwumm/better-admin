import type { NextRequest } from "next/server";

import { requireAuthUser } from "@/lib/server/route-auth";
import { updateAccountEmail } from "@/lib/server/account-service";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/** PUT /api/account/email（契约，仅需登录）— 改邮箱（当前密码确认，冲突 409）。 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuthUser(request);

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    if (
      typeof body?.email !== "string" ||
      body.email.length === 0 ||
      typeof body?.currentPassword !== "string" ||
      body.currentPassword.length === 0
    ) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "email 与 currentPassword 为必填",
      );
    }

    const profile = await updateAccountEmail(user.id, {
      email: body.email,
      currentPassword: body.currentPassword,
    });

    return jsonOk(profile);
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/account/email",
      method: "PUT",
    });
  }
}

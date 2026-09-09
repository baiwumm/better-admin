import type { NextRequest } from "next/server";

import { requireAuthUser } from "@/lib/server/route-auth";
import { updateAccountPassword } from "@/lib/server/account-service";
import { clearAuthCookies } from "@/lib/server/auth/cookies";
import { ServerApiError } from "@/lib/server/http";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * PUT /api/account/password（契约，仅需登录）— 自助改密。
 * 成功即 tokenVersion+1 + 清托管 refreshToken（全端下线）；Next 适配：
 * 响应顺带清除本端双令牌 Cookie（客户端随即引导重新登录）。
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuthUser(request);

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      throw new ServerApiError(400, "VALIDATION_ERROR", "请求体不是合法 JSON");
    }

    // newPassword 6-72 位：72 为 bcrypt 输入上限，超出部分哈希时被截断忽略（契约 v1.7.3）
    if (
      typeof body?.currentPassword !== "string" ||
      body.currentPassword.length === 0 ||
      typeof body?.newPassword !== "string" ||
      body.newPassword.length < 6 ||
      body.newPassword.length > 72
    ) {
      throw new ServerApiError(
        400,
        "VALIDATION_ERROR",
        "currentPassword 与 newPassword（6-72 位）为必填",
      );
    }

    await updateAccountPassword(user.id, {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });

    const response = jsonOk(null);

    clearAuthCookies(response);

    return response;
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/account/password",
      method: "PUT",
    });
  }
}

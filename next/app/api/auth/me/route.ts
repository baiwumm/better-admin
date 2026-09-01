import type { NextRequest } from "next/server";

import { getAuthUser } from "@/lib/server/auth/request-auth";
import {
  jsonOk,
  jsonError,
  handleRouteError,
} from "@/lib/server/route-helpers";

/**
 * GET /api/auth/me（契约 v1.6.0 /auth/me，200）。
 * 双源鉴权（Bearer 优先、Cookie 回退）；未认证返回 401 UNAUTHORIZED。
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "未登录或 token 无效");
    }

    return jsonOk(user);
  } catch (error) {
    return handleRouteError(error, { path: "/api/auth/me", method: "GET" });
  }
}

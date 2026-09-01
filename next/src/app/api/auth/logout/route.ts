import type { NextRequest } from "next/server";

import { REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";
import { getAuthUser } from "@/lib/server/auth/request-auth";
import { logout } from "@/lib/server/auth/session";
import { clearAuthCookies } from "@/lib/server/auth/cookies";
import {
  jsonError,
  jsonNoContent,
  handleRouteError,
} from "@/lib/server/route-helpers";

/**
 * POST /api/auth/logout（契约 v1.6.0 /auth/logout，204，强制鉴权）。
 *
 * 撤销策略与 Nest 端一致：body.refreshToken 优先精确撤销本设备；
 * 缺省回退读 refresh Cookie（本设备）；再缺省撤销该用户全部托管会话。
 * 无论哪种都清除双令牌 Cookie，返回 204。
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return jsonError(401, "UNAUTHORIZED", "未登录或 token 无效");
    }

    let bodyRefreshToken: string | undefined;

    try {
      const body = (await request.json()) as { refreshToken?: string };

      bodyRefreshToken =
        typeof body?.refreshToken === "string" && body.refreshToken.length > 0
          ? body.refreshToken
          : undefined;
    } catch {
      // 无 body 合法（204 场景浏览器端不传 body）
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent");

    const refreshToken =
      bodyRefreshToken ??
      request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ??
      null;

    await logout(user, { ip, userAgent }, refreshToken);

    const response = jsonNoContent();

    clearAuthCookies(response);

    return response;
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/auth/logout",
      method: "POST",
    });
  }
}

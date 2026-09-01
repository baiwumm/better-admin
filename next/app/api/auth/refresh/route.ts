import type { NextRequest } from "next/server";

import { REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";
import { refresh } from "@/lib/server/auth/session";
import { setAuthCookies } from "@/lib/server/auth/cookies";
import { jsonOk, handleRouteError } from "@/lib/server/route-helpers";

/**
 * POST /api/auth/refresh（契约 v1.6.0 /auth/refresh，200）。
 *
 * 刷新令牌来源双源：契约 body.refreshToken 优先；缺省回退读
 * httpOnly Cookie（Next 客户端刷新走 Cookie，浏览器自动携带）。
 * 轮换成功后重写两个 Cookie（新 refresh 继承原会话剩余窗口）。
 */
export async function POST(request: NextRequest) {
  try {
    let bodyRefreshToken: string | undefined;

    try {
      const body = (await request.json()) as { refreshToken?: string };

      bodyRefreshToken =
        typeof body?.refreshToken === "string" ? body.refreshToken : undefined;
    } catch {
      // 无 body 合法：Cookie 兜底（浏览器端刷新不传 body）
    }

    const cookieRefreshToken =
      request.cookies.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
    const result = await refresh(bodyRefreshToken ?? cookieRefreshToken);

    const response = jsonOk(result);

    setAuthCookies(response, result);

    return response;
  } catch (error) {
    return handleRouteError(error, {
      path: "/api/auth/refresh",
      method: "POST",
    });
  }
}

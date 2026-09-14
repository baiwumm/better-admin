import "server-only";

import type { NextResponse } from "next/server";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";
import { decodeTokenExp } from "@/lib/server/auth/tokens";

/**
 * 双令牌 Cookie 写入/清除（httpOnly + Secure + SameSite=Lax）。
 *
 * 存储层与 React 版（localStorage + Bearer）不同，但内部 API 仍按契约
 * 解析 Authorization: Bearer（双源提取，见 request-auth.ts），仅存储层有差异。
 * maxAge 取自刚签发令牌的真实 exp（与有效期一致，Cookie 随令牌同步过期）。
 */

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function cookieMaxAge(token: string): number {
  const exp = decodeTokenExp(token);

  if (exp === null) return 0;

  return Math.max(0, exp - Math.floor(Date.now() / 1000));
}

interface AuthCookiePayload {
  accessToken: string;
  refreshToken: string;
}

/** 登录/刷新成功后把双令牌写入响应 Cookie。 */
export function setAuthCookies(
  response: NextResponse,
  { accessToken, refreshToken }: AuthCookiePayload,
): void {
  const common = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
  };

  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...common,
    maxAge: cookieMaxAge(accessToken),
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...common,
    maxAge: cookieMaxAge(refreshToken),
  });
}

/** 登出时清除双令牌 Cookie（maxAge 0 立即过期）。 */
export function clearAuthCookies(response: NextResponse): void {
  const common = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
  };

  response.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...common, maxAge: 0 });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...common, maxAge: 0 });
}

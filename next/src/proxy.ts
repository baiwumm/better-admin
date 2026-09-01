import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";
import { verifyToken } from "@/lib/server/auth/tokens";
import { loadUserWithPermissions } from "@/lib/server/auth/session";
import { refresh } from "@/lib/server/auth/session";
import { setAuthCookies } from "@/lib/server/auth/cookies";

/**
 * 全站守卫（对齐方案 §架构要点 3 / 修正七）：
 *
 * Node.js runtime（需查库，Edge 无法使用 postgres 驱动）。每个页面请求：
 * 1. access Cookie 存在 → jose 验签 → `ver` claim 与 users.token_version
 *    数据库实时比对（方案修正七：改密码触发 tokenVersion++ 后立即感知下线）；
 * 2. access 缺失/过期/ver 不一致 → 尝试用 refresh Cookie 静默轮换续期
 *    （等价 React 端 api-client 的 401 自动刷新，保证 1h 后浏览不被踢出；
 *    轮换成功则把新 Cookie 写回响应并放行）；
 * 3. 仍无有效会话 → 受保护页面 redirect /sign-in?redirect=<原路径>；
 *    已登录访问 /sign-in → redirect /（等价 React 版 (auth) beforeLoad 反向守卫）。
 *
 * /api/* 不走本 middleware（Route Handler 自行双源鉴权，401 由客户端
 * api-client 的刷新去重流程处理）；403/404/500 与静态资源无需会话。
 */

/** 登录页与错误页无需会话（等价 React 版 LOGIN_REQUIRED_PATHS + 错误页）。 */
const PUBLIC_PATHS = new Set(["/sign-in", "/403", "/404", "/500"]);

function buildSignInRedirect(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const target = `${pathname}${search}`;

  return NextResponse.redirect(
    new URL(
      target === "/"
        ? "/sign-in"
        : `/sign-in?redirect=${encodeURIComponent(target)}`,
      request.url,
    ),
  );
}

/** 校验 access 会话（验签 + token_version 实时比对），有效返回 true。 */
async function hasValidAccessSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) return false;

  try {
    const payload = await verifyToken(token, "access");

    if (payload.type !== "access") return false;

    // ver claim 与数据库实时值比对（旧 token 无 ver 视为 0，必然不一致）
    const user = await loadUserWithPermissions(payload.sub, payload.ver);

    return user !== null;
  } catch {
    return false;
  }
}

/** 用 refresh Cookie 尝试静默轮换（复用 /api/auth/refresh 的轮换逻辑）。 */
async function trySilentRefresh(
  request: NextRequest,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const token = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!token) return null;

  try {
    return await refresh(token);
  } catch {
    return null;
  }
}

/** Next 16 的 proxy 约定（原 middleware；每请求守卫入口）。 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  if (await hasValidAccessSession(request)) {
    // 已登录访问登录页 → 回首页（等价 React 版 (auth)/route.tsx beforeLoad）
    if (isPublicPath && pathname === "/sign-in") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  }

  // access 无效：尝试 refresh 静默轮换（成功则放行并回写新 Cookie）
  const rotated = await trySilentRefresh(request);

  if (rotated) {
    const response =
      pathname === "/sign-in"
        ? NextResponse.redirect(new URL("/", request.url))
        : NextResponse.next();

    setAuthCookies(response, rotated);

    return response;
  }

  // 未登录：登录页与错误页放行；受保护页面跳登录（携带回跳地址）
  if (isPublicPath) {
    return NextResponse.next();
  }

  return buildSignInRedirect(request);
}

export const config = {
  // Next 16 的 proxy 恒定运行于 Node.js runtime（官方约定，无需也不允许声明）
  matcher: [
    // 排除 API（Route Handler 自行鉴权）、静态资源与错误页
    "/((?!api|_next|favicon|logo|apple-touch|web-app-manifest|site\.webmanifest|fonts/|403|404|500).*)",
  ],
};

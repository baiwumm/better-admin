import type { AuthUser } from "@/lib/api-types";

import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";
import { verifyToken } from "@/lib/server/auth/tokens";
import { loadUserWithPermissions, refresh } from "@/lib/server/auth/session";
import { setAuthCookies } from "@/lib/server/auth/cookies";
import { filterAccessibleMenus } from "@/lib/permission";
import { collectMenuPaths } from "@/lib/menu-utils";
import { findMenuTree, getAllMenuPaths } from "@/lib/server/menus-service";
import { LOGIN_REQUIRED_PATHS } from "@/lib/route-access";

/**
 * 全站守卫（对齐方案 §架构要点 2/3 / 修正七）：
 *
 * Node.js runtime（需查库，Edge 无法使用 postgres 驱动）。每个页面请求：
 * 1. access Cookie 存在 → jose 验签 → `ver` claim 与 users.token_version
 *    数据库实时比对（方案修正七：改密码触发 tokenVersion++ 后立即感知下线）；
 * 2. access 缺失/过期/ver 不一致 → 尝试用 refresh Cookie 静默轮换续期
 *    （等价 React 端 api-client 的 401 自动刷新，保证 1h 后浏览不被踢出；
 *    轮换成功则把新 Cookie 写回响应并放行）；
 * 3. 菜单路径 403 门卫（方案 §架构要点 2，N2 落地）：路径不在当前用户
 *    可见菜单树（collectMenuPaths）且不在登录白名单 → redirect /403
 *    （等价 React 版 admin-layout 的布局级门卫，上移到服务端统一执行）；
 * 4. 仍无有效会话 → 受保护页面 redirect /sign-in?redirect=<原路径>；
 *    已登录访问 /sign-in → redirect /（等价 React 版 (auth) beforeLoad 反向守卫）。
 *
 * /api/* 不走本 proxy（Route Handler 自行双源鉴权，401 由客户端
 * api-client 的刷新去重流程处理）；403/404/500 与静态资源无需会话。
 */

/** 登录页与错误页无需会话（等价 React 版 LOGIN_REQUIRED_PATHS + 错误页）。 */
const PUBLIC_PATHS = new Set(["/sign-in", "/403", "/404", "/500"]);

/** 登录即可访问的白名单路径集合（Set 查找 O(1)，模块级只建一次）。 */
const LOGIN_REQUIRED_SET = new Set<string>(LOGIN_REQUIRED_PATHS);

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

/** 校验 access 会话（验签 + token_version 实时比对），有效返回用户视图。 */
async function getSessionUser(request: NextRequest): Promise<AuthUser | null> {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) return null;

  try {
    const payload = await verifyToken(token, "access");

    if (payload.type !== "access") return null;

    // ver claim 与数据库实时值比对（旧 token 无 ver 视为 0，必然不一致）
    return await loadUserWithPermissions(payload.sub, payload.ver);
  } catch {
    return null;
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

/**
 * 菜单路径 403 门卫（N7 语义修正）：区分两类「不在用户可见菜单树」的路径——
 * - 真实存在的路由（在全量菜单树中，任何用户可见的菜单路径之并集）但当前
 *   用户无权 → 403（等价 React 版 admin-layout 门卫）；
 * - 根本不存在的路由（不在全量菜单树也不在白名单）→ 放行，由 Next 路由
 *   渲染 not-found（404，对齐 React 版 TanStack Router 未匹配行为）。
 */
async function resolvePathGate(
  user: AuthUser,
  pathname: string,
): Promise<"allowed" | "forbidden" | "unknown"> {
  if (LOGIN_REQUIRED_SET.has(pathname)) return "allowed";

  const [tree, allPaths] = await Promise.all([
    findMenuTree(user),
    getAllMenuPaths(),
  ]);

  if (!allPaths.has(pathname)) return "unknown";

  const allowedPaths = collectMenuPaths(filterAccessibleMenus(tree));

  return allowedPaths.has(pathname) ? "allowed" : "forbidden";
}

/** Next 16 的 proxy 约定（原 middleware；每请求守卫入口）。 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.has(pathname);

  let user = await getSessionUser(request);
  let rotated: { accessToken: string; refreshToken: string } | null = null;

  // access 无效：尝试 refresh 静默轮换（成功则续期并重建会话）
  if (!user) {
    rotated = await trySilentRefresh(request);

    if (rotated) {
      try {
        const payload = await verifyToken(rotated.accessToken, "access");

        if (payload.type === "access") {
          user = await loadUserWithPermissions(payload.sub, payload.ver);
        }
      } catch {
        user = null;
      }
    }
  }

  if (user) {
    // 已登录访问登录页 → 回首页（等价 React 版 (auth)/route.tsx beforeLoad）
    if (pathname === "/sign-in") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // 菜单路径 403 门卫（unknown = 非真实路由，放行给 Next 404）
    if (!isPublicPath) {
      const gate = await resolvePathGate(user, pathname);

      if (gate === "forbidden") {
        return NextResponse.redirect(new URL("/403", request.url));
      }
    }

    const response = NextResponse.next();

    if (rotated) setAuthCookies(response, rotated);

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

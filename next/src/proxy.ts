import type { AuthUser } from "@/lib/api-types";

import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/auth-cookies";
import { verifyToken } from "@/lib/server/auth/tokens";
import { loadUserWithPermissions, refresh } from "@/lib/server/auth/session";
import { setAuthCookies } from "@/lib/server/auth/cookies";
import { collectMenuPaths } from "@/lib/menu-utils";
import { findMenuTree, getAllMenuPaths } from "@/lib/server/menus-service";
import { isLoginRequiredPath } from "@/lib/route-access";

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

/**
 * 静默刷新并发去重：access 过期瞬间，并行页面请求（多标签 / prefetch /
 * 导航与水合后 XHR 同时发起）携带同一 refresh Cookie 各自触发轮换——
 * refresh 是「删旧插新」语义，仅第一个成功，其余因托管行已删而失败，
 * 会把会话有效的用户误踢到登录页。模块级 in-flight Map 按 refresh token
 * 归并并发调用：后续请求共享第一次轮换的 Promise，拿到同一组新令牌
 * （各自 setAuthCookies 写回相同 Cookie，幂等）。本 proxy 恒定运行于
 * Node.js runtime（见文件头注释），模块状态在同一实例的并发请求间有效。
 */
const inFlightRefreshes = new Map<
  string,
  Promise<{ accessToken: string; refreshToken: string } | null>
>();

/** 用 refresh Cookie 尝试静默轮换（复用 /api/auth/refresh 的轮换逻辑，并发去重）。 */
function trySilentRefresh(
  request: NextRequest,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const token = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!token) return Promise.resolve(null);

  const inFlight = inFlightRefreshes.get(token);

  if (inFlight) return inFlight;

  const promise = refresh(token)
    .catch(() => null)
    .finally(() => {
      inFlightRefreshes.delete(token);
    });

  inFlightRefreshes.set(token, promise);

  return promise;
}

/**
 * 菜单路径 403 门卫（N7 语义修正 + 动态路由支持）：
 * - 登录可达路由（isLoginRequiredPath：精确白名单 + 通知消费前缀）→ 直接
 *   放行，不走菜单权限校验（详情可见性由 /api/notices/:id 服务端校验兜底）；
 * - 真实存在的路由（在全量菜单树中）但当前用户无权 → 403；
 * - 根本不存在的路由 → 放行（404）；
 * - 动态路由（通知消费前缀之外的场景）：检查父级路径是否在全量菜单树中，
 *   如果父级在菜单树中但当前用户无权 → 403。
 */
async function resolvePathGate(
  user: AuthUser,
  pathname: string,
): Promise<"allowed" | "forbidden" | "unknown"> {
  // 登录可达路由（精确白名单 + 动态前缀，语义见 route-access.ts）
  if (isLoginRequiredPath(pathname)) return "allowed";

  const [tree, allPaths] = await Promise.all([
    findMenuTree(user),
    getAllMenuPaths(),
  ]);

  // 精确匹配：findMenuTree 已按 role_menus 完成权限过滤与祖先链补全，
  // 无需 filterAccessibleMenus 二次过滤（分组节点 userPermissions="0" 会被误杀）
  if (allPaths.has(pathname)) {
    const allowedPaths = collectMenuPaths(tree);

    return allowedPaths.has(pathname) ? "allowed" : "forbidden";
  }

  // 动态路由支持：检查父级路径是否在全量菜单树中
  // 例如 /org/notices/123 → 检查 /org/notices 是否在菜单树中
  const segments = pathname.split("/").filter(Boolean);

  for (let i = segments.length - 1; i > 0; i--) {
    const parentPath = "/" + segments.slice(0, i).join("/");

    if (allPaths.has(parentPath)) {
      const allowedPaths = collectMenuPaths(tree);

      return allowedPaths.has(parentPath) ? "allowed" : "forbidden";
    }
  }

  return "unknown";
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

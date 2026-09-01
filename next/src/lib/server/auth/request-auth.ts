import "server-only";

import type { NextRequest } from "next/server";
import type { AuthUser } from "@/lib/api-types";

import { cookies } from "next/headers";

import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-cookies";
import { verifyToken } from "@/lib/server/auth/tokens";
import { loadUserWithPermissions } from "@/lib/server/auth/session";

/**
 * 服务端鉴权双源提取（对齐方案 §架构要点 3）：
 * 优先解析 `Authorization: Bearer`（契约兼容，React 端语义一致），
 * 无该头时回退读 httpOnly Cookie 中的 access token。
 *
 * 校验链与 Nest 端每请求鉴权一致：
 * jose 验签 → type 必须 access → ver claim 与 users.token_version 实时比对
 * （不一致/用户停用/软删 → null，调用方返回 401）。
 *
 * @returns 当前用户视图；未认证/令牌失效返回 null
 */
export async function getAuthUser(
  request: NextRequest | Request,
): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  // Cookie 兜底仅在 Route Handler（NextRequest）场景可用；纯 Request 无 cookies
  const cookies = (request as Partial<NextRequest>).cookies;
  const cookieToken =
    cookies && typeof cookies.get === "function"
      ? (cookies.get(ACCESS_TOKEN_COOKIE)?.value ?? null)
      : null;

  const token = bearerToken ?? cookieToken;

  if (!token) return null;

  try {
    const payload = await verifyToken(token, "access");

    if (payload.type !== "access") return null;

    return await loadUserWithPermissions(payload.sub, payload.ver);
  } catch {
    // 验签失败/过期/载荷异常一律视为未认证
    return null;
  }
}

/**
 * RSC 版会话有效性检查（无需 Request 参数）：
 * 从 next/headers 的语言无关 Cookie 存储读取 access token 并走同一条
 * 验签 + token_version 校验链。供 (auth) 布局的反向守卫（已登录访问
 * 登录页 → 回首页）使用。
 */
export async function isServerSessionValid(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!token) return false;

  try {
    const payload = await verifyToken(token, "access");

    if (payload.type !== "access") return false;

    const user = await loadUserWithPermissions(payload.sub, payload.ver);

    return user != null;
  } catch {
    return false;
  }
}

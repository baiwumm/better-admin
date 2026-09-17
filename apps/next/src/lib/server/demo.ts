import "server-only";

import type { NextRequest } from "next/server";

import { ServerApiError } from "@/lib/server/http";

/**
 * 演示模式（Phase 0）共享常量与只读守卫（契约 v1.10.0）。
 *
 * 与 Nest 端 src/db/demo.constants.ts + DemoReadonlyGuard 语义一一对齐：
 * demo-login 端点（auth/session）与 Route Handler 鉴权入口（route-auth）
 * 共用同一真源，避免角色 code / 白名单路径在服务端与守卫间漂移。
 */

/** 「系统管理员」演示角色 code：快捷登录 admin 池唯一来源 */
export const DEMO_ADMIN_ROLE_CODE = "sys_admin";

/** 快捷登录 random 池排除的角色：super_admin 永不进任何快捷池，admin 单独成池 */
export const DEMO_RANDOM_EXCLUDED_ROLE_CODES = [
  "super_admin",
  DEMO_ADMIN_ROLE_CODE,
];

/** 演示模式是否开启（缺省 false，本地开发无感） */
export function isDemoMode(): boolean {
  return (process.env.DEMO_MODE ?? "false") === "true";
}

/**
 * 只读拦截白名单（契约 v1.10.0）：auth 四端点免鉴权天然不经过
 * requireAuthUser（本清单登记仅为与 Nest 白名单口径一一对应）；
 * 通知已读两路径走 requireAuthUser 但改的是自身已读状态，予以放行。
 */
const DEMO_ALLOWED_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
  "/api/auth/demo-login",
  "/api/notifications/read-all",
]);

/** /api/notifications/{id}/read（动态 id 段） */
const NOTIFICATION_READ_PATTERN = /^\/api\/notifications\/[^/]+\/read$/;

function isDemoAllowedPath(pathname: string): boolean {
  return (
    DEMO_ALLOWED_PATHS.has(pathname) || NOTIFICATION_READ_PATTERN.test(pathname)
  );
}

/**
 * 演示只读拦截（requireAuthUser 的前置检查，等价 Nest 端全局守卫
 * 先于路由级 AuthGuard）：
 *
 * DEMO_MODE=true 时默认拦截所有非 GET 请求（POST / PUT / PATCH / DELETE），
 * 统一抛 403 { code: 'DEMO_READONLY' }；DEMO_MODE 关闭时整体放行，
 * 行为与现状完全一致。未登录的写请求同样被拦为 DEMO_READONLY 而非 401，
 * 服务端权威、规则只在此一处维护（auth 四端点不经 requireAuthUser，
 * 不受影响；其余写端点均经此检查，新增自动覆盖）。
 */
export function assertDemoReadonly(request: NextRequest): void {
  if (!isDemoMode()) return;

  const method = request.method.toUpperCase();

  // 只读与预检方法不在拦截语义内
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  if (isDemoAllowedPath(request.nextUrl.pathname)) return;

  throw new ServerApiError(403, "DEMO_READONLY", "演示环境，禁止修改数据");
}

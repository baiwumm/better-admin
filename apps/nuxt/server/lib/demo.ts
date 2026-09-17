import type { H3Event } from 'h3'

/**
 * 演示模式（Phase 0）共享常量与只读守卫（契约 v1.10.0）。
 *
 * 与 Nest 端 src/db/demo.constants.ts + DemoReadonlyGuard 语义一一对齐：
 * demo-login 端点（auth/session）与 server middleware 只读拦截共用同一真源，
 * 避免角色 code / 白名单路径在服务端与守卫间漂移。
 */

/** 「系统管理员」演示角色 code：快捷登录 admin 池唯一来源 */
export const DEMO_ADMIN_ROLE_CODE = 'sys_admin'

/** 快捷登录 random 池排除的角色：super_admin 永不进任何快捷池，admin 单独成池 */
export const DEMO_RANDOM_EXCLUDED_ROLE_CODES = [
  'super_admin',
  DEMO_ADMIN_ROLE_CODE
]

/** 演示模式是否开启（缺省 false，本地开发无感） */
export function isDemoMode(): boolean {
  return (process.env.DEMO_MODE ?? 'false') === 'true'
}

/**
 * 只读拦截白名单（契约 v1.10.0，精确路径 / 通知消费动态前缀）：
 * 仅放行改自身会话或已读状态的端点，其余写请求一律 403 DEMO_READONLY。
 */
const DEMO_ALLOWED_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/demo-login',
  '/api/notifications/read-all'
])

/** /api/notifications/{id}/read（动态 id 段） */
const NOTIFICATION_READ_PATTERN = /^\/api\/notifications\/[^/]+\/read$/

function isDemoAllowedPath(pathname: string): boolean {
  return DEMO_ALLOWED_PATHS.has(pathname)
    || NOTIFICATION_READ_PATTERN.test(pathname)
}

/**
 * 演示只读拦截（server middleware 对 /api/* 的统一出口）：
 * - 放行分支一律返回 undefined（h3 中间件返回任何非 undefined 值——含
 *   null——都会被序列化为响应并结束请求链，放行必须显式 return）；
 * - DEMO_MODE 关闭 / 只读方法（GET、HEAD、OPTIONS）/ 非业务路径（页面 SSR）
 *   / 白名单端点 → undefined（放行，行为与现状完全一致）；
 * - 其余写请求 → 403 { code: 'DEMO_READONLY' } 契约错误响应
 *   （setResponseStatus + 返回对象，形状与 route-helpers 的 jsonError 完全一致）。
 *
 * 先于 Route Handler 鉴权执行（等价 Nest 端全局守卫先于 AuthGuard）：
 * 未登录的写请求同样被拦为 DEMO_READONLY 而非 401，服务端权威、
 * 规则只在此一处维护，新增写端点自动被拦。
 */
export function demoReadonlyResponse(
  event: H3Event
): { code: string, message: string } | undefined {
  if (!isDemoMode()) return

  const method = event.method.toUpperCase()

  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return
  }

  const pathname = (event.path || '/').split('?')[0]

  if (!pathname.startsWith('/api/') || isDemoAllowedPath(pathname)) return

  setResponseStatus(event, 403)

  return { code: 'DEMO_READONLY', message: '演示环境，禁止修改数据' }
}

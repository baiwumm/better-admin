import type { H3Event } from 'h3'
import type { AuthUser } from '../../app/lib/api-types'

import { hasPermission } from './permissions'
import { getAuthUser } from './auth/request-auth'
import { ServerApiError } from './http'

/**
 * Server Route 鉴权入口（h3 版，语义逐字对齐 next/src/lib/server/route-auth.ts，
 * 等价 Nest 端 AuthGuard + PermissionsGuard 组合）：
 * - 双源提取会话（Bearer 优先、Cookie 回退，见 getAuthUser）；
 * - 未认证 → 401 UNAUTHORIZED；
 * - 传入 permission 时校验权限位：super_admin 全量位放行，
 *   普通用户按位掩码判定，失败 → 403 FORBIDDEN。
 */
export async function requireAuthUser(
  event: H3Event,
  permission?: { bits: bigint }
): Promise<AuthUser> {
  const user = await getAuthUser(event)

  if (!user) {
    throw new ServerApiError(401, 'UNAUTHORIZED', '未登录或 token 无效')
  }

  if (permission && !hasPermission(BigInt(user.permissions), permission.bits)) {
    throw new ServerApiError(403, 'FORBIDDEN', '无权限')
  }

  return user
}

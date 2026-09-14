import type { H3Event } from 'h3'
import type { AuthUser } from '../../../app/lib/api-types'

import { ACCESS_TOKEN_COOKIE } from '../auth-cookies'
import { verifyToken } from './tokens'
import { loadUserWithPermissions } from './session'

/**
 * 服务端鉴权双源提取（h3 版，语义逐字对齐 next/src/lib/server/auth/
 * request-auth.ts 的 getAuthUser，对齐方案 §架构要点 3）：
 * 优先解析 `Authorization: Bearer`（契约兼容，React / Vue 端语义一致），
 * 无该头时回退读 httpOnly Cookie 中的 access token。
 *
 * 校验链与 Nest 端每请求鉴权一致：
 * jose 验签 → type 必须 access → ver claim 与 users.token_version 实时比对
 * （不一致/用户停用/软删 → null，调用方返回 401）。
 *
 * @returns 当前用户视图；未认证/令牌失效返回 null
 */
export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  const authHeader = getHeader(event, 'authorization')
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  const cookieToken = getCookie(event, ACCESS_TOKEN_COOKIE)

  const token = bearerToken ?? cookieToken

  if (!token) return null

  try {
    const payload = await verifyToken(token, 'access')

    if (payload.type !== 'access') return null

    return await loadUserWithPermissions(payload.sub, payload.ver)
  } catch {
    // 验签失败/过期/载荷异常一律视为未认证
    return null
  }
}

import { REFRESH_TOKEN_COOKIE } from '../../lib/auth-cookies'
import { getAuthUser } from '../../lib/auth/request-auth'
import { logout } from '../../lib/auth/session'
import { clearAuthCookies } from '../../lib/auth/cookies'
import {
  jsonError,
  jsonNoContent,
  handleRouteError
} from '../../lib/route-helpers'

/**
 * POST /api/auth/logout（契约 v1.6.0 /auth/logout，204，强制鉴权）。
 * 对齐 next/src/app/api/auth/logout/route.ts。
 *
 * 撤销策略与 Nest 端一致：body.refreshToken 优先精确撤销本设备；
 * 缺省回退读 refresh Cookie（本设备）；再缺省撤销该用户全部托管会话。
 * 无论哪种都清除双令牌 Cookie，返回 204。
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await getAuthUser(event)

    if (!user) {
      return jsonError(event, 401, 'UNAUTHORIZED', '未登录或 token 无效')
    }

    let bodyRefreshToken: string | undefined

    try {
      const body = (await readBody(event)) as { refreshToken?: string }

      bodyRefreshToken
        = typeof body?.refreshToken === 'string' && body.refreshToken.length > 0
          ? body.refreshToken
          : undefined
    } catch {
      // 无 body 合法（204 场景浏览器端不传 body）
    }

    const ip
      = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
        || getRequestHeader(event, 'x-real-ip')
        || null
    const userAgent = getRequestHeader(event, 'user-agent')

    const refreshToken
      = bodyRefreshToken ?? getCookie(event, REFRESH_TOKEN_COOKIE) ?? null

    await logout(user, { ip, userAgent }, refreshToken)

    clearAuthCookies(event)

    return jsonNoContent(event)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/auth/logout',
      method: 'POST'
    })
  }
})

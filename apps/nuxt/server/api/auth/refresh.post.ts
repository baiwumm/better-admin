import { REFRESH_TOKEN_COOKIE } from '../../lib/auth-cookies'
import { refresh } from '../../lib/auth/session'
import { setAuthCookies } from '../../lib/auth/cookies'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/**
 * POST /api/auth/refresh（契约 v1.6.0 /auth/refresh，200）。
 * 对齐 next/src/app/api/auth/refresh/route.ts。
 *
 * 刷新令牌来源双源：契约 body.refreshToken 优先；缺省回退读
 * httpOnly Cookie（Next 客户端刷新走 Cookie，浏览器自动携带）。
 * 轮换成功后重写两个 Cookie（新 refresh 继承原会话剩余窗口）。
 */
export default defineEventHandler(async (event) => {
  try {
    let bodyRefreshToken: string | undefined

    try {
      const body = (await readBody(event)) as { refreshToken?: string }

      bodyRefreshToken
        = typeof body?.refreshToken === 'string' ? body.refreshToken : undefined
    } catch {
      // 无 body 合法：Cookie 兜底（浏览器端刷新不传 body）
    }

    const cookieRefreshToken = getCookie(event, REFRESH_TOKEN_COOKIE) ?? null
    const result = await refresh(bodyRefreshToken ?? cookieRefreshToken)

    setAuthCookies(event, result)

    return jsonOk(result)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/auth/refresh',
      method: 'POST'
    })
  }
})

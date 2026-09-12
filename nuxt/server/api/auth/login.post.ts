import { login } from '../../lib/auth/session'
import { setAuthCookies } from '../../lib/auth/cookies'
import { ServerApiError } from '../../lib/http'
import { jsonOk, handleRouteError } from '../../lib/route-helpers'

/**
 * POST /api/auth/login（契约 v1.6.0 /auth/login，200）。
 * 对齐 next/src/app/api/auth/login/route.ts。
 *
 * 业务与 Nest 端一致：bcrypt 校验 → 停用拒绝 → rememberMe 分档签发双令牌 →
 * refresh 托管 + 登录日志。差异仅在传输层：双令牌同时写入 httpOnly Cookie
 * （响应体仍按契约返回 accessToken/refreshToken/user，客户端可忽略令牌字段）。
 */
export default defineEventHandler(async (event) => {
  try {
    let body: {
      username?: string
      password?: string
      rememberMe?: boolean
    }

    try {
      body = await readBody(event)
    } catch {
      throw new ServerApiError(400, 'VALIDATION_ERROR', '请求体不是合法 JSON')
    }

    // 契约：LoginRequest required [username, password]；rememberMe 缺省 false
    if (
      typeof body?.username !== 'string'
      || body.username.trim().length === 0
      || typeof body?.password !== 'string'
      || body.password.length === 0
    ) {
      throw new ServerApiError(
        400,
        'VALIDATION_ERROR',
        'username 与 password 为必填'
      )
    }

    const ip
      = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
        || getRequestHeader(event, 'x-real-ip')
        || null
    const userAgent = getRequestHeader(event, 'user-agent')

    const result = await login(
      {
        username: body.username.trim(),
        password: body.password,
        rememberMe: body.rememberMe === true
      },
      { ip, userAgent }
    )

    setAuthCookies(event, result)

    return jsonOk(result)
  } catch (error) {
    return handleRouteError(event, error, {
      path: '/api/auth/login',
      method: 'POST'
    })
  }
})
